import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';

export default function StatusBar() {
  const { circuit, simulationResult, selection } = useCircuitStore();
  const { viewMode, showGrid, snapToGrid, gridSize } = useUIStore();
  const { viewport } = circuit;

  const compCount = Object.keys(circuit.components).length;
  const wireCount = Object.keys(circuit.wires).length;
  const selCount = selection.componentIds.length + selection.wireIds.length;

  const errorCount = simulationResult?.errors.length ?? 0;
  const warnCount = simulationResult?.warnings.length ?? 0;

  return (
    <footer className="h-6 flex items-center gap-4 px-3 bg-[#12141f] border-t border-[#2a2d3e] text-xs text-gray-500 select-none">
      <span className="capitalize text-gray-400">{viewMode} view</span>
      <span>•</span>
      <span>{compCount} components</span>
      <span>{wireCount} wires</span>
      {selCount > 0 && <span className="text-blue-400">{selCount} selected</span>}
      <span>•</span>
      <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
      {showGrid && <span>Grid: {gridSize}px</span>}
      {snapToGrid && <span className="text-green-500">Snap ✓</span>}
      <div className="flex-1" />
      {errorCount > 0 && (
        <span className="text-red-400 font-medium">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
      )}
      {warnCount > 0 && (
        <span className="text-yellow-400">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>
      )}
      {simulationResult?.success && errorCount === 0 && (
        <span className="text-green-400">Simulation OK</span>
      )}
    </footer>
  );
}
