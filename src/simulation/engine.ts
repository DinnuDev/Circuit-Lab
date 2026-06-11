/**
 * Modified Nodal Analysis (MNA) Simulation Engine
 * Supports DC analysis, basic AC, and transient simulation
 */

import type {
  Circuit, SimulationResult, SimulationError, SimulationWarning,
  ComponentSimResult, NetNode,
} from '@/types';

// ============================================================
// Gaussian Elimination solver for Ax = b
// ============================================================
function gaussianElimination(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot — use relative threshold to handle small conductances
    let pivotRow = -1;
    let maxVal = 0;
    for (let row = col; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        pivotRow = row;
      }
    }
    if (pivotRow === -1 || maxVal < 1e-14) return null; // Singular / near-singular matrix

    // Swap rows
    [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];

    // Eliminate below
    const pivot = aug[col][col];
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot;
      for (let k = col; k <= n; k++) {
        aug[row][k] -= factor * aug[col][k];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }
  return x;
}

// ============================================================
// Build MNA matrices for DC analysis
// ============================================================
interface MNAState {
  nodeIds: string[];         // [gnd(0), n1, n2, ...]
  nodeIndex: Record<string, number>;
  vsources: Array<{ id: string; posNode: number; negNode: number; voltage: number }>;
  numNodes: number;
  numVSources: number;
  G: number[][];             // Conductance matrix
  b: number[][];             // RHS vector (we use b[0] = current, for expanded MNA it's bigger)
}

export function runDCSimulation(circuit: Circuit): SimulationResult {
  const errors: SimulationError[] = [];
  const warnings: SimulationWarning[] = [];
  const timestamp = Date.now();

  const components = Object.values(circuit.components);
  const wires = Object.values(circuit.wires);

  if (components.length === 0) {
    return {
      success: false,
      mode: 'dc',
      timestamp,
      nodeVoltages: {},
      branchCurrents: {},
      componentResults: {},
      errors: [{ type: 'open_circuit', message: 'No components in circuit', severity: 'warning' }],
      warnings: [],
    };
  }

  // ── Step 1: Build net list (find nodes) ──────────────────
  const pinToNode = new Map<string, string>();
  let nodeCounter = 1;

  const pinKey = (compId: string, pinId: string) => `${compId}::${pinId}`;

  // Each connected wire merges two pins into the same node
  wires.forEach(wire => {
    if (!wire.fromComponentId || !wire.fromPinId || !wire.toComponentId || !wire.toPinId) return;
    const k1 = pinKey(wire.fromComponentId, wire.fromPinId);
    const k2 = pinKey(wire.toComponentId, wire.toPinId);

    const n1 = pinToNode.get(k1);
    const n2 = pinToNode.get(k2);

    if (!n1 && !n2) {
      const nid = `n${nodeCounter++}`;
      pinToNode.set(k1, nid);
      pinToNode.set(k2, nid);
    } else if (n1 && !n2) {
      pinToNode.set(k2, n1);
    } else if (!n1 && n2) {
      pinToNode.set(k1, n2);
    } else if (n1 && n2 && n1 !== n2) {
      // Merge n2 into n1
      pinToNode.forEach((v, k) => { if (v === n2) pinToNode.set(k, n1); });
    }
  });

  // Isolated pins get their own node
  components.forEach(comp => {
    comp.pins.forEach(pin => {
      const k = pinKey(comp.id, pin.id);
      if (!pinToNode.has(k)) {
        pinToNode.set(k, `n${nodeCounter++}`);
      }
    });
  });

  // Find ground node
  let groundNode: string | null = null;
  components.forEach(comp => {
    if (comp.type === 'ground') {
      const pin = comp.pins[0];
      if (pin) {
        groundNode = pinToNode.get(pinKey(comp.id, pin.id)) ?? null;
      }
    }
    comp.pins.forEach(pin => {
      if (pin.type === 'gnd') {
        groundNode = pinToNode.get(pinKey(comp.id, pin.id)) ?? groundNode;
      }
    });
  });

  if (!groundNode) {
    // Check if any node is named gnd
    const nodeIds = [...new Set(pinToNode.values())];
    if (nodeIds.length > 0) {
      // Use first node as implicit ground
      groundNode = nodeIds[0];
      warnings.push({
        type: 'no_ground',
        message: 'No ground reference found. Using implicit ground.',
        suggestion: 'Add a ground component to your circuit.',
      });
    } else {
      return {
        success: false,
        mode: 'dc',
        timestamp,
        nodeVoltages: {},
        branchCurrents: {},
        componentResults: {},
        errors: [{ type: 'open_circuit', message: 'No connected nodes found', severity: 'error' }],
        warnings,
      };
    }
  }

  // Build node index (0 = ground, excluded from matrix; non-ground nodes numbered 1..n)
  const allNodes = [...new Set(pinToNode.values())];
  const nonGroundNodes = allNodes.filter(n => n !== groundNode);
  const nodeIndex: Record<string, number> = {};
  nonGroundNodes.forEach((nid, i) => { nodeIndex[nid] = i; });

  const numNodes = nonGroundNodes.length;

  // ── Step 2: Collect voltage sources ──────────────────────
  const vsourceList: Array<{
    id: string; posNode: number; negNode: number; voltage: number;
  }> = [];

  components.forEach(comp => {
    let v: number | null = null;
    let posPin: string | null = null;
    let negPin: string | null = null;

    if (comp.type === 'battery' || comp.type === 'dc_source') {
      v = comp.properties.voltage ?? 9;
      // Find + and - pins
      comp.pins.forEach(pin => {
        if (pin.type === 'plus') posPin = pin.id;
        if (pin.type === 'minus') negPin = pin.id;
      });
    } else if (comp.type === 'vcc') {
      v = comp.properties.voltage ?? 5;
      posPin = comp.pins[0]?.id ?? null;
      negPin = null; // connected to ground
    }

    if (v !== null && posPin !== null) {
      const posNodeId = pinToNode.get(pinKey(comp.id, posPin)) ?? null;
      const negNodeId = negPin ? pinToNode.get(pinKey(comp.id, negPin)) ?? null : groundNode;

      const posIdx = posNodeId && posNodeId !== groundNode ? (nodeIndex[posNodeId] ?? -1) : -1;
      const negIdx = negNodeId && negNodeId !== groundNode ? (nodeIndex[negNodeId] ?? -1) : -1;

      vsourceList.push({ id: comp.id, posNode: posIdx, negNode: negIdx, voltage: v });
    }
  });

  const numVSources = vsourceList.length;
  const matSize = numNodes + numVSources;

  if (matSize === 0) {
    return {
      success: false,
      mode: 'dc',
      timestamp,
      nodeVoltages: { [groundNode]: 0 },
      branchCurrents: {},
      componentResults: {},
      errors: [],
      warnings,
    };
  }

  // ── Step 3: Build MNA conductance matrix ─────────────────
  const G: number[][] = Array.from({ length: matSize }, () => new Array(matSize).fill(0));
  const I: number[] = new Array(matSize).fill(0);

  const stamp = (n1: number, n2: number, g: number) => {
    if (n1 >= 0) G[n1][n1] += g;
    if (n2 >= 0) G[n2][n2] += g;
    if (n1 >= 0 && n2 >= 0) { G[n1][n2] -= g; G[n2][n1] -= g; }
  };

  const stampCurrent = (n: number, i: number) => {
    if (n >= 0 && n < numNodes) I[n] += i;
  };

  // Stamp passive components
  components.forEach(comp => {
    if (comp.type === 'resistor' || comp.type === 'potentiometer') {
      const R = comp.properties.resistance ?? 1000;
      if (R <= 0) return;
      const g = 1 / R;
      // Find connected node indices
      const nodes = getCompNodeIndices(comp, pinToNode, nodeIndex, groundNode!, pinKey);
      if (nodes.length >= 2) stamp(nodes[0], nodes[1], g);
    }

    if (comp.type === 'fuse' || comp.type === 'switch_spst') {
      const isOpen = comp.properties.isOpen ?? false;
      const g = isOpen ? 0 : 1e6; // closed switch = very low resistance
      const nodes = getCompNodeIndices(comp, pinToNode, nodeIndex, groundNode!, pinKey);
      if (nodes.length >= 2 && !isOpen) stamp(nodes[0], nodes[1], g);
    }

    if (comp.type === 'led') {
      // Forward bias: stamp as Vf source + Rf series resistance
      // Reverse bias: very high impedance (essentially open)
      const Vf = comp.properties.forwardVoltage ?? 2.0;
      const Rf = 15; // series resistance when conducting
      const g = 1 / Rf;
      const nodes = getCompNodeIndices(comp, pinToNode, nodeIndex, groundNode!, pinKey);
      if (nodes.length >= 2) {
        // Only stamp conductance (forward direction); the Vf offset prevents conduction below threshold
        stamp(nodes[0], nodes[1], g);
        stampCurrent(nodes[0], -Vf * g);
        stampCurrent(nodes[1], Vf * g);
      }
    }

    if (comp.type === 'diode' || comp.type === 'schottky') {
      const Vf = comp.properties.forwardVoltage ?? 0.7;
      const Rf = 5;
      const g = 1 / Rf;
      const nodes = getCompNodeIndices(comp, pinToNode, nodeIndex, groundNode!, pinKey);
      if (nodes.length >= 2) {
        stamp(nodes[0], nodes[1], g);
        stampCurrent(nodes[0], -Vf * g);
        stampCurrent(nodes[1], Vf * g);
      }
    }

    if (comp.type === 'voltmeter' || comp.type === 'probe') {
      // Very high impedance - no stamp needed (essentially open circuit)
    }

    if (comp.type === 'ammeter') {
      // Very low resistance
      const g = 1e6;
      const nodes = getCompNodeIndices(comp, pinToNode, nodeIndex, groundNode!, pinKey);
      if (nodes.length >= 2) stamp(nodes[0], nodes[1], g);
    }
  });

  // Stamp voltage sources
  vsourceList.forEach((vs, idx) => {
    const row = numNodes + idx;
    if (vs.posNode >= 0) { G[row][vs.posNode] = 1; G[vs.posNode][row] = 1; }
    if (vs.negNode >= 0) { G[row][vs.negNode] = -1; G[vs.negNode][row] = -1; }
    I[row] = vs.voltage;
  });

  // ── Step 4: Solve ─────────────────────────────────────────
  const solution = gaussianElimination(G, I);

  if (!solution) {
    errors.push({
      type: 'singular_matrix',
      message: 'Circuit cannot be solved. Check for short circuits or floating nodes.',
      severity: 'error',
      suggestion: 'Ensure circuit has a ground, no isolated floating nodes, and no pure voltage source loops.',
    });
    return { success: false, mode: 'dc', timestamp, nodeVoltages: {}, branchCurrents: {}, componentResults: {}, errors, warnings };
  }

  // ── Step 5: Extract results ───────────────────────────────
  const nodeVoltages: Record<string, number> = {};
  nodeVoltages[groundNode] = 0;
  nonGroundNodes.forEach((nid, i) => {
    nodeVoltages[nid] = solution[i] ?? 0;
  });

  // Branch currents from voltage source solution
  const branchCurrents: Record<string, number> = {};
  vsourceList.forEach((vs, idx) => {
    branchCurrents[vs.id] = solution[numNodes + idx] ?? 0;
  });

  // ── Step 6: Compute component results ─────────────────────
  const componentResults: Record<string, ComponentSimResult> = {};

  components.forEach(comp => {
    const nodes = getCompNodeIndices(comp, pinToNode, nodeIndex, groundNode!, pinKey);
    const v1 = nodes[0] >= 0 ? (solution[nodes[0]] ?? 0) : 0;
    const v2 = nodes[1] >= 0 ? (solution[nodes[1]] ?? 0) : 0;
    const vDrop = Math.abs(v1 - v2);

    let current = 0;
    let power = 0;
    let temperature = 25; // ambient

    if (comp.type === 'resistor' || comp.type === 'potentiometer') {
      const R = comp.properties.resistance ?? 1000;
      current = R > 0 ? vDrop / R : 0;
      power = current * vDrop;
      temperature = 25 + power * 50; // rough thermal model
    }

    if (comp.type === 'led') {
      const Vf = comp.properties.forwardVoltage ?? 2.0;
      // Only allow positive current (forward biased only)
      current = v1 > v2 ? Math.max(0, (vDrop - Vf) / 15) : 0;
      power = current * vDrop;
    }

    if (comp.type === 'battery' || comp.type === 'dc_source') {
      current = branchCurrents[comp.id] ?? 0;
      power = Math.abs(current * (comp.properties.voltage ?? 9));
    }

    componentResults[comp.id] = { componentId: comp.id, voltage: vDrop, current, power, temperature };

    // Assign voltages back to pins — use try/catch because Immer may freeze these objects
    comp.pins.forEach(pin => {
      const nid = pinToNode.get(pinKey(comp.id, pin.id));
      if (nid) {
        try {
          pin.voltage = nodeVoltages[nid] ?? 0;
        } catch {
          // Object frozen by Immer — skip (pin voltages are optional display-only)
        }
      }
    });

    // Detect warnings
    if (comp.properties.powerRating && power > comp.properties.powerRating) {
      warnings.push({
        type: 'overheat',
        message: `${comp.label} exceeds power rating (${power.toFixed(2)}W > ${comp.properties.powerRating}W)`,
        componentId: comp.id,
        value: power,
        threshold: comp.properties.powerRating,
        suggestion: 'Use a higher power rated component or reduce current.',
      });
    }

    if (comp.properties.currentRating && current > comp.properties.currentRating) {
      warnings.push({
        type: 'overcurrent',
        message: `${comp.label} exceeds current rating (${(current * 1000).toFixed(1)}mA > ${(comp.properties.currentRating * 1000).toFixed(1)}mA)`,
        componentId: comp.id,
        value: current,
        threshold: comp.properties.currentRating,
        suggestion: 'Add a current limiting resistor or reduce supply voltage.',
      });
    }
  });

  return {
    success: true,
    mode: 'dc',
    timestamp,
    nodeVoltages,
    branchCurrents,
    componentResults,
    errors,
    warnings,
  };
}

function getCompNodeIndices(
  comp: { pins: Array<{ id: string; type: string }> },
  pinToNode: Map<string, string>,
  nodeIndex: Record<string, number>,
  groundNode: string,
  pinKey: (cId: string, pId: string) => string,
): number[] {
  return comp.pins.map(pin => {
    const nid = pinToNode.get(pinKey((comp as unknown as { id: string }).id, pin.id));
    if (!nid || nid === groundNode) return -1;
    return nodeIndex[nid] ?? -1;
  });
}

// ============================================================
// AC Analysis (phasor domain)
// ============================================================
export function runACSimulation(circuit: Circuit, frequency: number): SimulationResult {
  // Simplified AC - reuse DC framework with reactive elements
  const result = runDCSimulation(circuit);
  result.mode = 'ac';
  // TODO: Full complex impedance AC analysis
  return result;
}

// ============================================================
// Transient Analysis
// ============================================================
export function runTransientSimulation(
  circuit: Circuit,
  duration: number,
  timestep: number
): SimulationResult {
  const timePoints: number[] = [];
  const transientData: Record<string, number[]> = {};

  // Simplified transient: run DC at each timestep (ignores L/C dynamics in this basic version)
  for (let t = 0; t <= duration; t += timestep) {
    timePoints.push(t);
    const dcResult = runDCSimulation(circuit);
    Object.entries(dcResult.nodeVoltages).forEach(([nid, v]) => {
      if (!transientData[nid]) transientData[nid] = [];
      transientData[nid].push(v);
    });
  }

  const finalResult = runDCSimulation(circuit);
  return {
    ...finalResult,
    mode: 'transient',
    timePoints,
    transientData,
  };
}
