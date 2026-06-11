/**
 * Collapsible Left Sidebar
 * States: expanded (256px) → collapsed icon rail (48px) → hidden
 */
import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import ComponentLibraryPanel from '@/components/toolbar/ComponentLibraryPanel';
import { CATEGORY_META } from '@/data/componentLibrary';
import { useCircuitStore } from '@/store/circuitStore';
import { ChevronLeft, ChevronRight, Layers, Zap, ToggleLeft, Shield, Cpu, Triangle, CircuitBoard, GitMerge, Activity, Radio, Monitor, Gauge } from 'lucide-react';

// Map category to Lucide icon component
const CAT_ICONS: Record<string, React.ReactNode> = {
  passive:        <Layers size={15} />,
  power:          <Zap size={15} />,
  switching:      <ToggleLeft size={15} />,
  protection:     <Shield size={15} />,
  semiconductor:  <Cpu size={15} />,
  transistor:     <Triangle size={15} />,
  ic:             <CircuitBoard size={15} />,
  logic:          <GitMerge size={15} />,
  microcontroller:<Activity size={15} />,
  sensor:         <Radio size={15} />,
  actuator:       <Activity size={15} />,
  display:        <Monitor size={15} />,
  measurement:    <Gauge size={15} />,
};

const CATEGORIES = Object.keys(CATEGORY_META);

export default function LeftSidebar() {
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed } = useUIStore();
  const addComponent = useCircuitStore(s => s.addComponent);
  const viewport = useCircuitStore(s => s.circuit.viewport);
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Close flyout on outside click
  useEffect(() => {
    if (!hoverCat) return;
    const h = (e: MouseEvent) => {
      if (!flyoutRef.current?.contains(e.target as Node)) setHoverCat(null);
    };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [hoverCat]);

  if (!sidebarOpen) return null;

  // ── Expanded mode ──────────────────────────────────────────
  if (!sidebarCollapsed) {
    return (
      <aside
        className="panel border-r border-[#2a2d3e] flex flex-col overflow-hidden transition-all duration-200"
        style={{ width: 256, flexShrink: 0 }}
      >
        {/* Header with collapse button */}
        <div className="flex items-center justify-between panel-header pr-1">
          <span>Components</span>
          <button
            onClick={() => setSidebarCollapsed(true)}
            title="Collapse sidebar (icon rail)"
            className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ComponentLibraryPanel hideHeader />
        </div>
      </aside>
    );
  }

  // ── Collapsed icon-rail mode ───────────────────────────────
  return (
    <aside
      className="panel border-r border-[#2a2d3e] flex flex-col overflow-hidden relative transition-all duration-200"
      style={{ width: 48, flexShrink: 0 }}
    >
      {/* Expand button at top */}
      <button
        onClick={() => setSidebarCollapsed(false)}
        title="Expand component library"
        className="flex items-center justify-center w-full h-10 border-b border-[#2a2d3e] text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
      >
        <ChevronRight size={13} />
      </button>

      {/* Category icon buttons */}
      <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => {
          const meta = CATEGORY_META[cat];
          const isHovered = hoverCat === cat;
          return (
            <div key={cat} className="relative">
              <button
                onMouseEnter={() => setHoverCat(cat)}
                className={`
                  w-full flex items-center justify-center h-10 transition-colors relative
                  ${isHovered ? 'bg-[#1a1d2a] text-blue-300' : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'}
                `}
                title={meta?.label ?? cat}
              >
                {CAT_ICONS[cat] ?? <Layers size={15} />}
                {/* Active indicator line */}
                {isHovered && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-r" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Flyout panel for hovered category */}
      {hoverCat && (
        <div
          ref={flyoutRef}
          onMouseLeave={() => setHoverCat(null)}
          className="absolute left-full top-0 h-full z-50 panel border border-[#2a2d3e] shadow-xl shadow-black/50"
          style={{ width: 240, borderRadius: '0 8px 8px 0' }}
        >
          <div className="panel-header border-b border-[#2a2d3e]">
            {CATEGORY_META[hoverCat]?.label ?? hoverCat}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 32px)' }}>
            <ComponentLibraryPanel categoryFilter={hoverCat} hideHeader />
          </div>
        </div>
      )}
    </aside>
  );
}
