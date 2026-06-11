/**
 * Collapsible Right Sidebar
 * States: expanded (288px) → collapsed icon rail (48px) → hidden
 */
import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';
import PropertiesPanel from '@/components/panels/PropertiesPanel';
import SimulationPanel from '@/components/panels/SimulationPanel';
import ErrorPanel from '@/components/panels/ErrorPanel';
import InstrumentPanel from '@/components/instruments/InstrumentPanel';
import {
  ChevronLeft, ChevronRight,
  SlidersHorizontal, Activity, Gauge, AlertTriangle,
} from 'lucide-react';

type TabId = 'properties' | 'simulation' | 'instruments' | 'errors';

const TABS: Array<{ id: TabId; icon: React.ReactNode; label: string }> = [
  { id: 'properties',  icon: <SlidersHorizontal size={15} />, label: 'Properties' },
  { id: 'simulation',  icon: <Activity size={15} />,          label: 'Simulation' },
  { id: 'instruments', icon: <Gauge size={15} />,             label: 'Instruments' },
  { id: 'errors',      icon: <AlertTriangle size={15} />,     label: 'Errors / Check' },
];

export default function RightSidebar() {
  const {
    propertiesPanelOpen, rightPanelCollapsed,
    setPropertiesPanelOpen, setRightPanelCollapsed,
    activeTab, setActiveTab,
  } = useUIStore();
  const simResult = useCircuitStore(s => s.simulationResult);
  const errorCount = simResult?.errors.length ?? 0;
  const warnCount  = simResult?.warnings.length ?? 0;

  if (!propertiesPanelOpen) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'simulation':  return <SimulationPanel />;
      case 'instruments': return <InstrumentPanel />;
      case 'errors':      return <ErrorPanel />;
      default:            return <PropertiesPanel />;
    }
  };

  // ── Expanded mode ──────────────────────────────────────────
  if (!rightPanelCollapsed) {
    return (
      <aside
        className="panel border-l border-[#2a2d3e] flex flex-col overflow-hidden transition-all duration-200"
        style={{ width: 288, flexShrink: 0 }}
      >
        {/* Tab bar + collapse button */}
        <div className="flex items-center border-b border-[#2a2d3e]" style={{ height: 36 }}>
          <div className="flex flex-1 h-full">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const hasBadge = tab.id === 'errors' && (errorCount > 0 || warnCount > 0);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`relative flex items-center justify-center flex-1 h-full transition-colors ${
                    isActive ? 'text-blue-400 bg-blue-500/5 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-300 hover:bg-white/4'
                  }`}
                >
                  {tab.icon}
                  {hasBadge && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                      style={{ background: errorCount > 0 ? '#ef4444' : '#f59e0b' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setRightPanelCollapsed(true)}
            title="Collapse to icon rail"
            className="w-9 h-full flex items-center justify-center border-l border-[#2a2d3e] text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors flex-shrink-0"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Active tab label */}
        <div className="px-3 py-1.5 border-b border-[#1a1d2a]">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
            {TABS.find(t => t.id === activeTab)?.label}
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </aside>
    );
  }

  // ── Collapsed icon-rail mode ───────────────────────────────
  return (
    <aside
      className="panel border-l border-[#2a2d3e] flex flex-col overflow-hidden transition-all duration-200"
      style={{ width: 48, flexShrink: 0 }}
    >
      {/* Expand button */}
      <button
        onClick={() => setRightPanelCollapsed(false)}
        title="Expand panel"
        className="flex items-center justify-center w-full h-10 border-b border-[#2a2d3e] text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
      >
        <ChevronLeft size={13} />
      </button>

      {/* Tab icons */}
      <div className="flex flex-col items-center py-1 gap-0.5">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const hasBadge = tab.id === 'errors' && (errorCount > 0 || warnCount > 0);
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setRightPanelCollapsed(false); }}
              title={tab.label}
              className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                isActive ? 'bg-blue-500/15 text-blue-400' : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {hasBadge && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: errorCount > 0 ? '#ef4444' : '#f59e0b' }}
                />
              )}
              {/* Active indicator */}
              {isActive && (
                <span className="absolute right-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-l" />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
