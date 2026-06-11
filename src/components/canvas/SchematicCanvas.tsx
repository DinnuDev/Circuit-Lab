import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { COMPONENT_DEFINITIONS } from '@/data/componentLibrary';
import { useDragContext } from '@/context/DragContext';
import type { Point2D } from '@/types';
import SchematicComponent from '@/components/schematic/SchematicComponent';
import WireLayer from '@/components/schematic/WireLayer';
import CurrentFlowLayer from '@/components/schematic/CurrentFlowLayer';
import GridLayer from '@/components/schematic/GridLayer';
import MiniMap from '@/components/schematic/MiniMap';
import ComponentContextMenu from '@/components/schematic/ComponentContextMenu';

const AUTO_CONNECT_THRESHOLD = 40;

export default function SchematicCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [drawingWire, setDrawingWire] = useState<{
    fromComponentId: string;
    fromPinId: string;
    points: Point2D[];
  } | null>(null);
  const [cursor, setCursor] = useState<Point2D>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dropPreviewPos, setDropPreviewPos] = useState<Point2D | null>(null);
  const [nearbyPins, setNearbyPins] = useState<Array<{ compId: string; pinId: string; pos: Point2D }>>([]);
  const [selectionBox, setSelectionBox] = useState<{ start: Point2D; end: Point2D } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; componentId: string } | null>(null);
  const panStart = useRef<{ mx: number; my: number; vx: number; vy: number } | null>(null);
  const rubberStart = useRef<Point2D | null>(null); // canvas coords

  const {
    circuit, addComponent, moveComponent, moveSelectedComponents,
    selectComponent, clearSelection, selectInBox,
    setViewport, addWire, connectWire, selection,
  } = useCircuitStore();
  const { showGrid, showCurrentFlow, snapToGrid, gridSize, showLabels, showValues } = useUIStore();
  const { viewport } = circuit;
  const { dragging: draggingDef, endDrag } = useDragContext();

  // Track canvas size
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback((sx: number, sy: number): Point2D => {
    return {
      x: (sx - viewport.x) / viewport.zoom,
      y: (sy - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  const snap = useCallback((p: Point2D): Point2D => {
    if (!snapToGrid) return p;
    return {
      x: Math.round(p.x / gridSize) * gridSize,
      y: Math.round(p.y / gridSize) * gridSize,
    };
  }, [snapToGrid, gridSize]);

  // ── Drag drop from component library ───────────────────────
  // Compute world-space pin positions for all existing components
  const getWorldPins = useCallback(() => {
    const pins: Array<{ compId: string; pinId: string; pos: Point2D }> = [];
    Object.values(circuit.components).forEach(comp => {
      const rad = (comp.rotation * Math.PI) / 180;
      comp.pins.forEach(pin => {
        const wx = comp.position.x + pin.position.x * Math.cos(rad) - pin.position.y * Math.sin(rad);
        const wy = comp.position.y + pin.position.x * Math.sin(rad) + pin.position.y * Math.cos(rad);
        pins.push({ compId: comp.id, pinId: pin.id, pos: { x: wx, y: wy } });
      });
    });
    return pins;
  }, [circuit.components]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawPos = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    const pos = snap(rawPos);
    setDropPreviewPos(pos);

    // Find nearby pins for snap highlight
    if (draggingDef) {
      const existingPins = getWorldPins();
      const defPins = draggingDef.pins ?? [];
      const nearby: typeof nearbyPins = [];
      defPins.forEach(defPin => {
        const newPinWorld = { x: pos.x + defPin.position.x, y: pos.y + defPin.position.y };
        existingPins.forEach(ep => {
          const dx = ep.pos.x - newPinWorld.x;
          const dy = ep.pos.y - newPinWorld.y;
          if (Math.sqrt(dx * dx + dy * dy) < AUTO_CONNECT_THRESHOLD) {
            nearby.push(ep);
          }
        });
      });
      setNearbyPins(nearby);
    }
  }, [screenToCanvas, snap, draggingDef, getWorldPins]);

  const handleDragLeave = useCallback(() => {
    setDropPreviewPos(null);
    setNearbyPins([]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    const compType = e.dataTransfer.getData('application/circuit-component');
    if (!compType) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const rawPos = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);

    // Snap to nearby pin if close enough
    let pos = snap(rawPos);
    const existingPins = getWorldPins();
    const defDef = COMPONENT_DEFINITIONS[compType as keyof typeof COMPONENT_DEFINITIONS];
    if (defDef) {
      let bestDist = AUTO_CONNECT_THRESHOLD;
      let bestOffset: Point2D | null = null;
      (defDef.pins ?? []).forEach(defPin => {
        const newPinWorld = { x: pos.x + defPin.position.x, y: pos.y + defPin.position.y };
        existingPins.forEach(ep => {
          const dx = ep.pos.x - newPinWorld.x;
          const dy = ep.pos.y - newPinWorld.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bestDist) {
            bestDist = dist;
            bestOffset = { x: dx, y: dy };
          }
        });
      });
      if (bestOffset) {
        pos = { x: pos.x + (bestOffset as Point2D).x, y: pos.y + (bestOffset as Point2D).y };
      }
    }

    const newCompId = addComponent(compType as never, pos);

    // Auto-connect matching pins
    if (newCompId && defDef) {
      const newComp = useCircuitStore.getState().circuit.components[newCompId];
      if (newComp) {
        const rad = (newComp.rotation * Math.PI) / 180;
        newComp.pins.forEach(newPin => {
          const wx = newComp.position.x + newPin.position.x * Math.cos(rad) - newPin.position.y * Math.sin(rad);
          const wy = newComp.position.y + newPin.position.x * Math.sin(rad) + newPin.position.y * Math.cos(rad);
          existingPins.forEach(ep => {
            if (ep.compId === newCompId) return;
            const dx = ep.pos.x - wx;
            const dy = ep.pos.y - wy;
            if (Math.sqrt(dx * dx + dy * dy) < 8) {
              const wireId = addWire({
                segments: [{ start: { x: wx, y: wy }, end: ep.pos }],
                type: 'copper',
                fromComponentId: newCompId,
                fromPinId: newPin.id,
                toComponentId: ep.compId,
                toPinId: ep.pinId,
              });
              connectWire(wireId, newCompId, newPin.id, 'from');
              connectWire(wireId, ep.compId, ep.pinId, 'to');
            }
          });
        });
      }
    }

    setDropPreviewPos(null);
    setNearbyPins([]);
    endDrag();
  }, [screenToCanvas, snap, addComponent, getWorldPins, addWire, connectWire, endDrag]);

  // ── Mouse events ────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const isCanvas = e.target === svgRef.current || (e.target as Element).classList.contains('grid-bg-rect');
    if (!isCanvas) return;

    // Middle button or Alt+left = pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, vx: viewport.x, vy: viewport.y };
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      // Start rubber-band selection
      const rect = svgRef.current!.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
      rubberStart.current = canvasPos;
      setSelectionBox({ start: canvasPos, end: canvasPos });
      // Don't clear yet — clear only if we end up with empty box
    }
  }, [viewport, screenToCanvas]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const raw = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    const snapped = snap(raw);
    setCursor(snapped);

    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.mx;
      const dy = e.clientY - panStart.current.my;
      setViewport(panStart.current.vx + dx, panStart.current.vy + dy, viewport.zoom);
    }

    if (drawingWire) {
      setDrawingWire(prev => prev ? { ...prev, points: [...prev.points.slice(0, -1), snapped] } : null);
    }

    // Update rubber band box
    if (rubberStart.current && !isPanning && !drawingWire) {
      setSelectionBox({ start: rubberStart.current, end: raw });
    }
  }, [isPanning, panStart, viewport, setViewport, screenToCanvas, snap, drawingWire]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
    }

    // Only process rubber-band if we actually started one on the canvas background
    if (!rubberStart.current || !selectionBox) return;

    const { start, end } = selectionBox;
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);

    if (dx > 8 || dy > 8) {
      // Genuine rubber-band drag — select all in box
      selectInBox(start.x, start.y, end.x, end.y);
    } else {
      // Tiny movement = plain click on empty canvas = deselect
      clearSelection();
    }

    rubberStart.current = null;
    setSelectionBox(null);
  }, [isPanning, selectionBox, selectInBox, clearSelection]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.05, Math.min(20, viewport.zoom * factor));
    // Zoom centered on cursor
    const newX = mx - (mx - viewport.x) * (newZoom / viewport.zoom);
    const newY = my - (my - viewport.y) * (newZoom / viewport.zoom);
    setViewport(newX, newY, newZoom);
  }, [viewport, setViewport]);

  // Non-passive wheel listener
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement?.tagName;
      if (active === 'INPUT' || active === 'TEXTAREA') return;

      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); useCircuitStore.getState().undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); useCircuitStore.getState().redo(); }
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); useCircuitStore.getState().duplicateSelected(); }
      if (e.ctrlKey && e.key === 'a') { e.preventDefault(); useCircuitStore.getState().selectAll(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useCircuitStore.getState().deleteSelected();
      }
      if (e.key === 'r' || e.key === 'R') {
        const { selection } = useCircuitStore.getState();
        selection.componentIds.forEach(id => useCircuitStore.getState().rotateComponent(id));
      }
      if (e.key === 'Escape') {
        clearSelection();
        setDrawingWire(null);
        setSelectionBox(null);
        rubberStart.current = null;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection]);

  // ── Pin click — start/end wire drawing ─────────────────────
  const handlePinClick = useCallback((compId: string, pinId: string, pinPos: Point2D) => {
    if (!drawingWire) {
      // Start drawing
      setDrawingWire({ fromComponentId: compId, fromPinId: pinId, points: [pinPos, pinPos] });
    } else {
      // End drawing — create wire
      if (drawingWire.fromComponentId === compId && drawingWire.fromPinId === pinId) {
        setDrawingWire(null);
        return;
      }
      const segs = [];
      const pts = [...drawingWire.points.slice(0, -1), pinPos];
      for (let i = 0; i < pts.length - 1; i++) {
        segs.push({ start: pts[i], end: pts[i + 1] });
      }
      const wireId = addWire({
        segments: segs,
        type: 'copper',
        fromComponentId: drawingWire.fromComponentId,
        fromPinId: drawingWire.fromPinId,
        toComponentId: compId,
        toPinId: pinId,
      });
      connectWire(wireId, drawingWire.fromComponentId, drawingWire.fromPinId, 'from');
      connectWire(wireId, compId, pinId, 'to');
      setDrawingWire(null);
    }
  }, [drawingWire, addWire, connectWire]);

  // Wire point on canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).tagName !== 'svg' && !(e.target as Element).classList.contains('grid-bg-rect')) return;
    if (!drawingWire) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const pos = snap(screenToCanvas(e.clientX - rect.left, e.clientY - rect.top));
    setDrawingWire(prev => prev ? { ...prev, points: [...prev.points.slice(0, -1), pos, pos] } : null);
  }, [drawingWire, snap, screenToCanvas]);

  const components = Object.values(circuit.components);
  const wires = Object.values(circuit.wires);
  const simResult = useCircuitStore(s => s.simulationResult);
  const selCount = selection.componentIds.length + selection.wireIds.length;

  const handleContextMenu = useCallback((e: React.MouseEvent, componentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, componentId });
  }, []);

  return (
    <div
      className="w-full h-full relative overflow-hidden bg-[#0f1117]"
      onClick={() => contextMenu && setContextMenu(null)}
    >
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className={`absolute inset-0 ${drawingWire ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : selectionBox ? 'cursor-crosshair' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleCanvasClick}
        style={{ userSelect: 'none' }}
      >
        {/* Background */}
        <rect width={size.w} height={size.h} fill="#0f1117" className="grid-bg-rect" />

        <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.zoom})`}>
          {/* Grid */}
          {showGrid && <GridLayer width={size.w} height={size.h} viewport={viewport} gridSize={gridSize} />}

          {/* Wires */}
          <WireLayer wires={wires} simResult={simResult} />

          {/* Current flow animation */}
          {showCurrentFlow && simResult?.success && (
            <CurrentFlowLayer wires={wires} simResult={simResult} />
          )}

          {/* Components */}
          {components.map(comp => (
            <SchematicComponent
              key={comp.id}
              component={comp}
              simResult={simResult}
              showLabels={showLabels}
              showValues={showValues}
              onPinClick={handlePinClick}
              onContextMenu={handleContextMenu}
              isDrawingWire={!!drawingWire}
              isMultiSelected={selection.componentIds.length > 1 && comp.selected}
              onMultiDragStart={moveSelectedComponents}
              viewportZoom={viewport.zoom}
            />
          ))}

          {/* Rubber-band selection box */}
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.start.x, selectionBox.end.x)}
              y={Math.min(selectionBox.start.y, selectionBox.end.y)}
              width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
              height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
              fill="rgba(59,130,246,0.06)"
              stroke="#3b82f6"
              strokeWidth={1.5 / viewport.zoom}
              strokeDasharray={`${5 / viewport.zoom} ${3 / viewport.zoom}`}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Drop preview ghost */}
          {dropPreviewPos && draggingDef && (
            <g transform={`translate(${dropPreviewPos.x},${dropPreviewPos.y})`} opacity={0.55} style={{ pointerEvents: 'none' }}>
              <rect
                x={draggingDef.boundingBox.x - 6} y={draggingDef.boundingBox.y - 6}
                width={draggingDef.boundingBox.width + 12} height={draggingDef.boundingBox.height + 12}
                rx={4} fill="rgba(59,130,246,0.08)" stroke="#3b82f6"
                strokeWidth={1.5 / viewport.zoom} strokeDasharray={`${5 / viewport.zoom} ${3 / viewport.zoom}`}
              />
              <g fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" color="#3b82f6"
                dangerouslySetInnerHTML={{ __html: draggingDef.symbol }} />
              {draggingDef.pins.map(pin => (
                <circle key={pin.id} cx={pin.position.x} cy={pin.position.y} r={4 / viewport.zoom} fill="#3b82f6" opacity={0.5} />
              ))}
            </g>
          )}

          {/* Nearby pin highlights when dragging */}
          {nearbyPins.map((np, i) => (
            <g key={i} style={{ pointerEvents: 'none' }}>
              <circle cx={np.pos.x} cy={np.pos.y} r={8 / viewport.zoom} fill="none" stroke="#22c55e" strokeWidth={2 / viewport.zoom} opacity={0.8} />
              <circle cx={np.pos.x} cy={np.pos.y} r={3 / viewport.zoom} fill="#22c55e" opacity={0.9} />
            </g>
          ))}

          {/* Wire being drawn */}
          {drawingWire && drawingWire.points.length >= 2 && (
            <polyline
              points={drawingWire.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none" stroke="#3b82f6"
              strokeWidth={2 / viewport.zoom}
              strokeDasharray={`${6 / viewport.zoom} ${3 / viewport.zoom}`}
              strokeLinecap="round"
            />
          )}

          {/* Cursor crosshair while drawing wire */}
          {drawingWire && (
            <g opacity={0.4}>
              <line x1={cursor.x - 8} y1={cursor.y} x2={cursor.x + 8} y2={cursor.y} stroke="#3b82f6" strokeWidth={1 / viewport.zoom} />
              <line x1={cursor.x} y1={cursor.y - 8} x2={cursor.x} y2={cursor.y + 8} stroke="#3b82f6" strokeWidth={1 / viewport.zoom} />
            </g>
          )}
        </g>
      </svg>

      {/* Selection toolbar */}
      {selCount > 0 && !drawingWire && (
        <SelectionToolbar
          count={selCount}
          componentCount={selection.componentIds.length}
          onDelete={() => useCircuitStore.getState().deleteSelected()}
          onDuplicate={() => useCircuitStore.getState().duplicateSelected()}
          onSelectAll={() => useCircuitStore.getState().selectAll()}
          onClear={() => useCircuitStore.getState().clearSelection()}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ComponentContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          componentId={contextMenu.componentId}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Minimap */}
      <MiniMap components={components} wires={wires} viewport={viewport} canvasSize={size} />

      {/* Drop zone active glow */}
      {dropPreviewPos && (
        <div className="absolute inset-0 pointer-events-none border-2 border-blue-500/30 rounded" style={{ boxShadow: 'inset 0 0 40px rgba(59,130,246,0.06)' }} />
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-8 right-2 text-xs text-gray-600 bg-black/50 rounded px-2 py-1 pointer-events-none">
        {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Drawing wire hint */}
      {drawingWire && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-blue-400 bg-blue-900/40 border border-blue-500/30 rounded-lg px-3 py-1.5 pointer-events-none backdrop-blur-sm">
          Click a pin to complete wire · ESC to cancel · Click canvas to add waypoint
        </div>
      )}

      {/* Drag-over hint */}
      {dropPreviewPos && draggingDef && nearbyPins.length > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-green-400 bg-green-900/40 border border-green-500/30 rounded-lg px-3 py-1.5 pointer-events-none backdrop-blur-sm">
          ⚡ Auto-connect on drop
        </div>
      )}
    </div>
  );
}

// ── Selection toolbar ─────────────────────────────────────────
function SelectionToolbar({ count, componentCount, onDelete, onDuplicate, onSelectAll, onClear }: {
  count: number; componentCount: number;
  onDelete: () => void; onDuplicate: () => void;
  onSelectAll: () => void; onClear: () => void;
}) {
  return (
    <div className="cl-selection-bar absolute top-3 z-20" style={{ left: '50%', transform: 'translateX(-50%)' }}>
      <div className="cl-selection-bar__count">
        <span className="count-number">{count}</span>
        <span className="count-label">{count === 1 ? 'item' : 'items'} selected</span>
      </div>
      <div className="cl-selection-bar__actions">
        {componentCount > 0 && (
          <button className="cl-selection-bar__btn cl-selection-bar__btn--default" onClick={onDuplicate} title="Duplicate (Ctrl+D)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Duplicate
          </button>
        )}
        <button className="cl-selection-bar__btn cl-selection-bar__btn--danger" onClick={onDelete} title="Delete (Del)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
          Delete
        </button>
        <div className="cl-selection-bar__divider" />
        <button className="cl-selection-bar__btn cl-selection-bar__btn--muted" onClick={onSelectAll} title="Select All (Ctrl+A)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          All
        </button>
        <button className="cl-selection-bar__btn cl-selection-bar__btn--muted" onClick={onClear} title="Deselect (Esc)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Deselect
        </button>
      </div>
    </div>
  );
}