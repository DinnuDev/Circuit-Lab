import SchematicCanvas from './SchematicCanvas';
import Canvas3D from './Canvas3D';
import { useUIStore } from '@/store/uiStore';

export default function SplitView() {
  const { setViewMode } = useUIStore();

  return (
    <div className="flex w-full h-full">
      {/* 2D Left */}
      <div className="flex-1 relative border-r border-[#2a2d3e]">
        <div className="absolute top-2 left-2 z-10 text-xs text-gray-500 bg-black/40 rounded px-2 py-0.5">2D Schematic</div>
        <SchematicCanvas />
      </div>

      {/* 3D Right */}
      <div className="flex-1 relative">
        <div className="absolute top-2 left-2 z-10 text-xs text-gray-500 bg-black/40 rounded px-2 py-0.5">3D Physical</div>
        <Canvas3D />
      </div>
    </div>
  );
}
