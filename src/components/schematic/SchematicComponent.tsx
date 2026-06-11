import { useCallback, useState, useRef } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { COMPONENT_DEFINITIONS } from '@/data/componentLibrary';
import type { CircuitComponent, Point2D, SimulationResult } from '@/types';

interface Props {
  component: CircuitComponent;
  simResult: SimulationResult | null;
  showLabels: boolean;
  showValues: boolean;
  onPinClick: (compId: string, pinId: string, pinWorldPos: Point2D) => void;
  onContextMenu: (e: React.MouseEvent, componentId: string) => void;
  isDrawingWire: boolean;
  isMultiSelected: boolean;
  onMultiDragStart: (dx: number, dy: number) => void;
  viewportZoom: number;
}

export default function SchematicComponent({
  component, simResult, showLabels, showValues, onPinClick,
  onContextMenu, isDrawingWire, isMultiSelected, onMultiDragStart, viewportZoom,
}: Props) {
  const { selectComponent, moveComponent } = useCircuitStore();
  const { snapToGrid, gridSize } = useUIStore();
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Keep zoom in a ref so the drag closure always reads the latest value
  const zoomRef = useRef(viewportZoom);
  zoomRef.current = viewportZoom;

  const def = COMPONENT_DEFINITIONS[component.type];
  const simData = simResult?.componentResults?.[component.id];
  const hasError = simResult?.errors.some(e => e.componentIds?.includes(component.id));
  const hasWarning = simResult?.warnings.some(w => w.componentId === component.id);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectComponent(component.id, e.shiftKey || e.ctrlKey);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    // Capture start position from the store directly (most up-to-date)
    const { circuit } = useCircuitStore.getState();
    const startComp = circuit.components[component.id];
    if (!startComp) return;
    const origX = startComp.position.x;
    const origY = startComp.position.y;

    let hasMoved = false;
    // For multi-drag: track last snapped pos to compute deltas
    let lastSnapX = origX;
    let lastSnapY = origY;

    setIsDragging(true);

    const onMove = (mv: MouseEvent) => {
      hasMoved = true;
      const zoom = zoomRef.current;
      const dx = (mv.clientX - startMouseX) / zoom;
      const dy = (mv.clientY - startMouseY) / zoom;
      let nx = origX + dx;
      let ny = origY + dy;
      const { snapToGrid: snap, gridSize: gs } = useUIStore.getState();
      if (snap) {
        nx = Math.round(nx / gs) * gs;
        ny = Math.round(ny / gs) * gs;
      }

      if (isMultiSelected) {
        const ddx = nx - lastSnapX;
        const ddy = ny - lastSnapY;
        if (ddx !== 0 || ddy !== 0) {
          onMultiDragStart(ddx, ddy);
          lastSnapX = nx;
          lastSnapY = ny;
        }
      } else {
        useCircuitStore.getState().moveComponent(component.id, { x: nx, y: ny });
        lastSnapX = nx;
        lastSnapY = ny;
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setIsDragging(false);
      if (hasMoved) useCircuitStore.getState().pushHistory();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  // Only re-create when identity-stable values change (not component position)
  }, [component.id, isMultiSelected, onMultiDragStart, selectComponent]);

  if (!def) return null;

  const { x, y } = component.position;
  const transform = `translate(${x},${y}) rotate(${component.rotation}) ${component.flipped ? 'scale(-1,1)' : ''}`;

  const strokeColor = hasError
    ? '#ef4444'
    : hasWarning
    ? '#f59e0b'
    : component.selected
    ? '#60a5fa'
    : hovered
    ? '#cbd5e1'
    : '#94a3b8';

  const strokeWidth = component.selected ? 2 : hovered ? 1.8 : 1.5;

  // LED glow effect
  const isLEDOn = component.type === 'led' && simData && simData.current > 0.001;
  const ledColor = component.properties.color ?? '#ff0000';
  const showPinHandles = isDrawingWire || hovered;
  return (
    <g
      transform={transform}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={e => onContextMenu(e, component.id)}
      style={{ cursor: isDragging ? 'grabbing' : isMultiSelected ? 'grab' : 'move' }}
    >
      {/* Hover / selection background */}
      {(hovered || component.selected) && (
        <rect
          x={def.boundingBox.x - 6}
          y={def.boundingBox.y - 6}
          width={def.boundingBox.width + 12}
          height={def.boundingBox.height + 12}
          rx={5}
          fill={component.selected ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)'}
          stroke={component.selected ? '#3b82f6' : 'rgba(255,255,255,0.08)'}
          strokeWidth={component.selected ? 1.5 : 1}
          strokeDasharray={component.selected ? '5 3' : 'none'}
        />
      )}

      {/* Error/Warning ring */}
      {(hasError || hasWarning) && (
        <rect
          x={def.boundingBox.x - 5}
          y={def.boundingBox.y - 5}
          width={def.boundingBox.width + 10}
          height={def.boundingBox.height + 10}
          rx={4}
          fill="none"
          stroke={hasError ? '#ef4444' : '#f59e0b'}
          strokeWidth={1.5}
          opacity={0.7}
        />
      )}

      {/* Component symbol */}
      <g
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        color={strokeColor}
        style={{ transition: 'stroke 0.1s, stroke-width 0.1s' }}
      >
        {/* LED glow */}
        {isLEDOn && (
          <circle cx={0} cy={0} r={22} fill={ledColor} opacity={0.12} />
        )}
        <g dangerouslySetInnerHTML={{ __html: def.symbol }} />
      </g>

      {/* Label */}
      {showLabels && (
        <text
          x={0}
          y={def.boundingBox.y - 9}
          textAnchor="middle"
          fontSize={10}
          fill={hovered || component.selected ? '#cbd5e1' : '#64748b'}
          fontFamily="'JetBrains Mono', monospace"
          style={{ transition: 'fill 0.1s' }}
        >
          {component.label}
        </text>
      )}

      {/* Value */}
      {showValues && (
        <text
          x={0}
          y={def.boundingBox.y + def.boundingBox.height + 16}
          textAnchor="middle"
          fontSize={9}
          fill={hovered ? '#94a3b8' : '#374151'}
          fontFamily="'JetBrains Mono', monospace"
        >
          {formatValue(component)}
        </text>
      )}

      {/* Simulation overlay */}
      {simData && (simData.voltage > 0.01 || simData.current > 0.0001) && (
        <g style={{ pointerEvents: 'none' }}>
          {simData.voltage > 0.01 && (
            <text x={def.boundingBox.x + def.boundingBox.width + 5} y={-5}
              fontSize={8} fill="#22c55e" fontFamily="monospace">
              {simData.voltage.toFixed(2)}V
            </text>
          )}
          {simData.current > 0.0001 && (
            <text x={def.boundingBox.x + def.boundingBox.width + 5} y={6}
              fontSize={8} fill="#3b82f6" fontFamily="monospace">
              {formatCurrent(simData.current)}
            </text>
          )}
        </g>
      )}

      {/* Pins */}
      {component.pins.map(pin => (
        <PinHandle
          key={pin.id}
          pin={pin}
          componentId={component.id}
          showHandle={showPinHandles}
          onPinClick={onPinClick}
          position={component.position}
          rotation={component.rotation}
          hasWires={pin.connectedWireIds.length > 0}
        />
      ))}
    </g>
  );
}

function PinHandle({
  pin, componentId, showHandle, onPinClick, position, rotation, hasWires,
}: {
  pin: { id: string; name: string; position: Point2D; type: string };
  componentId: string;
  showHandle: boolean;
  onPinClick: (compId: string, pinId: string, worldPos: Point2D) => void;
  position: Point2D;
  rotation: number;
  hasWires: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const rad = (rotation * Math.PI) / 180;
  const wx = position.x + pin.position.x * Math.cos(rad) - pin.position.y * Math.sin(rad);
  const wy = position.y + pin.position.x * Math.sin(rad) + pin.position.y * Math.cos(rad);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPinClick(componentId, pin.id, { x: wx, y: wy });
  };

  return (
    <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Connected dot */}
      {hasWires && (
        <circle cx={pin.position.x} cy={pin.position.y} r={3} fill="#94a3b8" opacity={0.7} style={{ pointerEvents: 'none' }} />
      )}

      {/* Hover/draw handle */}
      {showHandle && (
        <>
          <circle
            cx={pin.position.x}
            cy={pin.position.y}
            r={hovered ? 7 : 5}
            fill={hovered ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.12)'}
            stroke="#3b82f6"
            strokeWidth={hovered ? 1.5 : 1}
            style={{ cursor: 'crosshair', transition: 'r 0.1s' }}
            onClick={handleClick}
          />
          {hovered && (
            <circle cx={pin.position.x} cy={pin.position.y} r={2.5} fill="#3b82f6" style={{ pointerEvents: 'none' }} />
          )}
        </>
      )}

      {/* Invisible hit area always present */}
      {!showHandle && (
        <circle cx={pin.position.x} cy={pin.position.y} r={6}
          fill="transparent" stroke="transparent"
          style={{ cursor: 'crosshair' }}
          onClick={handleClick}
        />
      )}
    </g>
  );
}

function formatValue(comp: CircuitComponent): string {
  const p = comp.properties;
  if (p.resistance !== undefined) return formatSI(p.resistance) + 'Ω';
  if (p.capacitance !== undefined) return formatSI(p.capacitance) + 'F';
  if (p.inductance !== undefined) return formatSI(p.inductance) + 'H';
  if (p.voltage !== undefined) return `${p.voltage}V`;
  return '';
}

function formatCurrent(a: number): string {
  if (Math.abs(a) < 0.001) return `${(a * 1e6).toFixed(0)}μA`;
  if (Math.abs(a) < 1) return `${(a * 1e3).toFixed(1)}mA`;
  return `${a.toFixed(2)}A`;
}

function formatSI(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}G`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  if (value >= 1) return `${value}`;
  if (value >= 1e-3) return `${(value * 1e3).toFixed(1)}m`;
  if (value >= 1e-6) return `${(value * 1e6).toFixed(1)}μ`;
  if (value >= 1e-9) return `${(value * 1e9).toFixed(1)}n`;
  if (value >= 1e-12) return `${(value * 1e12).toFixed(1)}p`;
  return `${value}`;
}
