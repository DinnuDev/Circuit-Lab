import { useState, useMemo } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { COMPONENT_DEFINITIONS, CATEGORY_META, searchComponents } from '@/data/componentLibrary';
import { useDragContext } from '@/context/DragContext';
import { formatSI } from '@/utils/format';
import type { ComponentDefinition } from '@/types';
import { Search, ChevronDown, Plus } from 'lucide-react';

const RECENTLY_USED_KEY = 'circuit_recently_used';
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTLY_USED_KEY) ?? '[]'); } catch { return []; }
}
function addRecent(type: string) {
  const r = getRecent().filter(t => t !== type);
  r.unshift(type);
  localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(r.slice(0, 8)));
}

export default function ComponentLibraryPanel({ hideHeader, categoryFilter }: {
  hideHeader?: boolean;
  categoryFilter?: string;
} = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['passive', 'power', 'semiconductor'])
  );
  const { addComponent } = useCircuitStore();
  const { snapToGrid, gridSize } = useUIStore();
  const { viewport } = useCircuitStore(s => s.circuit);
  const { startDrag, endDrag } = useDragContext();

  const searchResults = useMemo(() => searchComponents(searchQuery), [searchQuery]);
  const recentTypes = getRecent();
  const recentDefs = recentTypes
    .map(t => COMPONENT_DEFINITIONS[t as keyof typeof COMPONENT_DEFINITIONS])
    .filter(Boolean) as ComponentDefinition[];

  const categorized = useMemo(() => {
    const map: Record<string, ComponentDefinition[]> = {};
    searchResults.forEach(def => {
      if (categoryFilter && def.category !== categoryFilter) return;
      if (!map[def.category]) map[def.category] = [];
      map[def.category].push(def);
    });
    return map;
  }, [searchResults, categoryFilter]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, def: ComponentDefinition) => {
    e.dataTransfer.setData('application/circuit-component', def.type);
    e.dataTransfer.effectAllowed = 'copy';
    startDrag(def, e);
  };

  const placeOnCanvas = (def: ComponentDefinition) => {
    const state = useCircuitStore.getState();
    const allComps = Object.values(state.circuit.components);
    
    // Visible canvas center
    const cx0 = -viewport.x / viewport.zoom + 400 / viewport.zoom;
    const cy0 = -viewport.y / viewport.zoom + 300 / viewport.zoom;

    const STEP = snapToGrid ? gridSize * 4 : 80;    // spacing between slots
    const MIN_DIST = STEP * 0.9;                     // minimum distance to consider "occupied"

    // Spiral outward from center to find a free slot
    const snapPt = (x: number, y: number) => snapToGrid
      ? { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize }
      : { x, y };

    const isFree = (x: number, y: number): boolean => {
      return !allComps.some(c => {
        const dx = c.position.x - x;
        const dy = c.position.y - y;
        return Math.sqrt(dx * dx + dy * dy) < MIN_DIST;
      });
    };

    // Try center first
    const center = snapPt(cx0, cy0);
    if (isFree(center.x, center.y)) {
      addComponent(def.type as never, center);
      addRecent(def.type);
      return;
    }

    // Spiral search: rings of increasing radius
    for (let ring = 1; ring <= 10; ring++) {
      const r = ring * STEP;
      // Try 8 directions per ring, then more as ring grows
      const steps = ring * 4;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const candidate = snapPt(cx0 + r * Math.cos(angle), cy0 + r * Math.sin(angle));
        if (isFree(candidate.x, candidate.y)) {
          addComponent(def.type as never, candidate);
          addRecent(def.type);
          return;
        }
      }
    }

    // Fallback: place offset from last component
    const lastComp = allComps[allComps.length - 1];
    const fallback = snapPt(
      (lastComp?.position.x ?? cx0) + STEP,
      (lastComp?.position.y ?? cy0),
    );
    addComponent(def.type as never, fallback);
    addRecent(def.type);
  };

  return (
    <div className="flex flex-col h-full select-none">
      {!hideHeader && <div className="panel-header">Components</div>}

      {/* Search */}
      <div className="p-2 border-b border-[#2a2d3e]">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full pl-7 pr-6 py-1.5 bg-[#0a0c14] border border-[#2a2d3e] rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-sm leading-none">×</button>
          )}
        </div>
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto">
        {/* Recently used */}
        {!searchQuery && recentDefs.length > 0 && (
          <div className="px-2 py-2 border-b border-[#1e2030]">
            <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-1.5 px-1">Recent</p>
            <div className="flex flex-wrap gap-1">
              {recentDefs.map(def => (
                <button
                  key={def.type}
                  onClick={() => placeOnCanvas(def)}
                  draggable
                  onDragStart={e => handleDragStart(e, def)}
                  onDragEnd={endDrag}
                  title={def.description}
                  className="flex items-center gap-1 px-2 py-1 bg-[#1a1d2a] hover:bg-[#1e2235] border border-[#2a2d3e] hover:border-blue-500/50 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-all cursor-grab group"
                >
                  <svg viewBox="-30 -16 60 32" width="22" height="14" className="text-gray-500 group-hover:text-blue-400">
                    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="currentColor"
                      dangerouslySetInnerHTML={{ __html: def.symbol }} />
                  </svg>
                  <span>{def.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {Object.entries(categorized).map(([category, defs]) => {
          const meta = CATEGORY_META[category];
          const isExpanded = expandedCategories.has(category);
          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors group"
              >
                <ChevronDown size={11} className={`text-gray-600 group-hover:text-gray-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-300 flex-1 text-left uppercase tracking-widest">
                  {meta?.label ?? category}
                </span>
                <span className="text-xs text-gray-700 bg-[#1a1d2a] px-1.5 py-0.5 rounded-full">{defs.length}</span>
              </button>
              {isExpanded && (
                <div className="pb-1 px-1">
                  {defs.map(def => (
                    <ComponentItem
                      key={def.type}
                      def={def}
                      onDragStart={handleDragStart}
                      onDragEnd={endDrag}
                      onPlace={placeOnCanvas}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-1.5 border-t border-[#1e2030] text-xs text-gray-700 text-center">
        Drag · Double-click · Click +
      </div>
    </div>
  );
}

function ComponentItem({
  def, onDragStart, onDragEnd, onPlace,
}: {
  def: ComponentDefinition;
  onDragStart: (e: React.DragEvent, def: ComponentDefinition) => void;
  onDragEnd: () => void;
  onPlace: (def: ComponentDefinition) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => { setIsDragging(true); onDragStart(e, def); addRecent(def.type); }}
      onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => { onPlace(def); }}
      className={`
        relative flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-150 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-30 scale-95' : ''}
        ${hovered ? 'bg-[#171b2c] border border-[#2d3555] shadow-lg shadow-blue-900/10' : 'border border-transparent'}
      `}
    >
      {/* Symbol preview box */}
      <div className={`w-12 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all ${hovered ? 'bg-blue-500/10 ring-1 ring-blue-500/20' : 'bg-[#0f1117]'}`}>
        <svg viewBox="-35 -18 70 36" width="46" height="30"
          className={`transition-colors ${hovered ? 'text-blue-300' : 'text-gray-500'}`}>
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            color="currentColor" dangerouslySetInnerHTML={{ __html: def.symbol }} />
        </svg>
      </div>

      {/* Text info */}
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold truncate transition-colors ${hovered ? 'text-white' : 'text-gray-300'}`}>
          {def.label}
        </div>
        <div className="text-xs text-gray-600 truncate leading-tight">{def.description}</div>
        {formatDefaultValue(def) && (
          <div className={`text-xs font-mono mt-0.5 transition-colors ${hovered ? 'text-blue-400' : 'text-gray-700'}`}>
            {formatDefaultValue(def)}
          </div>
        )}
      </div>

      {/* Quick add */}
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onPlace(def); }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white transition-all"
          title="Add to canvas"
        >
          <Plus size={11} />
        </button>
      )}
    </div>
  );
}

function formatDefaultValue(def: ComponentDefinition): string {
  const p = def.defaultProperties;
  if (p.inductance !== undefined)  return formatSI(p.inductance, 'H');
  if (p.capacitance !== undefined) return formatSI(p.capacitance, 'F');
  if (p.resistance !== undefined)  return formatSI(p.resistance, 'Ω');
  if (p.voltage !== undefined)     return `${p.voltage}V`;
  if (p.frequency !== undefined)   return formatSI(p.frequency, 'Hz');
  if (p.currentRating !== undefined) return formatSI(p.currentRating, 'A max');
  return '';
}
