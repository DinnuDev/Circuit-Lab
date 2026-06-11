import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  Circuit, CircuitComponent, Wire, NetNode,
  Point2D, SimulationResult, ComponentType,
  SelectionState, DragState,
} from '@/types';
import { COMPONENT_DEFINITIONS } from '@/data/componentLibrary';
import { pinWorldPos, markDirty, markClean } from '@/utils/format';

interface CircuitStore {
  // Current circuit
  circuit: Circuit;
  history: Circuit[];
  historyIndex: number;
  simulationResult: SimulationResult | null;

  // Selection
  selection: SelectionState;
  dragState: DragState;

  // Actions — Circuit
  loadCircuit: (circuit: Circuit) => void;
  newCircuit: () => void;
  setCircuitName: (name: string) => void;

  // Actions — Component
  addComponent: (type: ComponentType, position: Point2D) => string;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, position: Point2D) => void;
  moveSelectedComponents: (dx: number, dy: number) => void;
  rotateComponent: (id: string, angle?: number) => void;
  flipComponent: (id: string) => void;
  duplicateSelected: () => void;
  updateComponentProperty: (id: string, key: string, value: unknown) => void;
  updateComponentProperties: (id: string, props: Record<string, unknown>) => void;

  // Actions — Wire
  addWire: (wire: Omit<Wire, 'id' | 'selected'>) => string;
  removeWire: (id: string) => void;
  updateWireSegments: (id: string, segments: Wire['segments']) => void;
  connectWire: (wireId: string, componentId: string, pinId: string, end: 'from' | 'to') => void;

  // Actions — Selection
  selectComponent: (id: string, addToSelection?: boolean) => void;
  selectWire: (id: string, addToSelection?: boolean) => void;
  selectInBox: (x1: number, y1: number, x2: number, y2: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectionBox: (box: SelectionState['selectionBox']) => void;
  deleteSelected: () => void;

  // Actions — Viewport
  setViewport: (x: number, y: number, zoom: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToContent: () => void;

  // Actions — Drag
  setDragState: (drag: Partial<DragState>) => void;
  clearDragState: () => void;

  // Actions — History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Simulation
  setSimulationResult: (result: SimulationResult | null) => void;

  // Nodes
  rebuildNodes: () => void;
}

const createEmptyCircuit = (): Circuit => ({
  id: uuidv4(),
  name: 'Untitled Circuit',
  description: '',
  components: {},
  wires: {},
  nodes: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  viewport3d: { position: { x: 0, y: 5, z: 10 }, target: { x: 0, y: 0, z: 0 } },
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    version: '1.0.0',
    author: 'User',
  },
});

const createEmptyDrag = (): DragState => ({
  isDragging: false,
  dragType: null,
  startPos: { x: 0, y: 0 },
  currentPos: { x: 0, y: 0 },
});

export const useCircuitStore = create<CircuitStore>()(
  immer((set, get) => ({
    circuit: createEmptyCircuit(),
    history: [],
    historyIndex: -1,
    simulationResult: null,
    selection: { componentIds: [], wireIds: [] },
    dragState: createEmptyDrag(),

    loadCircuit: (circuit) => set(state => { state.circuit = circuit; markClean(); }),
    newCircuit: () => set(state => {
      state.circuit = createEmptyCircuit();
      state.history = [];
      state.historyIndex = -1;
      state.simulationResult = null;
      state.selection = { componentIds: [], wireIds: [] };
      markClean();
    }),
    setCircuitName: (name) => set(state => { state.circuit.name = name; }),

    addComponent: (type, position) => {
      const def = COMPONENT_DEFINITIONS[type];
      if (!def) return '';
      const id = uuidv4();
      set(state => {
        state.circuit.components[id] = {
          id,
          type,
          category: def.category,
          label: `${def.label}${Object.keys(state.circuit.components).length + 1}`,
          position,
          rotation: 0,
          flipped: false,
          pins: def.pins.map(p => ({ ...p, id: uuidv4(), connectedWireIds: [] })),
          properties: { ...def.defaultProperties },
          selected: false,
          locked: false,
          visible: true,
        };
        state.circuit.metadata.modified = new Date().toISOString();
      });
      get().pushHistory();
      return id;
    },

    removeComponent: (id) => set(state => {
      const comp = state.circuit.components[id];
      if (!comp) return;
      // Remove connected wires and disconnect from other components
      comp.pins.forEach(pin => {
        pin.connectedWireIds.forEach(wid => {
          const wire = state.circuit.wires[wid];
          if (!wire) return;
          // Clean up the other end
          const otherId = wire.fromComponentId === id ? wire.toComponentId : wire.fromComponentId;
          const otherPinId = wire.fromComponentId === id ? wire.toPinId : wire.fromPinId;
          if (otherId && otherPinId) {
            const otherComp = state.circuit.components[otherId];
            const otherPin = otherComp?.pins.find(p => p.id === otherPinId);
            if (otherPin) otherPin.connectedWireIds = otherPin.connectedWireIds.filter(w => w !== wid);
          }
          delete state.circuit.wires[wid];
        });
      });
      delete state.circuit.components[id];
      state.selection.componentIds = state.selection.componentIds.filter(i => i !== id);
    }),

    moveComponent: (id, position) => set(state => {
      const comp = state.circuit.components[id];
      if (!comp) return;

      const processedWires = new Set<string>();

      comp.pins.forEach(pin => {
        const newPinW = pinWorldPos(position.x, position.y, comp.rotation, pin.position.x, pin.position.y);

        pin.connectedWireIds.forEach(wireId => {
          if (processedWires.has(wireId)) return;
          processedWires.add(wireId);

          const wire = state.circuit.wires[wireId];
          if (!wire || wire.segments.length === 0) return;

          const isFrom = wire.fromComponentId === id && wire.fromPinId === pin.id;
          const isTo   = wire.toComponentId   === id && wire.toPinId   === pin.id;

          if (isFrom && isTo) {
            // Self-loop: both ends on this component
            const toPin   = comp.pins.find(p => p.id === wire.toPinId);
            const fromPin = comp.pins.find(p => p.id === wire.fromPinId);
            if (fromPin && toPin) {
              wire.segments = [{
                start: pinWorldPos(position.x, position.y, comp.rotation, fromPin.position.x, fromPin.position.y),
                end:   pinWorldPos(position.x, position.y, comp.rotation, toPin.position.x,   toPin.position.y),
              }];
            }
            // Fall through so comp.position is still updated
            return;
          }

          if (isFrom) {
            if (wire.toComponentId && wire.toPinId) {
              const otherComp = state.circuit.components[wire.toComponentId];
              const otherPin  = otherComp?.pins.find(p => p.id === wire.toPinId);
              if (otherPin) {
                const otherW = pinWorldPos(otherComp.position.x, otherComp.position.y, otherComp.rotation, otherPin.position.x, otherPin.position.y);
                wire.segments = [{ start: newPinW, end: otherW }];
                return;
              }
            }
            wire.segments[0] = { ...wire.segments[0], start: newPinW };
          }

          if (isTo) {
            if (wire.fromComponentId && wire.fromPinId) {
              const otherComp = state.circuit.components[wire.fromComponentId];
              const otherPin  = otherComp?.pins.find(p => p.id === wire.fromPinId);
              if (otherPin) {
                const otherW = pinWorldPos(otherComp.position.x, otherComp.position.y, otherComp.rotation, otherPin.position.x, otherPin.position.y);
                wire.segments = [{ start: otherW, end: newPinW }];
                return;
              }
            }
            const last = wire.segments.length - 1;
            wire.segments[last] = { ...wire.segments[last], end: newPinW };
          }
        });
      });

      comp.position = position;
      markDirty();
    }),

    moveSelectedComponents: (dx, dy) => set(state => {
      const newPositions = new Map<string, { x: number; y: number }>();
      Object.values(state.circuit.components).forEach(comp => {
        if (!comp.selected) return;
        newPositions.set(comp.id, { x: comp.position.x + dx, y: comp.position.y + dy });
      });

      const processedWires = new Set<string>();
      newPositions.forEach((newPos, compId) => {
        const comp = state.circuit.components[compId];
        if (!comp) return;
        comp.pins.forEach(pin => {
          pin.connectedWireIds.forEach(wireId => {
            if (processedWires.has(wireId)) return;
            processedWires.add(wireId);
            const wire = state.circuit.wires[wireId];
            if (!wire || wire.segments.length === 0) return;

            let fromPinW: { x: number; y: number } | null = null;
            let toPinW:   { x: number; y: number } | null = null;

            if (wire.fromComponentId && wire.fromPinId) {
              const fc  = state.circuit.components[wire.fromComponentId];
              const fPos = newPositions.get(wire.fromComponentId) ?? fc?.position;
              const fp  = fc?.pins.find(p => p.id === wire.fromPinId);
              if (fc && fPos && fp) fromPinW = pinWorldPos(fPos.x, fPos.y, fc.rotation, fp.position.x, fp.position.y);
            }
            if (wire.toComponentId && wire.toPinId) {
              const tc  = state.circuit.components[wire.toComponentId];
              const tPos = newPositions.get(wire.toComponentId) ?? tc?.position;
              const tp  = tc?.pins.find(p => p.id === wire.toPinId);
              if (tc && tPos && tp) toPinW = pinWorldPos(tPos.x, tPos.y, tc.rotation, tp.position.x, tp.position.y);
            }

            if (fromPinW && toPinW) { wire.segments = [{ start: fromPinW, end: toPinW }]; }
            else if (fromPinW) { wire.segments[0] = { ...wire.segments[0], start: fromPinW }; }
            else if (toPinW)   { const last = wire.segments.length - 1; wire.segments[last] = { ...wire.segments[last], end: toPinW }; }
          });
        });
      });

      newPositions.forEach((pos, id) => { state.circuit.components[id].position = pos; });
      markDirty();
    }),

    rotateComponent: (id, angle = 90) => {
      set(state => {
        const comp = state.circuit.components[id];
        if (comp) comp.rotation = (comp.rotation + angle) % 360;
        markDirty();
      });
      get().pushHistory();
    },

    flipComponent: (id) => {
      set(state => {
        const comp = state.circuit.components[id];
        if (comp) comp.flipped = !comp.flipped;
        markDirty();
      });
      get().pushHistory();
    },

    updateComponentProperty: (id, key, value) => set(state => {
      const comp = state.circuit.components[id];
      if (comp) (comp.properties as Record<string, unknown>)[key] = value;
    }),

    updateComponentProperties: (id, props) => set(state => {
      const comp = state.circuit.components[id];
      if (comp) Object.assign(comp.properties, props);
    }),

    addWire: (wireData) => {
      const id = uuidv4();
      set(state => {
        state.circuit.wires[id] = { ...wireData, id, selected: false };
      });
      return id;
    },

    removeWire: (id) => set(state => {
      const wire = state.circuit.wires[id];
      if (!wire) return;
      // Disconnect from pins
      if (wire.fromComponentId && wire.fromPinId) {
        const comp = state.circuit.components[wire.fromComponentId];
        const pin = comp?.pins.find(p => p.id === wire.fromPinId);
        if (pin) pin.connectedWireIds = pin.connectedWireIds.filter(w => w !== id);
      }
      if (wire.toComponentId && wire.toPinId) {
        const comp = state.circuit.components[wire.toComponentId];
        const pin = comp?.pins.find(p => p.id === wire.toPinId);
        if (pin) pin.connectedWireIds = pin.connectedWireIds.filter(w => w !== id);
      }
      delete state.circuit.wires[id];
    }),

    updateWireSegments: (id, segments) => set(state => {
      const wire = state.circuit.wires[id];
      if (wire) wire.segments = segments;
    }),

    connectWire: (wireId, componentId, pinId, end) => set(state => {
      const wire = state.circuit.wires[wireId];
      const comp = state.circuit.components[componentId];
      if (!wire || !comp) return;
      const pin = comp.pins.find(p => p.id === pinId);
      if (!pin) return;
      if (end === 'from') {
        wire.fromComponentId = componentId;
        wire.fromPinId = pinId;
      } else {
        wire.toComponentId = componentId;
        wire.toPinId = pinId;
      }
      if (!pin.connectedWireIds.includes(wireId)) {
        pin.connectedWireIds.push(wireId);
      }
    }),

    selectComponent: (id, addToSelection = false) => set(state => {
      if (!addToSelection) {
        Object.values(state.circuit.components).forEach(c => c.selected = false);
        Object.values(state.circuit.wires).forEach(w => w.selected = false);
        state.selection = { componentIds: [id], wireIds: [] };
      } else {
        if (!state.selection.componentIds.includes(id)) {
          state.selection.componentIds.push(id);
        }
      }
      if (state.circuit.components[id]) state.circuit.components[id].selected = true;
    }),

    selectWire: (id, addToSelection = false) => set(state => {
      if (!addToSelection) {
        Object.values(state.circuit.components).forEach(c => c.selected = false);
        Object.values(state.circuit.wires).forEach(w => w.selected = false);
        state.selection = { componentIds: [], wireIds: [id] };
      } else {
        if (!state.selection.wireIds.includes(id)) {
          state.selection.wireIds.push(id);
        }
      }
      if (state.circuit.wires[id]) state.circuit.wires[id].selected = true;
    }),

    selectAll: () => set(state => {
      state.selection.componentIds = Object.keys(state.circuit.components);
      state.selection.wireIds = Object.keys(state.circuit.wires);
      Object.values(state.circuit.components).forEach(c => c.selected = true);
      Object.values(state.circuit.wires).forEach(w => w.selected = true);
    }),

    clearSelection: () => set(state => {
      Object.values(state.circuit.components).forEach(c => c.selected = false);
      Object.values(state.circuit.wires).forEach(w => w.selected = false);
      state.selection = { componentIds: [], wireIds: [] };
    }),

    setSelectionBox: (box) => set(state => { state.selection.selectionBox = box; }),

    deleteSelected: () => {
      const { selection } = get();
      set(state => {
        selection.componentIds.forEach(id => {
          const comp = state.circuit.components[id];
          if (!comp) return;
          // Remove all connected wires first
          const allWireIds = new Set<string>();
          comp.pins.forEach(pin => pin.connectedWireIds.forEach(wid => allWireIds.add(wid)));
          allWireIds.forEach(wid => {
            const wire = state.circuit.wires[wid];
            if (!wire) return;
            // Disconnect from the other end
            if (wire.fromComponentId !== id && wire.fromComponentId && wire.fromPinId) {
              const oc = state.circuit.components[wire.fromComponentId];
              const op = oc?.pins.find(p => p.id === wire.fromPinId);
              if (op) op.connectedWireIds = op.connectedWireIds.filter(w => w !== wid);
            }
            if (wire.toComponentId !== id && wire.toComponentId && wire.toPinId) {
              const oc = state.circuit.components[wire.toComponentId];
              const op = oc?.pins.find(p => p.id === wire.toPinId);
              if (op) op.connectedWireIds = op.connectedWireIds.filter(w => w !== wid);
            }
            delete state.circuit.wires[wid];
          });
          delete state.circuit.components[id];
        });
        selection.wireIds.forEach(id => {
          const wire = state.circuit.wires[id];
          if (!wire) return;
          if (wire.fromComponentId && wire.fromPinId) {
            const oc = state.circuit.components[wire.fromComponentId];
            const op = oc?.pins.find(p => p.id === wire.fromPinId);
            if (op) op.connectedWireIds = op.connectedWireIds.filter(w => w !== id);
          }
          if (wire.toComponentId && wire.toPinId) {
            const oc = state.circuit.components[wire.toComponentId];
            const op = oc?.pins.find(p => p.id === wire.toPinId);
            if (op) op.connectedWireIds = op.connectedWireIds.filter(w => w !== id);
          }
          delete state.circuit.wires[id];
        });
        state.selection = { componentIds: [], wireIds: [] };
      });
    },

    duplicateSelected: () => {
      const { selection, circuit } = get();
      const OFFSET = 40;
      set(state => {
        const idMap: Record<string, string> = {};
        selection.componentIds.forEach(oldId => {
          const comp = circuit.components[oldId];
          if (!comp) return;
          const newId = uuidv4();
          idMap[oldId] = newId;
          // Clear selection on old
          state.circuit.components[oldId].selected = false;
          // Add new component offset by 40,40
          state.circuit.components[newId] = {
            ...JSON.parse(JSON.stringify(comp)),
            id: newId,
            position: { x: comp.position.x + OFFSET, y: comp.position.y + OFFSET },
            pins: comp.pins.map(p => ({ ...p, id: uuidv4(), connectedWireIds: [] })),
            selected: true,
          };
        });
        // Update selection to new components
        state.selection = { componentIds: Object.values(idMap), wireIds: [] };
      });
    },

    selectInBox: (x1, y1, x2, y2) => set(state => {
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      const compIds: string[] = [];
      const wireIds: string[] = [];

      Object.values(state.circuit.components).forEach(comp => {
        const inBox = comp.position.x >= minX && comp.position.x <= maxX &&
                      comp.position.y >= minY && comp.position.y <= maxY;
        comp.selected = inBox;
        if (inBox) compIds.push(comp.id);
      });

      Object.values(state.circuit.wires).forEach(wire => {
        const inBox = wire.segments.some(seg =>
          (seg.start.x >= minX && seg.start.x <= maxX && seg.start.y >= minY && seg.start.y <= maxY) ||
          (seg.end.x >= minX && seg.end.x <= maxX && seg.end.y >= minY && seg.end.y <= maxY)
        );
        wire.selected = inBox;
        if (inBox) wireIds.push(wire.id);
      });

      state.selection = { componentIds: compIds, wireIds };
    }),

    setViewport: (x, y, zoom) => set(state => {
      state.circuit.viewport = { x, y, zoom };
    }),

    setZoom: (zoom) => set(state => { state.circuit.viewport.zoom = Math.max(0.05, Math.min(20, zoom)); }),
    zoomIn: () => set(state => { state.circuit.viewport.zoom = Math.min(20, state.circuit.viewport.zoom * 1.2); }),
    zoomOut: () => set(state => { state.circuit.viewport.zoom = Math.max(0.05, state.circuit.viewport.zoom / 1.2); }),
    resetView: () => set(state => { state.circuit.viewport = { x: 0, y: 0, zoom: 1 }; }),
    fitToContent: () => {
      const { circuit } = get();
      const comps = Object.values(circuit.components);
      if (comps.length === 0) return;

      const xs = comps.map(c => c.position.x);
      const ys = comps.map(c => c.position.y);
      const pad = 120;
      const minX = Math.min(...xs) - pad;
      const minY = Math.min(...ys) - pad;
      const maxX = Math.max(...xs) + pad;
      const maxY = Math.max(...ys) + pad;
      const cw = maxX - minX || 200;
      const ch = maxY - minY || 200;

      // Use window dimensions as fallback
      const vw = window.innerWidth  - 400; // subtract sidebar widths
      const vh = window.innerHeight - 80;  // subtract topbar + statusbar
      const zoom = Math.min(1.5, vw / cw, vh / ch);
      const x = (vw - cw * zoom) / 2 - minX * zoom;
      const y = (vh - ch * zoom) / 2 - minY * zoom;

      set(state => { state.circuit.viewport = { x, y, zoom: Math.max(0.1, zoom) }; });
    },

    setDragState: (drag) => set(state => { Object.assign(state.dragState, drag); }),
    clearDragState: () => set(state => { state.dragState = createEmptyDrag(); }),

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex <= 0) return;
      set(state => {
        state.historyIndex = historyIndex - 1;
        state.circuit = JSON.parse(JSON.stringify(history[historyIndex - 1]));
      });
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return;
      set(state => {
        state.historyIndex = historyIndex + 1;
        state.circuit = JSON.parse(JSON.stringify(history[historyIndex + 1]));
      });
    },

    pushHistory: () => {
      const { circuit, history, historyIndex } = get();
      const snapshot = JSON.parse(JSON.stringify(circuit));
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      // Keep max 50 history states
      if (newHistory.length > 50) newHistory.shift();
      set(state => {
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      });
    },

    setSimulationResult: (result) => set(state => { state.simulationResult = result; }),

    rebuildNodes: () => set(state => {
      // Build net list from wires
      const nodes: Record<string, NetNode> = {};
      const visited = new Set<string>();
      let nodeCount = 0;

      const pinKey = (compId: string, pinId: string) => `${compId}::${pinId}`;

      // BFS to find connected pins
      const allWires = Object.values(state.circuit.wires);
      const pinToNode = new Map<string, string>();

      const getOrCreateNode = (key: string): string => {
        if (pinToNode.has(key)) return pinToNode.get(key)!;
        const nid = `n${++nodeCount}`;
        pinToNode.set(key, nid);
        return nid;
      };

      // Merge connected pins into same node via wires
      allWires.forEach(wire => {
        if (!wire.fromComponentId || !wire.fromPinId || !wire.toComponentId || !wire.toPinId) return;
        const k1 = pinKey(wire.fromComponentId, wire.fromPinId);
        const k2 = pinKey(wire.toComponentId, wire.toPinId);
        const n1 = getOrCreateNode(k1);
        const n2 = getOrCreateNode(k2);
        if (n1 !== n2) {
          // Merge n2 into n1
          pinToNode.forEach((v, k) => { if (v === n2) pinToNode.set(k, n1); });
        }
      });

      // Build node objects
      const nodeMap = new Map<string, NetNode>();
      pinToNode.forEach((nid, key) => {
        if (!nodeMap.has(nid)) {
          nodeMap.set(nid, { id: nid, name: nid, connectedPins: [], voltage: 0, isGround: false, isVcc: false });
        }
        const [compId, pinId] = key.split('::');
        nodeMap.get(nid)!.connectedPins.push({ componentId: compId, pinId });
      });

      // Check for ground/vcc
      nodeMap.forEach((node) => {
        node.connectedPins.forEach(({ componentId, pinId }) => {
          const comp = state.circuit.components[componentId];
          const pin = comp?.pins.find(p => p.id === pinId);
          if (pin?.type === 'gnd' || comp?.type === 'ground') node.isGround = true;
          if (pin?.type === 'vcc' || comp?.type === 'vcc') node.isVcc = true;
        });
        nodes[node.id] = node;
      });

      state.circuit.nodes = nodes;
      void visited;
    }),
  }))
);
