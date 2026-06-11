import { useEffect, useRef } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { runDCSimulation } from '@/simulation/engine';
import { useUIStore } from '@/store/uiStore';

interface Props {
  x: number;
  y: number;
  componentId: string;
  onClose: () => void;
}

export default function ComponentContextMenu({ x, y, componentId, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { circuit, removeComponent, rotateComponent, flipComponent, duplicateSelected, selectComponent, setSimulationResult } = useCircuitStore();
  const { setSimulationRunning } = useUIStore();
  const comp = circuit.components[componentId];

  // Adjust position so menu doesn't overflow screen
  const menuW = 192, menuH = 280;
  const ax = x + menuW > window.innerWidth ? x - menuW : x;
  const ay = y + menuH > window.innerHeight ? y - menuH : y;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!comp) return null;

  const runSimForSelected = () => {
    selectComponent(componentId);
    setSimulationRunning(true);
    const result = runDCSimulation(circuit);
    setSimulationResult(result);
    setSimulationRunning(false);
    onClose();
  };

  const handleDelete = () => {
    removeComponent(componentId);
    onClose();
  };

  const handleRotate = () => {
    rotateComponent(componentId, 90);
    onClose();
  };

  const handleFlip = () => {
    flipComponent(componentId);
    onClose();
  };

  const handleDuplicate = () => {
    selectComponent(componentId);
    duplicateSelected();
    onClose();
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[#1a1d2a] border border-[#2d3555] rounded-xl shadow-2xl shadow-black/60 py-1 w-48 text-xs overflow-hidden"
      style={{ left: ax, top: ay }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2d3555] mb-1">
        <div className="font-semibold text-white">{comp.label}</div>
        <div className="text-gray-500 text-xs">{comp.type}</div>
      </div>

      <MenuGroup>
        <MenuItem icon="↻" label="Rotate 90°" shortcut="R" onClick={handleRotate} />
        <MenuItem icon="⇔" label="Flip Horizontal" shortcut="F" onClick={handleFlip} />
      </MenuGroup>

      <MenuSep />

      <MenuGroup>
        <MenuItem icon="⎘" label="Duplicate" shortcut="Ctrl+D" onClick={handleDuplicate} />
        <MenuItem icon="▶" label="Simulate" onClick={runSimForSelected} accent="green" />
      </MenuGroup>

      <MenuSep />

      <MenuGroup>
        <MenuItem icon="🗑" label="Delete" shortcut="Del" onClick={handleDelete} danger />
      </MenuGroup>

      {/* Position info */}
      <div className="px-3 py-1.5 border-t border-[#2d3555] mt-1 text-gray-700">
        x: {Math.round(comp.position.x)} · y: {Math.round(comp.position.y)} · rot: {comp.rotation}°
      </div>
    </div>
  );
}

function MenuGroup({ children }: { children: React.ReactNode }) {
  return <div className="px-1">{children}</div>;
}

function MenuSep() {
  return <div className="my-1 h-px bg-[#2d3555]" />;
}

function MenuItem({
  icon, label, shortcut, onClick, danger, accent,
}: {
  icon: string; label: string; shortcut?: string;
  onClick: () => void; danger?: boolean; accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left ${
        danger
          ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300'
          : accent === 'green'
          ? 'text-green-400 hover:bg-green-500/15 hover:text-green-300'
          : 'text-gray-300 hover:bg-white/8 hover:text-white'
      }`}
    >
      <span className="w-4 text-center opacity-70 text-sm">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-gray-600 text-xs">{shortcut}</span>}
    </button>
  );
}
