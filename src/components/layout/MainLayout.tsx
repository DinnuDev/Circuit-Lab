import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';
import { useAIStore } from '@/store/aiStore';
import TopBar from '@/components/ui/TopBar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import SchematicCanvas from '@/components/canvas/SchematicCanvas';
import Canvas3D from '@/components/canvas/Canvas3D';
import SplitView from '@/components/canvas/SplitView';
import BreadboardCanvas from '@/components/breadboard/BreadboardCanvas';
import StatusBar from '@/components/ui/StatusBar';
import AIAssistant from '@/components/ai/AIAssistant';

export default function MainLayout() {
  const { viewMode } = useUIStore();
  const { aiPanelOpen } = useAIStore();

  const renderCanvas = () => {
    switch (viewMode) {
      case '2d':         return <SchematicCanvas />;
      case '3d':         return <Canvas3D />;
      case 'split':      return <SplitView />;
      case 'breadboard': return <BreadboardCanvas />;
      default:           return <SchematicCanvas />;
    }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Component library (expanded / icon rail / hidden) */}
        <LeftSidebar />

        {/* Canvas */}
        <main className="flex-1 relative overflow-hidden bg-[#0f1117]">
          {renderCanvas()}
        </main>

        {/* Right sidebar — Properties / Sim / Instruments / Errors */}
        <RightSidebar />

        {/* AI Assistant Panel */}
        {aiPanelOpen && (
          <aside
            className="flex-shrink-0 flex flex-col overflow-hidden"
            style={{
              width: 320,
              borderLeft: '1px solid rgba(139,92,246,0.3)',
              background: 'var(--surface)',
            }}
          >
            <AIAssistant />
          </aside>
        )}
      </div>

      <StatusBar />
    </div>
  );
}
