// ============================================================
// Shared utility functions used across the circuit simulator
// ============================================================

// ── SI prefix formatter ──────────────────────────────────────
export function formatSI(value: number, unit = ''): string {
  if (!isFinite(value)) return `${value}${unit}`;
  const abs = Math.abs(value);
  if (abs === 0) return `0${unit}`;
  if (abs >= 1e9)  return `${+(value / 1e9).toPrecision(4)}G${unit}`;
  if (abs >= 1e6)  return `${+(value / 1e6).toPrecision(4)}M${unit}`;
  if (abs >= 1e3)  return `${+(value / 1e3).toPrecision(4)}k${unit}`;
  if (abs >= 1)    return `${+value.toPrecision(4)}${unit}`;
  if (abs >= 1e-3) return `${+(value * 1e3).toPrecision(4)}m${unit}`;
  if (abs >= 1e-6) return `${+(value * 1e6).toPrecision(4)}μ${unit}`;
  if (abs >= 1e-9) return `${+(value * 1e9).toPrecision(4)}n${unit}`;
  return `${+(value * 1e12).toPrecision(4)}p${unit}`;
}

// ── Parse SI string back to number ──────────────────────────
export function parseSI(raw: string): number {
  const s = raw.trim().replace(/,/g, '');
  const m = s.match(/^([+-]?\d*\.?\d+)\s*([GMkmunpμ]?)([^0-9]*)$/i);
  if (!m) return parseFloat(s);
  const num = parseFloat(m[1]);
  const pfx: Record<string, number> = {
    G: 1e9, M: 1e6, k: 1e3, K: 1e3,
    m: 1e-3, u: 1e-6, μ: 1e-6, n: 1e-9, p: 1e-12,
  };
  return num * (pfx[m[2]] ?? 1);
}

// ── Format current with SI ────────────────────────────────────
export function formatCurrent(a: number): string {
  return formatSI(a, 'A');
}

// ── Format power with SI ──────────────────────────────────────
export function formatPower(w: number): string {
  return formatSI(w, 'W');
}

// ── Component pin world position ─────────────────────────────
export function pinWorldPos(
  compX: number, compY: number, rotationDeg: number,
  pinX: number, pinY: number,
): { x: number; y: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  return {
    x: compX + pinX * Math.cos(rad) - pinY * Math.sin(rad),
    y: compY + pinX * Math.sin(rad) + pinY * Math.cos(rad),
  };
}

// ── Clamp number ──────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Distance between two points ───────────────────────────────
export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Temperature color class ──────────────────────────────────
export function tempColorClass(celsius: number): string {
  if (celsius > 85)  return 'text-red-400';
  if (celsius > 60)  return 'text-orange-400';
  if (celsius > 40)  return 'text-yellow-400';
  return 'text-emerald-400';
}

// ── Unsaved changes detection helper ─────────────────────────
let _isDirty = false;
export function markDirty() { _isDirty = true; }
export function markClean() { _isDirty = false; }
export function isDirty() { return _isDirty; }
