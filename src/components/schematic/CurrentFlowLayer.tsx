import { useEffect, useState } from 'react';
import type { Wire, SimulationResult } from '@/types';

interface Props {
  wires: Wire[];
  simResult: SimulationResult | null;
}

// Animated current flow particles along wires
export default function CurrentFlowLayer({ wires, simResult }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let frame: number;
    let last = performance.now();
    const animate = (now: number) => {
      if (now - last > 50) { // ~20fps for particles
        setTick(t => t + 1);
        last = now;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!simResult?.success) return null;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {wires.map(wire => {
        const current = simResult.branchCurrents?.[wire.fromComponentId ?? ''] ?? 0;
        if (Math.abs(current) < 0.0001) return null;

        return (
          <WireParticles key={wire.id} wire={wire} current={current} tick={tick} />
        );
      })}
    </g>
  );
}

function WireParticles({ wire, current, tick }: { wire: Wire; current: number; tick: number }) {
  const speed = Math.min(Math.abs(current) * 40, 60); // px per second roughly
  const direction = current > 0 ? 1 : -1;
  const color = getFlowColor(Math.abs(current));
  const numParticles = Math.min(Math.ceil(Math.abs(current) * 8) + 1, 5);

  // Compute total wire length
  const totalLength = wire.segments.reduce((sum, seg) => {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  if (totalLength < 4) return null;

  const particles = Array.from({ length: numParticles }, (_, i) => {
    const phase = (tick * speed / 20 * direction + (totalLength / numParticles) * i) % totalLength;
    const normPos = ((phase % totalLength) + totalLength) % totalLength;
    return getPointAtLength(wire.segments, normPos);
  });

  return (
    <g>
      {particles.map((pt, i) => pt && (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={2.5}
          fill={color}
          opacity={0.85}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      ))}
    </g>
  );
}

function getPointAtLength(
  segments: Wire['segments'],
  targetLength: number
): { x: number; y: number } | null {
  let remaining = targetLength;
  for (const seg of segments) {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (remaining <= len) {
      const t = remaining / len;
      return { x: seg.start.x + dx * t, y: seg.start.y + dy * t };
    }
    remaining -= len;
  }
  return segments[segments.length - 1]?.end ?? null;
}

function getFlowColor(current: number): string {
  if (current > 5) return '#ef4444';
  if (current > 1) return '#f97316';
  if (current > 0.1) return '#f59e0b';
  if (current > 0.001) return '#22c55e';
  return '#3b82f6';
}
