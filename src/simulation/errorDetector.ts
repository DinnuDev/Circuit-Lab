import type { Circuit, SimulationError, SimulationWarning } from '@/types';

export interface ErrorDetectionResult {
  errors: SimulationError[];
  warnings: SimulationWarning[];
}

export function detectCircuitErrors(circuit: Circuit): ErrorDetectionResult {
  const errors: SimulationError[] = [];
  const warnings: SimulationWarning[] = [];

  const components = Object.values(circuit.components);
  const wires = Object.values(circuit.wires);

  if (components.length === 0) return { errors, warnings };

  // ── Check 1: No ground ──────────────────────────────────
  const hasGround = components.some(
    c => c.type === 'ground' || c.pins.some(p => p.type === 'gnd')
  );
  if (!hasGround) {
    warnings.push({
      type: 'no_ground',
      message: 'Circuit has no ground reference.',
      suggestion: 'Add a GND component to provide a voltage reference.',
    });
  }

  // ── Check 2: No power source ────────────────────────────
  const hasPower = components.some(c =>
    c.type === 'battery' || c.type === 'dc_source' || c.type === 'ac_source' || c.type === 'vcc'
  );
  if (!hasPower) {
    warnings.push({
      type: 'no_ground',
      message: 'No power source detected.',
      suggestion: 'Add a Battery or DC Source to power the circuit.',
    });
  }

  // ── Check 3: Floating/unconnected pins ──────────────────
  components.forEach(comp => {
    const unconnectedPins = comp.pins.filter(p => p.connectedWireIds.length === 0);
    // Allow single-pin components (ground, vcc)
    if (comp.pins.length > 1 && unconnectedPins.length > 0) {
      warnings.push({
        type: 'floating_input',
        message: `${comp.label} has ${unconnectedPins.length} unconnected pin(s): ${unconnectedPins.map(p => p.name).join(', ')}`,
        componentId: comp.id,
        suggestion: 'Connect or tie unused pins to avoid floating inputs.',
      });
    }
  });

  // ── Check 4: LED without current limiting resistor ──────
  components.forEach(comp => {
    if (comp.type === 'led') {
      // Check if LED is directly connected to a voltage source
      const hasResistorInPath = checkHasResistorInPath(comp.id, circuit);
      if (!hasResistorInPath) {
        warnings.push({
          type: 'overcurrent',
          message: `${comp.label} may be connected without a current limiting resistor.`,
          componentId: comp.id,
          suggestion: 'Add a resistor (220Ω–1kΩ) in series to limit current through the LED.',
        });
      }
    }
  });

  // ── Check 5: Disconnected wires ─────────────────────────
  wires.forEach(wire => {
    const hasFrom = wire.fromComponentId && wire.fromPinId;
    const hasTo = wire.toComponentId && wire.toPinId;
    if (!hasFrom || !hasTo) {
      warnings.push({
        type: 'floating_input',
        message: `Wire has a dangling end (not connected to a component).`,
        suggestion: 'Connect both ends of the wire to component pins.',
      });
    }
  });

  // ── Check 6: Short circuits (direct connection of + to −) 
  wires.forEach(wire => {
    if (!wire.fromComponentId || !wire.toComponentId) return;
    const fromComp = circuit.components[wire.fromComponentId];
    const toComp = circuit.components[wire.toComponentId];
    if (!fromComp || !toComp) return;
    // Both are power pins with no impedance between them
    if (
      (fromComp.type === 'battery' || fromComp.type === 'dc_source') &&
      (toComp.type === 'battery' || toComp.type === 'dc_source')
    ) {
      errors.push({
        type: 'short_circuit',
        message: 'Two voltage sources directly connected — possible short circuit.',
        componentIds: [fromComp.id, toComp.id],
        severity: 'error',
        suggestion: 'Avoid connecting voltage sources in parallel without current limiting.',
      });
    }
  });

  // ── Check 7: Overcurrent in components ──────────────────
  components.forEach(comp => {
    if (comp.simulationData) {
      const { current, power } = comp.simulationData;
      if (comp.properties.currentRating && current > comp.properties.currentRating * 1.1) {
        errors.push({
          type: 'component_failure',
          message: `${comp.label} exceeds max current (${(current * 1000).toFixed(1)}mA vs ${(comp.properties.currentRating * 1000).toFixed(1)}mA rated)`,
          componentIds: [comp.id],
          severity: 'error',
          suggestion: 'Reduce current by adding series resistance or lowering supply voltage.',
        });
      }
      if (comp.properties.voltageRating && comp.simulationData.voltage > comp.properties.voltageRating) {
        warnings.push({
          type: 'overvoltage',
          message: `${comp.label} voltage (${comp.simulationData.voltage.toFixed(2)}V) exceeds rating (${comp.properties.voltageRating}V)`,
          componentId: comp.id,
          value: comp.simulationData.voltage,
          threshold: comp.properties.voltageRating,
          suggestion: 'Use a voltage regulator or choose a higher voltage rated component.',
        });
      }
    }
  });

  return { errors, warnings };
}

function checkHasResistorInPath(ledId: string, circuit: Circuit): boolean {
  const led = circuit.components[ledId];
  if (!led) return true;
  // Walk connected wires and check if a resistor is present
  for (const pin of led.pins) {
    for (const wireId of pin.connectedWireIds) {
      const wire = circuit.wires[wireId];
      if (!wire) continue;
      const otherId = wire.fromComponentId === ledId ? wire.toComponentId : wire.fromComponentId;
      if (!otherId) continue;
      const other = circuit.components[otherId];
      if (!other) continue;
      if (other.type === 'resistor' || other.type === 'potentiometer') return true;
    }
  }
  return false;
}
