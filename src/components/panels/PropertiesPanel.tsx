import { useState, useCallback } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { COMPONENT_DEFINITIONS } from '@/data/componentLibrary';
import { Trash2, RotateCw, FlipHorizontal, Copy, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import type { CircuitComponent } from '@/types';

// ── SI formatting ─────────────────────────────────────────────
function formatSI(value: number, unit: string): string {
  if (!isFinite(value)) return `${value}${unit}`;
  const abs = Math.abs(value);
  if (abs === 0) return `0${unit}`;
  if (abs >= 1e9)  return `${+(value / 1e9).toPrecision(4)}G${unit}`;
  if (abs >= 1e6)  return `${+(value / 1e6).toPrecision(4)}M${unit}`;
  if (abs >= 1e3)  return `${+(value / 1e3).toPrecision(4)}k${unit}`;
  if (abs >= 1)    return `${+value.toPrecision(4)}${unit}`;
  if (abs >= 1e-3) return `${+(value * 1e3).toPrecision(4)}m${unit}`;
  if (abs >= 1e-6) return `${+(value * 1e6).toPrecision(4)}μ${unit}`;
  if (abs >= 1e-9) return `${+(value * 1e9).toPrecision(4)}n${unit}`;
  return `${+(value * 1e12).toPrecision(4)}p${unit}`;
}

function parseSI(raw: string): number {
  const s = raw.trim().replace(/,/g, '');
  const m = s.match(/^([+-]?\d*\.?\d+)\s*([GMkmunpμ]?)([^0-9]*)$/i);
  if (!m) return parseFloat(s);
  const num = parseFloat(m[1]);
  const pfx: Record<string, number> = { G:1e9, M:1e6, k:1e3, K:1e3, m:1e-3, u:1e-6, μ:1e-6, n:1e-9, p:1e-12 };
  return num * (pfx[m[2]] ?? 1);
}

// ── Colour helpers ────────────────────────────────────────────
function tempColor(t: number) {
  if (t > 85) return 'text-red-400';
  if (t > 60) return 'text-orange-400';
  if (t > 40) return 'text-yellow-400';
  return 'text-emerald-400';
}

// ─────────────────────────────────────────────────────────────
export default function PropertiesPanel() {
  const { circuit, selection } = useCircuitStore();

  const selectedComponents = selection.componentIds.map(id => circuit.components[id]).filter(Boolean);
  const selectedWires = selection.wireIds.map(id => circuit.wires[id]).filter(Boolean);

  if (selectedComponents.length === 0 && selectedWires.length === 0) return <CanvasPanel />;
  if (selectedComponents.length === 1) return <ComponentProperties comp={selectedComponents[0]} />;
  if (selectedComponents.length > 1) return <MultiSelectionPanel comps={selectedComponents} />;
  if (selectedWires.length >= 1) return <WireProperties wire={selectedWires[0]} />;
  return null;
}

// ── Canvas panel (nothing selected) ──────────────────────────
function CanvasPanel() {
  const {
    showGrid, toggleGrid, showLabels, toggleLabels,
    showValues, toggleValues, showCurrentFlow, toggleCurrentFlow,
    showThermal, toggleThermal, snapToGrid, toggleSnapToGrid, gridSize, setGridSize,
  } = useUIStore();

  const toggles = [
    { label: 'Show Grid',     value: showGrid,        toggle: toggleGrid },
    { label: 'Snap to Grid',  value: snapToGrid,      toggle: toggleSnapToGrid },
    { label: 'Show Labels',   value: showLabels,      toggle: toggleLabels },
    { label: 'Show Values',   value: showValues,      toggle: toggleValues },
    { label: 'Current Flow',  value: showCurrentFlow, toggle: toggleCurrentFlow },
    { label: 'Thermal Map',   value: showThermal,     toggle: toggleThermal },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 pt-3 pb-1">
        <p style={{ fontStyle: 'italic', fontSize: '0.688rem', color: 'var(--text-subtle)' }}>
          Select a component to edit its properties
        </p>
      </div>

      <Section title="Canvas" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {toggles.map(t => (
            <label key={t.label} className="cl-toggle" style={{ justifyContent: 'space-between', padding: '4px 0' }}>
              <span className="cl-toggle__label">{t.label}</span>
              <input type="checkbox" checked={t.value} onChange={t.toggle} />
              <span className="cl-toggle__track" />
            </label>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.688rem', color: 'var(--text-muted)' }}>Grid Size</span>
            <select
              value={gridSize}
              onChange={e => setGridSize(Number(e.target.value))}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px',
                padding: '3px 8px', fontSize: '0.688rem', color: 'var(--text)', outline: 'none',
                cursor: 'pointer',
              }}
            >
              {[10, 20, 40, 80].map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Multi-selection panel ─────────────────────────────────────
function MultiSelectionPanel({ comps }: { comps: CircuitComponent[] }) {
  const { removeComponent, rotateComponent, duplicateSelected } = useCircuitStore();
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 text-sm font-bold">{comps.length}</div>
        <div>
          <div className="text-sm font-semibold text-white">Components Selected</div>
          <div className="text-xs text-gray-500">{comps.map(c => c.label).join(', ')}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <ActionBtn icon={<RotateCw size={12} />} label="Rotate All" onClick={() => comps.forEach(c => rotateComponent(c.id))} />
        <ActionBtn icon={<Copy size={12} />} label="Duplicate" onClick={duplicateSelected} />
        <ActionBtn icon={<Trash2 size={12} />} label="Delete All" onClick={() => comps.forEach(c => removeComponent(c.id))} danger />
      </div>
    </div>
  );
}

// ── Single component properties ───────────────────────────────
function ComponentProperties({ comp }: { comp: CircuitComponent }) {
  const { removeComponent, rotateComponent, flipComponent, updateComponentProperty, duplicateSelected, selectComponent } = useCircuitStore();
  const def = COMPONENT_DEFINITIONS[comp.type];
  const simData = useCircuitStore(s => s.simulationResult?.componentResults?.[comp.id]);
  const propFields = getPropertyFields(comp.type);

  const handleDuplicate = () => {
    selectComponent(comp.id);
    duplicateSelected();
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Header ─────────────────────────────── */}
      <div className="p-3 pb-2 border-b border-[#1e2030]">
        <div className="flex items-start gap-2.5 mb-2">
          {/* Symbol mini-preview */}
          <div className="w-12 h-10 flex-shrink-0 flex items-center justify-center bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
            <svg viewBox="-35 -18 70 36" width="44" height="30" className="text-blue-300">
              <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: def?.symbol ?? '' }} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{comp.label}</div>
            <div className="text-xs text-gray-500 truncate">{def?.description ?? comp.type}</div>
            <div className="text-xs text-gray-700 font-mono mt-0.5">{comp.type}</div>
          </div>
        </div>
        {/* Action buttons */}
        <div className="cl-comp-header__actions">
          <button className="cl-btn cl-btn--sm cl-btn--ghost" onClick={() => rotateComponent(comp.id)} title="Rotate (R)">
            <RotateCw size={11} /> Rotate
          </button>
          <button className="cl-btn cl-btn--sm cl-btn--ghost" onClick={() => flipComponent(comp.id)} title="Flip (F)">
            <FlipHorizontal size={11} /> Flip
          </button>
          <button className="cl-btn cl-btn--sm cl-btn--ghost" onClick={handleDuplicate} title="Duplicate (Ctrl+D)">
            <Copy size={11} /> Dupe
          </button>
          <button className="cl-btn cl-btn--sm cl-btn--danger" onClick={() => removeComponent(comp.id)} title="Delete (Del)">
            <Trash2 size={11} /> Del
          </button>
        </div>
      </div>

      {/* ── Label ──────────────────────────────── */}
      <div className="px-3 pt-3 pb-1">
        <FieldLabel label="Label" />
        <input
          value={comp.label}
          onChange={e => updateComponentProperty(comp.id, 'label', e.target.value)}
          className="w-full bg-[#0a0c14] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* ── Editable properties ─────────────────── */}
      {propFields.length > 0 && (
        <Section title="Properties" defaultOpen>
          {propFields.map(field => (
            <PropField key={field.key} field={field} comp={comp} onChange={updateComponentProperty} />
          ))}
        </Section>
      )}

      {/* ── Simulation results ───────────────────── */}
      {simData && (
        <Section title="Simulation" defaultOpen>
          <SimReadout label="Voltage" value={formatSI(simData.voltage, 'V')} accent="text-emerald-400" />
          <SimReadout label="Current" value={formatSI(simData.current, 'A')} accent="text-blue-400" />
          <SimReadout label="Power"   value={formatSI(simData.power, 'W')} accent="text-yellow-400" />
          <SimReadout
            label="Temperature"
            value={`${simData.temperature.toFixed(1)} °C`}
            accent={tempColor(simData.temperature)}
          />
          {/* Power bar */}
          {comp.properties.powerRating && (
            <div className="cl-power-bar">
              <div className="cl-power-bar__header">
                <span>Power dissipation</span>
                <span>{formatSI(simData.power, 'W')}</span>
              </div>
              <div className="cl-power-bar__track">
                <div
                  className={`cl-power-bar__fill ${simData.power / (comp.properties.powerRating ?? 0.25) > 0.9 ? 'cl-power-bar__fill--crit' : simData.power / (comp.properties.powerRating ?? 0.25) > 0.6 ? 'cl-power-bar__fill--warn' : ''}`}
                  style={{ width: `${Math.min(100, (simData.power / (comp.properties.powerRating ?? 0.25)) * 100)}%` }}
                />
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                Rated: {formatSI(comp.properties.powerRating, 'W')}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── Pin connectivity ──────────────────────── */}
      <Section title="Pins">
        {comp.pins.map(pin => (
          <div key={pin.id} className="cl-pin-row">
            <div className="cl-pin-row__left">
              <div className={`cl-pin-row__dot ${pin.connectedWireIds.length > 0 ? 'cl-pin-row__dot--connected' : 'cl-pin-row__dot--open'}`} />
              <span className="cl-pin-row__name">{pin.name}</span>
              <span className="cl-pin-row__type">({pin.type})</span>
            </div>
            <span className={`cl-pin-row__status ${pin.connectedWireIds.length > 0 ? 'cl-pin-row__status--connected' : 'cl-pin-row__status--open'}`}>
              {pin.connectedWireIds.length > 0 ? `${pin.connectedWireIds.length}×` : '—'}
            </span>
          </div>
        ))}
      </Section>

      {/* ── Position ──────────────────────────────── */}
      <Section title="Transform">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel label="X" />
            <input type="number" readOnly value={Math.round(comp.position.x)} className="w-full bg-[#0a0c14] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-gray-500 font-mono focus:outline-none" />
          </div>
          <div>
            <FieldLabel label="Y" />
            <input type="number" readOnly value={Math.round(comp.position.y)} className="w-full bg-[#0a0c14] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-gray-500 font-mono focus:outline-none" />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <FieldLabel label="Rotation" />
            <div className="flex items-center gap-1">
              <input type="number" readOnly value={comp.rotation} className="flex-1 bg-[#0a0c14] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-gray-500 font-mono focus:outline-none" />
              <span className="text-xs text-gray-600">°</span>
            </div>
          </div>
          <div>
            <FieldLabel label="Flip" />
            <div className={`mt-1 flex items-center gap-1 text-xs ${comp.flipped ? 'text-blue-400' : 'text-gray-600'}`}>
              <div className={`w-2 h-2 rounded-full ${comp.flipped ? 'bg-blue-500' : 'bg-gray-700'}`} />
              {comp.flipped ? 'Flipped' : 'Normal'}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Wire properties panel ─────────────────────────────────────
function WireProperties({ wire }: { wire: NonNullable<ReturnType<typeof useCircuitStore.getState>['circuit']['wires'][string]> }) {
  const { removeWire, circuit } = useCircuitStore();
  const fromComp = wire.fromComponentId ? circuit.components[wire.fromComponentId] : null;
  const toComp   = wire.toComponentId   ? circuit.components[wire.toComponentId]   : null;
  const len = wire.segments.reduce((s, seg) => {
    const dx = seg.end.x - seg.start.x, dy = seg.end.y - seg.start.y;
    return s + Math.sqrt(dx*dx + dy*dy);
  }, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 pb-2 border-b border-[#1e2030]">
        <div className="flex items-start gap-2.5 mb-2">
          <div className="w-12 h-10 flex-shrink-0 flex items-center justify-center bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
            <svg viewBox="0 0 44 10" width="44" height="10">
              <line x1="2" y1="5" x2="42" y2="5" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="2" cy="5" r="3" fill="#4b5563" />
              <circle cx="42" cy="5" r="3" fill="#4b5563" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Wire</div>
            <div className="text-xs text-gray-500">{wire.type} · {wire.segments.length} segment{wire.segments.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <ActionBtn icon={<Trash2 size={11} />} label="Delete Wire" onClick={() => removeWire(wire.id)} compact danger />
      </div>

      <Section title="Connections" defaultOpen>
        <ConnRow label="From" comp={fromComp} pinId={wire.fromPinId} />
        <ConnRow label="To"   comp={toComp}   pinId={wire.toPinId} />
      </Section>

      <Section title="Measurements" defaultOpen>
        <SimReadout label="Length"  value={`${Math.round(len)}px`}      accent="text-gray-400" />
        {wire.voltage !== undefined && <SimReadout label="Voltage" value={formatSI(wire.voltage, 'V')} accent="text-emerald-400" />}
        {wire.current !== undefined && <SimReadout label="Current" value={formatSI(wire.current, 'A')} accent="text-blue-400" />}
      </Section>
    </div>
  );
}

function ConnRow({ label, comp, pinId }: { label: string; comp: CircuitComponent | null; pinId?: string }) {
  const pin = comp?.pins.find(p => p.id === pinId);
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-600 w-8">{label}</span>
      {comp ? (
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-gray-300 font-semibold">{comp.label}</span>
          {pin && <span className="text-gray-600">· {pin.name}</span>}
        </div>
      ) : (
        <span className="text-xs text-gray-700">Unconnected</span>
      )}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="cl-panel-section">
      <button className="cl-section-heading" onClick={() => setOpen(v => !v)}>
        {title}
        {open
          ? <ChevronDown size={10} />
          : <ChevronRight size={10} />}
      </button>
      {open && <div style={{ padding: '4px 12px 12px' }}>{children}</div>}
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label style={{ display: 'block', fontSize: '0.688rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
      {label}
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <label className="cl-toggle" style={{ justifyContent: 'space-between', padding: '4px 0', width: '100%' }}>
      <span className="cl-toggle__label">{label}</span>
      <input type="checkbox" checked={value} onChange={onChange} />
      <span className="cl-toggle__track" />
    </label>
  );
}

function ActionBtn({
  icon, label, shortcut, onClick, compact, danger,
}: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void; compact?: boolean; danger?: boolean }) {
  const variant = danger ? 'cl-btn--danger' : 'cl-btn--ghost';
  return (
    <button
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`cl-btn ${compact ? 'cl-btn--sm' : 'cl-btn--md'} ${variant}`}
    >
      {icon} {label}
    </button>
  );
}

function SimReadout({ label, value, accent }: { label: string; value: string; accent: string }) {
  // Map Tailwind text- classes to SCSS modifier
  const mod = accent.includes('green') ? 'green'
    : accent.includes('blue') ? 'blue'
    : accent.includes('yellow') ? 'yellow'
    : accent.includes('red') ? 'red'
    : accent.includes('orange') ? 'orange'
    : 'muted';

  return (
    <div className="cl-readout">
      <span className="cl-readout__label">{label}</span>
      <span className={`cl-readout__value cl-readout__value--${mod}`}>{value}</span>
    </div>
  );
}

// ── Per-field property editor ──────────────────────────────────
function PropField({ field, comp, onChange }: {
  field: PropField;
  comp: CircuitComponent;
  onChange: (id: string, key: string, value: unknown) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [rawInput, setRawInput] = useState('');

  const rawVal = (comp.properties as Record<string, unknown>)[field.key];
  const numVal = typeof rawVal === 'number' ? rawVal : 0;

  const displayValue = focused ? rawInput : (
    field.unit ? formatSI(numVal, field.unit) : String(rawVal ?? '')
  );

  const handleFocus = () => {
    setFocused(true);
    setRawInput(field.unit ? String(numVal) : String(rawVal ?? ''));
  };

  const handleBlur = () => {
    setFocused(false);
    if (field.type === 'number' || field.unit) {
      const parsed = parseSI(rawInput);
      if (isFinite(parsed)) onChange(comp.id, field.key, parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLElement).blur();
    if (e.key === 'ArrowUp' && field.unit) {
      e.preventDefault();
      const step = field.step ?? 1;
      onChange(comp.id, field.key, numVal + step);
    }
    if (e.key === 'ArrowDown' && field.unit) {
      e.preventDefault();
      const step = field.step ?? 1;
      const next = numVal - step;
      if (field.min === undefined || next >= field.min) onChange(comp.id, field.key, next);
    }
  };

  return (
    <div>
      <FieldLabel label={field.unit ? `${field.label}` : field.label} />

      {field.type === 'boolean' ? (
        <label className="cl-toggle" style={{ padding: '4px 0' }}>
          <span className="cl-toggle__label">{rawVal ? 'Enabled' : 'Disabled'}</span>
          <input type="checkbox" checked={!!rawVal} onChange={() => onChange(comp.id, field.key, !rawVal)} />
          <span className="cl-toggle__track" />
        </label>
      ) : field.type === 'color' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
            <input
              type="color"
              value={String(rawVal ?? '#ffffff')}
              onChange={e => onChange(comp.id, field.key, e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid var(--border-2)', cursor: 'pointer',
              background: String(rawVal ?? '#fff'),
            }} />
          </div>
          <input
            type="text"
            value={String(rawVal ?? '')}
            onChange={e => onChange(comp.id, field.key, e.target.value)}
            className="cl-input"
            style={{ flex: 1 }}
          />
        </div>
      ) : field.type === 'select' ? (
        <select
          value={String(rawVal ?? '')}
          onChange={e => onChange(comp.id, field.key, e.target.value)}
          className="cl-input"
        >
          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <div
          className={`cl-input`}
          style={{
            display: 'flex', alignItems: 'center', padding: 0,
            boxShadow: focused ? '0 0 0 2px rgba(59,130,246,0.15)' : 'none',
          }}
        >
          <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={e => setRawInput(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem',
              color: 'var(--text)', padding: '5px 8px', minWidth: 0,
            }}
          />
          {field.unit && (
            <span style={{ fontSize: '0.688rem', color: 'var(--text-subtle)', paddingRight: 8, flexShrink: 0, fontFamily: 'monospace' }}>
              {field.unit}
            </span>
          )}
          {field.unit && (
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onMouseDown={e => { e.preventDefault(); onChange(comp.id, field.key, numVal + (field.step ?? 1)); }}
                style={{ padding: '2px 6px', fontSize: '9px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}
                className="hover:bg-white/5 hover:text-white transition-colors"
              >▲</button>
              <button
                onMouseDown={e => { e.preventDefault(); const next = numVal - (field.step ?? 1); if (field.min === undefined || next >= field.min) onChange(comp.id, field.key, next); }}
                style={{ padding: '2px 6px', fontSize: '9px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, borderTop: '1px solid var(--border)' }}
                className="hover:bg-white/5 hover:text-white transition-colors"
              >▼</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatCurrent(a: number): string {
  return formatSI(a, 'A');
}

function formatPower(w: number): string {
  return formatSI(w, 'W');
}

interface PropField {
  key: string;
  label: string;
  unit?: string;
  type?: 'number' | 'boolean' | 'select' | 'color' | 'text';
  step?: number;
  min?: number;
  options?: string[];
}

function getPropertyFields(type: string): PropField[] {
  const fields: Record<string, PropField[]> = {
    resistor: [
      { key: 'resistance',  label: 'Resistance',   unit: 'Ω', step: 100,   min: 0 },
      { key: 'tolerance',   label: 'Tolerance',    unit: '%', step: 1,     min: 0 },
      { key: 'powerRating', label: 'Power Rating', unit: 'W', step: 0.25,  min: 0 },
    ],
    potentiometer: [
      { key: 'resistance',  label: 'Max Resistance', unit: 'Ω', step: 1000, min: 0 },
      { key: 'powerRating', label: 'Power Rating',   unit: 'W', step: 0.25, min: 0 },
    ],
    capacitor: [
      { key: 'capacitance',   label: 'Capacitance',    unit: 'F', step: 1e-9, min: 0 },
      { key: 'voltageRating', label: 'Voltage Rating', unit: 'V', step: 5,    min: 0 },
      { key: 'esr',           label: 'ESR',            unit: 'Ω', step: 0.01, min: 0 },
    ],
    inductor: [
      { key: 'inductance',  label: 'Inductance',    unit: 'H', step: 1e-6, min: 0 },
      { key: 'resistance',  label: 'DC Resistance', unit: 'Ω', step: 0.1,  min: 0 },
    ],
    battery: [
      { key: 'voltage',  label: 'Voltage',  unit: 'V',   step: 0.5, min: 0 },
      { key: 'capacity', label: 'Capacity', unit: 'mAh', step: 100, min: 0 },
    ],
    dc_source: [{ key: 'voltage', label: 'Voltage', unit: 'V', step: 0.5 }],
    ac_source: [
      { key: 'voltage',   label: 'Amplitude',  unit: 'V',  step: 1,   min: 0 },
      { key: 'frequency', label: 'Frequency',  unit: 'Hz', step: 100, min: 0 },
    ],
    vcc: [{ key: 'voltage', label: 'Rail Voltage', unit: 'V', step: 0.1, min: 0 }],
    led: [
      { key: 'forwardVoltage', label: 'Forward Voltage', unit: 'V', step: 0.1, min: 0 },
      { key: 'currentRating',  label: 'Max Current',     unit: 'A', step: 0.001, min: 0 },
      { key: 'color',          label: 'Color',           type: 'color' },
    ],
    diode: [
      { key: 'forwardVoltage', label: 'Forward Voltage', unit: 'V', step: 0.01, min: 0 },
      { key: 'currentRating',  label: 'Max Current',     unit: 'A', step: 0.1,  min: 0 },
    ],
    zener: [
      { key: 'forwardVoltage', label: 'Zener Voltage', unit: 'V', step: 0.1, min: 0 },
      { key: 'currentRating',  label: 'Max Current',   unit: 'A', step: 0.001, min: 0 },
    ],
    switch_spst:  [{ key: 'isOpen', label: 'Open (OFF)',      type: 'boolean' }],
    push_button:  [{ key: 'isOpen', label: 'Open (Released)', type: 'boolean' }],
    fuse:         [{ key: 'currentRating', label: 'Current Rating', unit: 'A', step: 0.5, min: 0 }],
    motor_dc: [
      { key: 'voltage',       label: 'Rated Voltage', unit: 'V', step: 1, min: 0 },
      { key: 'currentRating', label: 'Rated Current', unit: 'A', step: 0.1, min: 0 },
      { key: 'rpm',           label: 'RPM',           step: 100, min: 0 },
    ],
    relay: [
      { key: 'voltage',       label: 'Coil Voltage',  unit: 'V', step: 1, min: 0 },
      { key: 'currentRating', label: 'Contact Rating',unit: 'A', step: 1, min: 0 },
    ],
    voltage_regulator: [
      { key: 'voltage',       label: 'Output Voltage', unit: 'V', step: 0.1, min: 0 },
      { key: 'currentRating', label: 'Max Current',    unit: 'A', step: 0.5, min: 0 },
    ],
    bjt_npn: [
      { key: 'currentRating', label: 'Max I_C', unit: 'A', step: 0.01, min: 0 },
      { key: 'voltageRating', label: 'V_CE max', unit: 'V', step: 5, min: 0 },
    ],
    bjt_pnp: [
      { key: 'currentRating', label: 'Max I_C', unit: 'A', step: 0.01, min: 0 },
      { key: 'voltageRating', label: 'V_CE max', unit: 'V', step: 5, min: 0 },
    ],
    mosfet_n: [
      { key: 'currentRating', label: 'Max I_D', unit: 'A', step: 1, min: 0 },
      { key: 'voltageRating', label: 'V_DS max', unit: 'V', step: 10, min: 0 },
    ],
    crystal: [
      { key: 'frequency', label: 'Frequency', unit: 'Hz', step: 1e6, min: 0 },
    ],
    buzzer: [
      { key: 'voltage',       label: 'Operating Voltage', unit: 'V',  step: 1, min: 0 },
      { key: 'currentRating', label: 'Current',           unit: 'A',  step: 0.001, min: 0 },
      { key: 'frequency',     label: 'Frequency',         unit: 'Hz', step: 100, min: 0 },
    ],
  };
  return fields[type] ?? [];
}
