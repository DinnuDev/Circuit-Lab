import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { useAIStore } from '@/store/aiStore';
import { runDCSimulation } from '@/simulation/engine';
import {
  ZoomIn, ZoomOut, RotateCcw, Grid, Play, Square,
  PanelLeft, PanelRight, Cpu, Layers,
  Monitor, SplitSquareHorizontal, Layout, Save, FolderOpen,
  Undo2, Redo2, Sparkles, Activity, ChevronsLeft, ChevronsRight, Maximize2,
} from 'lucide-react';

export default function TopBar() {
  const { circuit, undo, redo, history, historyIndex, newCircuit, setSimulationResult } = useCircuitStore();
  const {
    viewMode, setViewMode,
    showGrid, toggleGrid,
    showCurrentFlow, toggleCurrentFlow,
    showLabels, toggleLabels,
    isSimulationRunning, setSimulationRunning,
    sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed, toggleSidebarCollapse,
    propertiesPanelOpen, rightPanelCollapsed, setPropertiesPanelOpen, setRightPanelCollapsed, toggleRightPanelCollapse,
  } = useUIStore();
  const { toggleAIPanel, aiPanelOpen } = useAIStore();

  const handleRunSimulation = () => {
    setSimulationRunning(true);
    try {
      const result = runDCSimulation(circuit);
      setSimulationResult(result);
    } finally {
      setSimulationRunning(false);
    }
  };

  const handleStopSimulation = () => {
    setSimulationRunning(false);
    setSimulationResult(null);
  };

  const handleSave = () => {
    const json = JSON.stringify(circuit, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${circuit.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const loaded = JSON.parse(ev.target?.result as string);
          useCircuitStore.getState().loadCircuit(loaded);
        } catch {
          alert('Failed to load circuit file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const viewModes = [
    { id: '2d' as const, icon: <Layers size={15} />, label: '2D Schematic' },
    { id: '3d' as const, icon: <Cpu size={15} />, label: '3D Physical' },
    { id: 'split' as const, icon: <SplitSquareHorizontal size={15} />, label: 'Split View' },
    { id: 'breadboard' as const, icon: <Layout size={15} />, label: 'Breadboard' },
  ];

  return (
    <header className="h-11 flex items-center gap-1 px-2 bg-[#12141f] border-b border-[#2a2d3e] select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <Activity size={18} className="text-blue-400" />
        <span className="text-sm font-semibold text-white">Circuit Lab</span>
      </div>

      <Divider />

      {/* File ops */}
      <IconButton onClick={newCircuit} title="New Circuit"><span className="text-xs font-bold">New</span></IconButton>
      <IconButton onClick={handleSave} title="Save Circuit"><Save size={15} /></IconButton>
      <IconButton onClick={handleLoad} title="Open Circuit"><FolderOpen size={15} /></IconButton>

      <Divider />

      {/* Undo / Redo */}
      <IconButton onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)"><Undo2 size={15} /></IconButton>
      <IconButton onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)"><Redo2 size={15} /></IconButton>

      <Divider />

      {/* View mode */}
      {viewModes.map(vm => (
        <IconButton
          key={vm.id}
          onClick={() => setViewMode(vm.id)}
          active={viewMode === vm.id}
          title={vm.label}
        >
          {vm.icon}
        </IconButton>
      ))}

      <Divider />

      {/* View toggles */}
      <IconButton onClick={toggleGrid} active={showGrid} title="Toggle Grid"><Grid size={15} /></IconButton>
      <IconButton onClick={toggleLabels} active={showLabels} title="Toggle Labels"><Monitor size={15} /></IconButton>
      <IconButton onClick={toggleCurrentFlow} active={showCurrentFlow} title="Toggle Current Flow"><Activity size={15} /></IconButton>

      <Divider />

      {/* Zoom */}
      <IconButton onClick={() => useCircuitStore.getState().zoomIn()} title="Zoom In"><ZoomIn size={15} /></IconButton>
      <IconButton onClick={() => useCircuitStore.getState().zoomOut()} title="Zoom Out"><ZoomOut size={15} /></IconButton>
      <IconButton onClick={() => useCircuitStore.getState().resetView()} title="Reset View (Ctrl+0)"><RotateCcw size={15} /></IconButton>
      <IconButton onClick={() => useCircuitStore.getState().fitToContent()} title="Fit to Content (Ctrl+Shift+F)"><Maximize2 size={15} /></IconButton>

      <Divider />

      {/* Simulation */}
      {!isSimulationRunning ? (
        <button
          onClick={handleRunSimulation}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold transition-colors"
          title="Run Simulation"
        >
          <Play size={12} fill="currentColor" /> Run
        </button>
      ) : (
        <button
          onClick={handleStopSimulation}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition-colors"
          title="Stop Simulation"
        >
          <Square size={12} fill="currentColor" /> Stop
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Circuit name */}
      <CircuitNameEditor />

      <Divider />

      {/* Panel toggles — 3 states: hidden → icon rail → expanded */}
      <button
        onClick={toggleSidebarCollapse}
        title={!sidebarOpen ? 'Show Component Library' : sidebarCollapsed ? 'Expand Component Library' : 'Collapse to icon rail'}
        className={`p-1.5 rounded transition-colors relative ${
          sidebarOpen
            ? sidebarCollapsed
              ? 'bg-blue-500/10 text-blue-400'
              : 'bg-blue-500/15 text-blue-400'
            : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
        }`}
      >
        <PanelLeft size={15} />
        {sidebarOpen && sidebarCollapsed && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-[#12141f]" />
        )}
      </button>

      <button
        onClick={toggleRightPanelCollapse}
        title={!propertiesPanelOpen ? 'Show Properties Panel' : rightPanelCollapsed ? 'Expand Properties Panel' : 'Collapse to icon rail'}
        className={`p-1.5 rounded transition-colors relative ${
          propertiesPanelOpen
            ? rightPanelCollapsed
              ? 'bg-blue-500/10 text-blue-400'
              : 'bg-blue-500/15 text-blue-400'
            : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
        }`}
      >
        <PanelRight size={15} />
        {propertiesPanelOpen && rightPanelCollapsed && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-[#12141f]" />
        )}
      </button>

      <Divider />

      {/* AI button */}
      <button
        onClick={toggleAIPanel}
        title="Circuit AI Assistant"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
          aiPanelOpen
            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
            : 'text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 border border-transparent'
        }`}
        style={{ boxShadow: aiPanelOpen ? '0 0 12px rgba(139,92,246,0.2)' : 'none' }}
      >
        <Sparkles size={13} />
        <span>AI</span>
      </button>
    </header>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[#2a2d3e] mx-1" />;
}

function IconButton({
  onClick, children, title, active = false, disabled = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors text-sm ${
        active
          ? 'bg-blue-500/20 text-blue-400'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

function CircuitNameEditor() {
  const { circuit, setCircuitName } = useCircuitStore();
  return (
    <input
      value={circuit.name}
      onChange={e => setCircuitName(e.target.value)}
      className="bg-transparent text-sm text-gray-300 text-center w-40 focus:outline-none focus:text-white focus:bg-white/5 rounded px-1 py-0.5"
    />
  );
}
