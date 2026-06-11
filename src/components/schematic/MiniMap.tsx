import type { CircuitComponent, Wire } from '@/types';

interface Props {
  components: CircuitComponent[];
  wires: Wire[];
  viewport: { x: number; y: number; zoom: number };
  canvasSize: { w: number; h: number };
}

const MM_W = 140;
const MM_H = 90;

export default function MiniMap({ components, wires, viewport, canvasSize }: Props) {
  if (components.length === 0) return null;

  // Bounding box of all components
  const xs = components.map(c => c.position.x);
  const ys = components.map(c => c.position.y);
  const minX = Math.min(...xs) - 60;
  const minY = Math.min(...ys) - 60;
  const maxX = Math.max(...xs) + 60;
  const maxY = Math.max(...ys) + 60;
  const cW = maxX - minX || 200;
  const cH = maxY - minY || 200;

  const scaleX = MM_W / cW;
  const scaleY = MM_H / cH;
  const scale = Math.min(scaleX, scaleY, 1);

  const toMM = (x: number, y: number) => ({
    x: (x - minX) * scale,
    y: (y - minY) * scale,
  });

  // Viewport rect in canvas space
  const vpLeft = -viewport.x / viewport.zoom;
  const vpTop = -viewport.y / viewport.zoom;
  const vpRight = (canvasSize.w - viewport.x) / viewport.zoom;
  const vpBottom = (canvasSize.h - viewport.y) / viewport.zoom;

  const vpMM = {
    x: (vpLeft - minX) * scale,
    y: (vpTop - minY) * scale,
    w: (vpRight - vpLeft) * scale,
    h: (vpBottom - vpTop) * scale,
  };

  return (
    <div className="absolute bottom-8 right-2 bg-[#12141f]/90 border border-[#2a2d3e] rounded overflow-hidden">
      <svg width={MM_W} height={MM_H}>
        <rect width={MM_W} height={MM_H} fill="#0a0c14" />

        {/* Wires */}
        {wires.map(wire =>
          wire.segments.map((seg, i) => {
            const a = toMM(seg.start.x, seg.start.y);
            const b = toMM(seg.end.x, seg.end.y);
            return (
              <line
                key={`${wire.id}-${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#374151" strokeWidth={1}
              />
            );
          })
        )}

        {/* Components */}
        {components.map(comp => {
          const mm = toMM(comp.position.x, comp.position.y);
          return (
            <rect
              key={comp.id}
              x={mm.x - 2} y={mm.y - 2}
              width={4} height={4}
              rx={1}
              fill={comp.selected ? '#3b82f6' : '#64748b'}
            />
          );
        })}

        {/* Viewport rect */}
        <rect
          x={vpMM.x} y={vpMM.y}
          width={vpMM.w} height={vpMM.h}
          fill="rgba(59,130,246,0.08)"
          stroke="#3b82f6"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
