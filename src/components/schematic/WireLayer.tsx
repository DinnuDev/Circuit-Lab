import type { Wire, SimulationResult } from '@/types';
import { useCircuitStore } from '@/store/circuitStore';

interface Props {
  wires: Wire[];
  simResult: SimulationResult | null;
}

// ── Geometry helpers ──────────────────────────────────────────
interface Pt { x: number; y: number }

/** Returns the intersection point of two segments, or null */
function segmentIntersection(
  a1: Pt, a2: Pt, b1: Pt, b2: Pt
): Pt | null {
  const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null; // parallel

  const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
  const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;

  // Strictly inside both segments (exclude endpoints to avoid flagging T-junctions)
  if (t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98) {
    return { x: a1.x + t * dx1, y: a1.y + t * dy1 };
  }
  return null;
}

/** T-junction: does point P lie on segment A-B (not at endpoints)? */
function pointOnSegment(p: Pt, a: Pt, b: Pt, tol = 3): boolean {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return false;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  if (t <= 0.05 || t >= 0.95) return false;
  const cx = a.x + t * dx, cy = a.y + t * dy;
  const dist2 = (p.x - cx) ** 2 + (p.y - cy) ** 2;
  return dist2 <= tol * tol;
}

/** Angle from a to b (for semi-circle orientation) */
function angle(a: Pt, b: Pt): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

// ── Semi-circle hop path ──────────────────────────────────────
function hopPath(cx: number, cy: number, r: number, angleDeg: number): string {
  // Draw a semi-circle bump on top of the crossing wire
  // The bump goes perpendicular to the crossing wire direction
  const a = (angleDeg * Math.PI) / 180;
  // Normal direction (rotate 90° clockwise for "bridge over" direction)
  const nx = -Math.sin(a), ny = Math.cos(a);
  const x1 = cx - r * Math.cos(a);
  const y1 = cy - r * Math.sin(a);
  const x2 = cx + r * Math.cos(a);
  const y2 = cy + r * Math.sin(a);
  // Arc going "up" (in screen coords, negative y)
  const arcX = cx + r * ny * 1.2;
  const arcY = cy + r * -nx * 1.2;
  return `M ${x1} ${y1} Q ${arcX} ${arcY} ${x2} ${y2}`;
}

// ─────────────────────────────────────────────────────────────
export default function WireLayer({ wires, simResult }: Props) {
  const { selectWire, circuit } = useCircuitStore();
  const { viewport } = circuit;
  const z = viewport.zoom;

  // ── Detect crossings and T-junctions ─────────────────────
  // For each pair of distinct wires, check every segment pair
  const crossings: Array<{ pt: Pt; wireAIdx: number }> = [];
  const tjunctions: Array<Pt> = [];

  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const wa = wires[i], wb = wires[j];
      const ptsA = [wa.segments[0].start, ...wa.segments.map(s => s.end)];
      const ptsB = [wb.segments[0].start, ...wb.segments.map(s => s.end)];

      // Check if they share a node (same endpoint) — that's a T-junction dot
      for (const pa of [ptsA[0], ptsA[ptsA.length - 1]]) {
        for (const pb of [ptsB[0], ptsB[ptsB.length - 1]]) {
          if (Math.abs(pa.x - pb.x) < 4 && Math.abs(pa.y - pb.y) < 4) {
            tjunctions.push({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 });
          }
        }
      }
      // Check if endpoint of A lands on body of B
      const endpointsA = [ptsA[0], ptsA[ptsA.length - 1]];
      for (let si = 0; si < wb.segments.length; si++) {
        for (const ep of endpointsA) {
          if (pointOnSegment(ep, wb.segments[si].start, wb.segments[si].end)) {
            tjunctions.push(ep);
          }
        }
      }
      const endpointsB = [ptsB[0], ptsB[ptsB.length - 1]];
      for (let si = 0; si < wa.segments.length; si++) {
        for (const ep of endpointsB) {
          if (pointOnSegment(ep, wa.segments[si].start, wa.segments[si].end)) {
            tjunctions.push(ep);
          }
        }
      }

      // Actual crossings (neither endpoint touches the other wire)
      for (let sa = 0; sa < wa.segments.length; sa++) {
        for (let sb = 0; sb < wb.segments.length; sb++) {
          const pt = segmentIntersection(
            wa.segments[sa].start, wa.segments[sa].end,
            wb.segments[sb].start, wb.segments[sb].end,
          );
          if (pt) crossings.push({ pt, wireAIdx: i });
        }
      }
    }
  }

  // Deduplicate junctions
  const dedupPts = (pts: Pt[], tol = 5): Pt[] => {
    const out: Pt[] = [];
    pts.forEach(p => {
      if (!out.some(q => Math.abs(q.x - p.x) < tol && Math.abs(q.y - p.y) < tol)) out.push(p);
    });
    return out;
  };
  const uniqueJunctions = dedupPts(tjunctions);
  const uniqueCrossings = dedupPts(crossings.map(c => c.pt));

  const hopR = 7 / z;
  const junctionR = 4.5 / z;
  const strokeWidth = 2 / z;
  const selectedStroke = 3 / z;

  return (
    <g>
      {/* ── Wires ──────────────────────────────────── */}
      {wires.map(wire => {
        if (wire.segments.length === 0) return null;
        const current = simResult?.branchCurrents?.[wire.fromComponentId ?? ''] ?? wire.current ?? 0;
        const color = getWireColor(current, wire.selected);
        const sw = wire.selected ? selectedStroke : strokeWidth;

        const points = [wire.segments[0].start, ...wire.segments.map(s => s.end)];
        const pts = points.map(p => `${p.x},${p.y}`).join(' ');
        const start = points[0];
        const end = points[points.length - 1];

        return (
          <g key={wire.id}>
            {/* Hit area */}
            <polyline points={pts} fill="none" stroke="transparent" strokeWidth={14 / z}
              strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); selectWire(wire.id, e.shiftKey); }} />

            {/* Selection glow */}
            {wire.selected && (
              <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={sw + 4}
                strokeLinecap="round" strokeLinejoin="round" opacity={0.2} style={{ pointerEvents: 'none' }} />
            )}

            {/* Wire body */}
            <polyline points={pts} fill="none" stroke={color} strokeWidth={sw}
              strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />

            {/* Endpoint dots */}
            <circle cx={start.x} cy={start.y} r={2.5 / z} fill={color} style={{ pointerEvents: 'none' }} />
            <circle cx={end.x} cy={end.y} r={2.5 / z} fill={color} style={{ pointerEvents: 'none' }} />
          </g>
        );
      })}

      {/* ── T-junction filled dots ─────────────────── */}
      {uniqueJunctions.map((pt, i) => (
        <circle key={`tj-${i}`} cx={pt.x} cy={pt.y} r={junctionR}
          fill="#e2e8f0" style={{ pointerEvents: 'none' }} />
      ))}

      {/* ── Crossing hop semi-circles ──────────────── */}
      {uniqueCrossings.map((pt, i) => {
        // Find which wire passes over: we draw the hop on the "top" wire
        // Simple: use the wireAIdx to determine which wire gets the hop
        const crossing = crossings.find(c => Math.abs(c.pt.x - pt.x) < 4 && Math.abs(c.pt.y - pt.y) < 4);
        const wireIdx = crossing?.wireAIdx ?? 0;
        const wire = wires[wireIdx];
        if (!wire || wire.segments.length === 0) return null;

        // Angle of the wire at crossing point
        let wireAngle = 0;
        for (const seg of wire.segments) {
          const pt2 = segmentIntersection(seg.start, seg.end, seg.start, seg.end);
          wireAngle = angle(seg.start, seg.end);
          break;
        }
        // Better: find the segment that contains this crossing
        for (const seg of wire.segments) {
          const dx = seg.end.x - seg.start.x, dy = seg.end.y - seg.start.y;
          const len = Math.sqrt(dx*dx + dy*dy);
          if (len < 1e-6) continue;
          const t = ((pt.x - seg.start.x)*dx + (pt.y - seg.start.y)*dy) / (len*len);
          if (t > 0 && t < 1) {
            wireAngle = angle(seg.start, seg.end);
            break;
          }
        }

        const d = hopPath(pt.x, pt.y, hopR, wireAngle);
        const current = simResult?.branchCurrents?.[wire.fromComponentId ?? ''] ?? wire.current ?? 0;
        const color = getWireColor(current, wire.selected);

        return (
          <g key={`hop-${i}`} style={{ pointerEvents: 'none' }}>
            {/* Erase the crossing segment underneath */}
            <path d={d} fill="none" stroke="#0f1117" strokeWidth={(strokeWidth + 2)} strokeLinecap="round" />
            {/* Draw the hop arc in the wire's color */}
            <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

function getWireColor(current: number, selected: boolean): string {
  if (selected) return '#60a5fa';
  const abs = Math.abs(current);
  if (abs > 5)     return '#ef4444';
  if (abs > 1)     return '#f97316';
  if (abs > 0.1)   return '#f59e0b';
  if (abs > 0.001) return '#22c55e';
  if (abs > 0)     return '#3b82f6';
  return '#4b5563';
}
