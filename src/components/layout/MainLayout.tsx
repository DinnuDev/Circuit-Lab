import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';
import TopBar from '@/components/ui/TopBar';
import ComponentLibraryPanel from '@/components/toolbar/ComponentLibraryPanel';
import PropertiesPanel from '@/components/panels/PropertiesPanel';
import SchematicCanvas from '@/components/canvas/SchematicCanvas';
import Canvas3D from '@/components/canvas/Canvas3D';
import SplitView from '@/components/canvas/SplitView';
import BreadboardCanvas from '@/components/breadboard/BreadboardCanvas';
import StatusBar from '@/components/ui/StatusBar';
import ErrorPanel from '@/components/panels/ErrorPanel';
import SimulationPanel from '@/components/panels/SimulationPanel';
import InstrumentPanel from '@/components/instruments/InstrumentPanel';

export default function MainLayout() {
  const { viewMode, sidebarOpen, propertiesPanelOpen, activeTab } = useUIStore();

  const renderCanvas = () => {
    switch (viewMode) {
      case '2d': return <SchematicCanvas />;
      case '3d': return <Canvas3D />;
      case 'split': return <SplitView />;
      case 'breadboard': return <BreadboardCanvas />;
      default: return <SchematicCanvas />;
    }
  };

  const renderRightPanel = () => {
    switch (activeTab) {
      case 'properties': return <PropertiesPanel />;
      case 'simulation': return <SimulationPanel />;
      case 'instruments': return <InstrumentPanel />;
      case 'errors': return <ErrorPanel />;
      default: return <PropertiesPanel />;
    }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Component Library */}
        {sidebarOpen && (
          <aside className="w-64 flex-shrink-0 panel border-r border-[#2a2d3e] flex flex-col overflow-hidden">
            <ComponentLibraryPanel />
          </aside>
        )}

        {/* Canvas Area */}
        <main className="flex-1 relative overflow-hidden bg-[#0f1117]">
          {renderCanvas()}
        </main>

        {/* Right Sidebar — Properties / Simulation / Instruments */}
        {propertiesPanelOpen && (
          <aside className="w-72 flex-shrink-0 panel border-l border-[#2a2d3e] flex flex-col overflow-hidden">
            {/* Tab bar */}
            <RightPanelTabs />
            <div className="flex-1 overflow-auto">
              {renderRightPanel()}
            </div>
          </aside>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

function RightPanelTabs() {
  const { activeTab, setActiveTab } = useUIStore();
  const simulationResult = useCircuitStore(s => s.simulationResult);
  const hasErrors = (simulationResult?.errors.length ?? 0) > 0;
  const hasWarnings = (simulationResult?.warnings.length ?? 0) > 0;

  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'properties', label: 'Props' },
    { id: 'simulation', label: 'Sim' },
    { id: 'instruments', label: 'Meters' },
    { id: 'errors', label: hasErrors ? `Errors (${simulationResult?.errors.length})` : hasWarnings ? `Warn (${simulationResult?.warnings.length})` : 'Check' },
  ];

  return (
    <div className="flex border-b border-[#2a2d3e]">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5'
              : 'text-gray-500 hover:text-gray-300'
          } ${tab.id === 'errors' && hasErrors ? 'text-red-400' : ''} ${tab.id === 'errors' && !hasErrors && hasWarnings ? 'text-yellow-400' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
