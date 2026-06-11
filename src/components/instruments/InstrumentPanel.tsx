import { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';
import { Zap, Activity, Cpu, BarChart2 } from 'lucide-react';

export default function InstrumentPanel() {
  const { activeInstrument, setActiveInstrument } = useUIStore();

  return (
    <div className="flex flex-col h-full">
      {/* Instrument selector */}
      <div className="p-2 border-b border-[#2a2d3e] flex gap-1">
        {[
          { id: 'multimeter' as const, icon: <Zap size={13} />, label: 'DMM' },
          { id: 'oscilloscope' as const, icon: <Activity size={13} />, label: 'Scope' },
          { id: 'power_meter' as const, icon: <BarChart2 size={13} />, label: 'Power' },
        ].map(instr => (
          <button
            key={instr.id}
            onClick={() => setActiveInstrument(instr.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors flex-1 justify-center ${
              activeInstrument === instr.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            {instr.icon} {instr.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeInstrument === 'multimeter' && <Multimeter />}
        {activeInstrument === 'oscilloscope' && <Oscilloscope />}
        {activeInstrument === 'power_meter' && <PowerMeter />}
        {!activeInstrument && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-xs text-center p-4">
            <Cpu size={24} className="mb-2 opacity-30" />
            <p>Select an instrument above</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Digital Multimeter ────────────────────────────────────────
function Multimeter() {
  const simResult = useCircuitStore(s => s.simulationResult);
  const [mode, setMode] = useState<'voltage' | 'current' | 'resistance'>('voltage');

  const nodeVoltages = simResult?.nodeVoltages ?? {};
  const branchCurrents = simResult?.branchCurrents ?? {};
  const circuit = useCircuitStore(s => s.circuit);

  // Pick a sample reading
  const voltageReading = Object.values(nodeVoltages).find(v => v !== 0) ?? 0;
  const currentReading = Object.values(branchCurrents)[0] ?? 0;

  return (
    <div className="p-3">
      {/* DMM display */}
      <div className="bg-[#020c02] border border-[#1a3a1a] rounded-lg p-4 mb-3 font-mono text-center">
        <div className="text-xs text-gray-600 mb-1 uppercase tracking-widest">{mode}</div>
        <div className="text-3xl font-bold text-green-400 tabular-nums">
          {mode === 'voltage' ? formatVolts(voltageReading) : mode === 'current' ? formatAmps(currentReading) : '∞ Ω'}
        </div>
        <div className="text-xs text-green-700 mt-1">AUTO RANGE</div>
      </div>

      {/* Mode buttons */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {(['voltage', 'current', 'resistance'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`py-1.5 rounded text-xs font-medium transition-colors ${
              mode === m ? 'bg-green-900/40 text-green-400 border border-green-500/30' : 'bg-[#0f1117] text-gray-500 hover:text-gray-300 border border-[#2a2d3e]'
            }`}
          >
            {m === 'voltage' ? 'V' : m === 'current' ? 'A' : 'Ω'}
          </button>
        ))}
      </div>

      {/* Node readings */}
      {Object.keys(nodeVoltages).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">All Nodes</p>
          <div className="bg-[#0a0c14] rounded p-2 max-h-40 overflow-y-auto space-y-1">
            {Object.entries(nodeVoltages).map(([n, v]) => (
              <div key={n} className="flex justify-between text-xs">
                <span className="text-gray-600 font-mono">{n}</span>
                <span className="text-green-400 font-mono">{formatVolts(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!simResult && (
        <p className="text-xs text-gray-600 text-center py-2">Run simulation to see readings</p>
      )}
    </div>
  );
}

// ── Oscilloscope ──────────────────────────────────────────────
function Oscilloscope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simResult = useCircuitStore(s => s.simulationResult);
  const [timebase, setTimebase] = useState(0.001); // 1ms/div

  // Generate waveform data
  const nodeVoltages = simResult?.nodeVoltages ?? {};
  const maxV = Math.max(...Object.values(nodeVoltages).map(Math.abs), 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#020c02';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#0a2a0a';
    ctx.lineWidth = 1;
    const gridCols = 10;
    const gridRows = 8;
    for (let i = 0; i <= gridCols; i++) {
      ctx.beginPath();
      ctx.moveTo((i / gridCols) * w, 0);
      ctx.lineTo((i / gridCols) * w, h);
      ctx.stroke();
    }
    for (let i = 0; i <= gridRows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i / gridRows) * h);
      ctx.lineTo(w, (i / gridRows) * h);
      ctx.stroke();
    }

    // Draw signals for each non-ground node
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#a78bfa'];
    Object.entries(nodeVoltages).slice(0, 4).forEach(([nodeId, voltage], idx) => {
      if (Math.abs(voltage) < 0.001) return;
      const color = colors[idx];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      // Simple sinusoidal representation for visualization
      for (let x = 0; x < w; x++) {
        const t = x / w;
        const y = h / 2 - (voltage / maxV) * (h / 2 - 10) * Math.cos(t * Math.PI * 2);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Label
      ctx.fillStyle = color;
      ctx.font = '9px monospace';
      ctx.fillText(`${nodeId}: ${voltage.toFixed(2)}V`, 4, 12 + idx * 12);
    });

    // Time axis
    ctx.strokeStyle = '#1a4a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, [simResult, nodeVoltages, maxV]);

  return (
    <div className="p-3">
      <canvas ref={canvasRef} width={240} height={160} className="w-full rounded border border-[#1a3a1a]" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-600 mb-1">Timebase</p>
          <select
            value={timebase}
            onChange={e => setTimebase(parseFloat(e.target.value))}
            className="prop-input text-xs"
          >
            <option value={0.0001}>0.1ms/div</option>
            <option value={0.001}>1ms/div</option>
            <option value={0.01}>10ms/div</option>
            <option value={0.1}>100ms/div</option>
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">V/div</p>
          <select className="prop-input text-xs">
            <option>1V/div</option>
            <option>2V/div</option>
            <option>5V/div</option>
            <option>10V/div</option>
          </select>
        </div>
      </div>
      {!simResult && (
        <p className="text-xs text-gray-600 text-center mt-3">Run simulation to see waveforms</p>
      )}
    </div>
  );
}

// ── Power Meter ───────────────────────────────────────────────
function PowerMeter() {
  const simResult = useCircuitStore(s => s.simulationResult);
  const circuit = useCircuitStore(s => s.circuit);

  const compResults = simResult?.componentResults ?? {};
  const totalPower = Object.values(compResults).reduce((sum, r) => sum + r.power, 0);
  const maxPower = Math.max(...Object.values(compResults).map(r => r.power), 0.001);

  return (
    <div className="p-3">
      <div className="bg-[#0a0c14] rounded p-3 mb-3 text-center">
        <p className="text-xs text-gray-600 mb-1">Total Power Consumption</p>
        <p className="text-2xl font-bold text-yellow-400 font-mono">{formatPower(totalPower)}</p>
      </div>

      {Object.entries(compResults)
        .filter(([, r]) => r.power > 0)
        .sort(([, a], [, b]) => b.power - a.power)
        .map(([id, r]) => {
          const comp = circuit.components[id];
          const pct = (r.power / maxPower) * 100;
          return (
            <div key={id} className="mb-2">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-400">{comp?.label ?? id.slice(0, 8)}</span>
                <span className="text-yellow-400 font-mono">{formatPower(r.power)}</span>
              </div>
              <div className="h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-yellow-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

      {!simResult && (
        <p className="text-xs text-gray-600 text-center py-4">Run simulation to measure power</p>
      )}
    </div>
  );
}

function formatVolts(v: number): string {
  if (Math.abs(v) < 0.001) return '0.000 V';
  if (Math.abs(v) < 1) return `${(v * 1000).toFixed(1)} mV`;
  return `${v.toFixed(3)} V`;
}

function formatAmps(a: number): string {
  if (Math.abs(a) < 1e-9) return '0.000 A';
  if (Math.abs(a) < 1e-3) return `${(a * 1e6).toFixed(2)} μA`;
  if (Math.abs(a) < 1) return `${(a * 1e3).toFixed(2)} mA`;
  return `${a.toFixed(3)} A`;
}

function formatPower(w: number): string {
  if (w < 1e-6) return '0.00 μW';
  if (w < 1e-3) return `${(w * 1e6).toFixed(2)} μW`;
  if (w < 1) return `${(w * 1e3).toFixed(2)} mW`;
  return `${w.toFixed(3)} W`;
}
