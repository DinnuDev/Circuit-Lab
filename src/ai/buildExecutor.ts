/**
 * Applies AI-generated BuildResult to the circuit store.
 * Finds actual pin IDs by name/type and creates proper wire connections.
 */
import { v4 as uuidv4 } from 'uuid';
import { useCircuitStore } from '@/store/circuitStore';
import { COMPONENT_DEFINITIONS } from '@/data/componentLibrary';
import type { BuildResult, BuildAction, WireAction } from './circuitAI';
import type { ComponentType } from '@/types';

export function applyBuildResult(result: BuildResult): void {
  const store = useCircuitStore.getState();

  // Clear existing circuit and start fresh
  store.newCircuit();

  // Small delay to ensure store reset is applied
  requestAnimationFrame(() => {
    const freshStore = useCircuitStore.getState();

    // ── Step 1: Place all components ────────────────────────
    const idByActionId: Record<string, string> = {};
    const addedComps: Record<string, { compId: string; actionId: string }> = {};

    result.actions
      .filter((a): a is BuildAction => a.type === 'add_component')
      .forEach(action => {
        const def = COMPONENT_DEFINITIONS[action.compType as ComponentType];
        if (!def) return;

        const compId = action.id;
        idByActionId[action.id] = compId;

        // Add via store with the specific ID approach — use addComponent then relabel
        const newId = freshStore.addComponent(action.compType as ComponentType, action.position);
        if (newId) {
          idByActionId[action.id] = newId;
          // Update label and properties
          freshStore.updateComponentProperty(newId, 'label', action.label);
          Object.entries(action.properties).forEach(([k, v]) => {
            freshStore.updateComponentProperty(newId, k, v);
          });
        }
      });

    // ── Step 2: Create wires ─────────────────────────────────
    // Re-read fresh state after component additions
    const stateAfterComps = useCircuitStore.getState();

    result.actions
      .filter((a): a is WireAction => a.type === 'add_wire')
      .forEach(action => {
        const fromId = idByActionId[action.fromCompId];
        const toId   = idByActionId[action.toCompId];
        if (!fromId || !toId) return;

        const fromComp = stateAfterComps.circuit.components[fromId];
        const toComp   = stateAfterComps.circuit.components[toId];
        if (!fromComp || !toComp) return;

        // Find pins by type or name match
        const findPin = (comp: typeof fromComp, pinType: string, pinLabel: string) => {
          const q = pinType.toLowerCase();
          const ql = pinLabel.toLowerCase();
          return comp.pins.find(p =>
            p.type === q || p.name.toLowerCase() === ql ||
            p.type === 'gnd' && (q === 'gnd' || q === 'ground' || q === 'minus') ||
            p.type === 'vcc' && (q === 'vcc' || q === 'plus') ||
            p.id === q
          ) ?? comp.pins[0];
        };

        const fromPin = findPin(fromComp, action.fromPinType, action.fromPinLabel);
        const toPin   = findPin(toComp,   action.toPinType,   action.toPinLabel);
        if (!fromPin || !toPin) return;

        // Compute actual world positions from component positions + pin offsets
        const pinWorld = (comp: typeof fromComp, pin: typeof fromPin) => {
          const rad = (comp.rotation * Math.PI) / 180;
          return {
            x: comp.position.x + pin.position.x * Math.cos(rad) - pin.position.y * Math.sin(rad),
            y: comp.position.y + pin.position.x * Math.sin(rad) + pin.position.y * Math.cos(rad),
          };
        };

        const startPos = pinWorld(fromComp, fromPin);
        const endPos   = pinWorld(toComp,   toPin);

        const wireId = stateAfterComps.addWire({
          segments: [{ start: startPos, end: endPos }],
          type: 'copper',
          fromComponentId: fromId,
          fromPinId: fromPin.id,
          toComponentId: toId,
          toPinId: toPin.id,
        });

        stateAfterComps.connectWire(wireId, fromId, fromPin.id, 'from');
        stateAfterComps.connectWire(wireId, toId,   toPin.id,   'to');
      });

    // ── Step 3: Fit view to circuit ──────────────────────────
    setTimeout(() => {
      useCircuitStore.getState().fitToContent();
    }, 150);
  });
}
