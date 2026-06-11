import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { runDCSimulation, runACSimulation, runTransientSimulation } from '@/simulation/engine';
import { Play, Square, Activity } from 'lucide-react';

export default function SimulationPanel() {
  const { circuit, simulationResult, setSimulationResult, selection } = useCircuitStore();
  const { isSimulationRunning, setSimulationRunning, simulationMode, setSimulationMode } = useUIStore();
  const hasSelection = selection.componentIds.length > 0;

  const handleRun = (selectionOnly = false) => {
    setSimulationRunning(true);
    try {
      let targetCircuit = circuit;
      if (selectionOnly && hasSelection) {
        const selectedIds = new Set(selection.componentIds);
        const selectedWireIds = new Set(selection.wireIds);
        Object.values(circuit.wires).forEach(w => {
          if (w.fromComponentId && selectedIds.has(w.fromComponentId) &&
              w.toComponentId && selectedIds.has(w.toComponentId)) {
            selectedWireIds.add(w.id);
          }
        });
        const subComponents: typeof circuit.components = {};
        const subWires: typeof circuit.wires = {};
        selection.componentIds.forEach(id => { if (circuit.components[id]) subComponents[id] = circuit.components[id]; });
        selectedWireIds.forEach(id => { if (circuit.wires[id]) subWires[id] = circuit.wires[id]; });
        targetCircuit = { ...circuit, components: subComponents, wires: subWires };
      }

      let result;
      switch (simulationMode) {
        case 'ac':        result = runACSimulation(targetCircuit, 1000); break;
        case 'transient': result = runTransientSimulation(targetCircuit, 0.02, 0.0002); break;
        default:          result = runDCSimulation(targetCircuit);
      }
      setSimulationResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulationRunning(false);
    }
  };

  const result = simulationResult;
  const nodeVoltages = result?.nodeVoltages ?? {};
  const branchCurrents = result?.branchCurrents ?? {};

  return (
    <div className="p-3 space-y-4">
      {/* Mode selector */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Analysis Mode</h4>
        <div className="grid grid-cols-2 gap-1">
          {(['dc', 'ac', 'transient', 'logic'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSimulationMode(mode)}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                simulationMode === mode
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-[#0f1117] text-gray-500 hover:text-gray-300 border border-[#2a2d3e]'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Run buttons */}
      <div className="space-y-1.5">
        <button
          onClick={() => isSimulationRunning ? setSimulationRunning(false) : handleRun(false)}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isSimulationRunning
              ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
              : 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30'
          }`}
        >
          {isSimulationRunning
            ? <><Square size={13} fill="currentColor" /> Stop</>
            : <><Play size={13} fill="currentColor" /> Run Full Simulation</>}
        </button>

        {hasSelection && !isSimulationRunning && (
          <button
            onClick={() => handleRun(true)}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-blue-600/15 text-blue-400 border border-blue-500/25 hover:bg-blue-600/25"
          >
            <Activity size={12} /> Simulate Selection ({selection.componentIds.length} components)
          </button>
        )}
      </div>

      {/* Results summary */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${result.success ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">
              {result.success ? 'Simulation completed' : 'Simulation failed'}
            </span>
          </div>

          {/* Node voltages */}
          {Object.keys(nodeVoltages).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Node Voltages</h4>
              <div className="bg-[#0a0c14] rounded p-2 max-h-36 overflow-y-auto space-y-1">
                {Object.entries(nodeVoltages).map(([nodeId, v]) => (
                  <div key={nodeId} className="flex justify-between text-xs">
                    <span className="text-gray-600 font-mono">{nodeId}</span>
                    <span className="text-green-400 font-mono">{v.toFixed(4)} V</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branch currents */}
          {Object.keys(branchCurrents).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Source Currents</h4>
              <div className="bg-[#0a0c14] rounded p-2 space-y-1">
                {Object.entries(branchCurrents).map(([id, i]) => {
                  const comp = circuit.components[id];
                  return (
                    <div key={id} className="flex justify-between text-xs">
                      <span className="text-gray-600">{comp?.label ?? id.slice(0, 8)}</span>
                      <span className="text-blue-400 font-mono">{formatCurrent(i)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Power summary */}
          {result.componentResults && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Power Summary</h4>
              <div className="bg-[#0a0c14] rounded p-2 space-y-1">
                {Object.entries(result.componentResults)
                  .filter(([, r]) => r.power > 0.0001)
                  .sort(([, a], [, b]) => b.power - a.power)
                  .map(([id, r]) => {
                    const comp = circuit.components[id];
                    return (
                      <div key={id} className="flex justify-between text-xs">
                        <span className="text-gray-600">{comp?.label ?? id.slice(0, 8)}</span>
                        <span className="text-yellow-400 font-mono">{formatPower(r.power)}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {!result && (
        <div className="text-center py-6 text-gray-600 text-xs">
          <Activity size={24} className="mx-auto mb-2 opacity-30" />
          <p>Click Run to analyze the circuit</p>
        </div>
      )}
    </div>
  );
}

function formatCurrent(a: number): string {
  if (Math.abs(a) < 1e-9) return '0 A';
  if (Math.abs(a) < 1e-3) return `${(a * 1e6).toFixed(2)} μA`;
  if (Math.abs(a) < 1) return `${(a * 1e3).toFixed(2)} mA`;
  return `${a.toFixed(3)} A`;
}

function formatPower(w: number): string {
  if (w < 1e-3) return `${(w * 1e6).toFixed(1)} μW`;
  if (w < 1) return `${(w * 1e3).toFixed(2)} mW`;
  return `${w.toFixed(3)} W`;
}
