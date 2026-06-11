import { useState, useCallback, useRef, useEffect } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { COMPONENT_DEFINITIONS } from '@/data/componentLibrary';
import { useDragContext } from '@/context/DragContext';
import type { ComponentType } from '@/types';

// ── Breadboard layout constants ───────────────────────────────
// Standard half+ breadboard: 63 columns × 10 rows + 4 power rails
const PITCH = 22;          // px between holes (2.54mm at ~8.7px/mm)
const HOLE_R = 3.5;        // hole radius
const COLS = 63;           // tie columns
const ROWS = 5;            // rows per strip (a–e and f–j)

// Computed layout positions
const RAIL_H = PITCH * 1.4;        // height of each power rail area
const STRIP_H = ROWS * PITCH;      // height of one strip
const GAP_H = PITCH * 1.4;         // DIP channel gap between strips
const PAD_X = PITCH * 3;           // left/right margin (for labels)
const PAD_TOP = PITCH;

const TOP_RAIL_POS = PAD_TOP;
const TOP_RAIL_NEG = PAD_TOP + PITCH;
const TOP_STRIP_Y = PAD_TOP + RAIL_H * 2 + PITCH * 0.5;        // row a starts here
const BOTTOM_STRIP_Y = TOP_STRIP_Y + STRIP_H + GAP_H;          // row f starts here
const BOT_RAIL_POS = BOTTOM_STRIP_Y + STRIP_H + PITCH * 0.5;
const BOT_RAIL_NEG = BOT_RAIL_POS + PITCH;
const BOARD_H = BOT_RAIL_NEG + PITCH * 2;
const BOARD_W = PAD_X * 2 + COLS * PITCH;

const ROW_LABELS_TOP = ['a', 'b', 'c', 'd', 'e'];
const ROW_LABELS_BOT = ['f', 'g', 'h', 'i', 'j'];

const WIRE_COLORS = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#a78bfa','#ec4899','#06b6d4','#84cc16'];

interface PlacedComponent {
  id: string;
  type: string;
  label: string;
  col: number;       // leftmost hole column (0-based)
  strip: 'top' | 'bot';
  row: number;       // row index (0=a/f, 1=b/g, ...)
  pinCount: number;  // how many holes it spans
  color: string;
}

interface JumperWire {
  id: string;
  fromCol: number; fromRow: string;
  toCol: number; toRow: string;
  color: string;
}

export default function BreadboardCanvas() {
  const { circuit, addComponent } = useCircuitStore();
  const { endDrag, dragging: draggingDef } = useDragContext();

  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ mx: number; my: number; vx: number; vy: number } | null>(null);
  const [hoverHole, setHoverHole] = useState<{ col: number; row: string } | null>(null);
  const [dropPreview, setDropPreview] = useState<{ col: number; strip: 'top' | 'bot' } | null>(null);
  const [placed, setPlaced] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<JumperWire[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 900, h: 600 });

  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(e => {
      const { width, height } = e[0].contentRect;
      setSize({ w: width, h: height });
      // Fit board to viewport on first load
      setViewport(v => {
        if (v.x === 0 && v.y === 0 && v.zoom === 1) {
          const zoom = Math.min(width / BOARD_W, height / BOARD_H) * 0.92;
          return { zoom, x: (width - BOARD_W * zoom) / 2, y: (height - BOARD_H * zoom) / 2 };
        }
        return v;
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Coordinate helpers ──────────────────────────────────────
  const holePos = (col: number, rowStr: string): { x: number; y: number } => {
    const x = PAD_X + col * PITCH;
    const isTop = ROW_LABELS_TOP.includes(rowStr);
    const rowIdx = isTop ? ROW_LABELS_TOP.indexOf(rowStr) : ROW_LABELS_BOT.indexOf(rowStr);
    const baseY = isTop ? TOP_STRIP_Y : BOTTOM_STRIP_Y;
    return { x, y: baseY + rowIdx * PITCH };
  };

  const railPos = (col: number, rail: 'tp' | 'tn' | 'bp' | 'bn'): { x: number; y: number } => {
    const x = PAD_X + col * PITCH;
    const y = rail === 'tp' ? TOP_RAIL_POS : rail === 'tn' ? TOP_RAIL_NEG
      : rail === 'bp' ? BOT_RAIL_POS : BOT_RAIL_NEG;
    return { x, y };
  };

  const screenToBoard = (sx: number, sy: number) => ({
    x: (sx - viewport.x) / viewport.zoom,
    y: (sy - viewport.y) / viewport.zoom,
  });

  const nearestHole = (bx: number, by: number): { col: number; row: string } | null => {
    let best: { col: number; row: string; dist: number } | null = null;
    const allRows = [...ROW_LABELS_TOP, ...ROW_LABELS_BOT];
    for (let c = 0; c < COLS; c++) {
      for (const r of allRows) {
        const p = holePos(c, r);
        const d = Math.hypot(p.x - bx, p.y - by);
        if (!best || d < best.dist) best = { col: c, row: r, dist: d };
      }
    }
    return best && best.dist < PITCH * 0.7 ? { col: best.col, row: best.row } : null;
  };

  // ── Panning & zoom ──────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.max(0.3, Math.min(5, viewport.zoom * factor));
    setViewport(v => ({
      zoom: newZoom,
      x: mx - (mx - v.x) * (newZoom / v.zoom),
      y: my - (my - v.y) * (newZoom / v.zoom),
    }));
  }, [viewport.zoom]);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, vx: viewport.x, vy: viewport.y };
      e.preventDefault();
    }
  }, [viewport]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.mx, dy = e.clientY - panStart.current.my;
      setViewport(v => ({ ...v, x: panStart.current!.vx + dx, y: panStart.current!.vy + dy }));
    }
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const bp = screenToBoard(e.clientX - rect.left, e.clientY - rect.top);
      const hole = nearestHole(bp.x, bp.y);
      setHoverHole(hole);
    }
  }, [isPanning, viewport]);

  const handleMouseUp = () => { setIsPanning(false); panStart.current = null; };

  // ── Drop handling ───────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const bp = screenToBoard(e.clientX - rect.left, e.clientY - rect.top);
    const hole = nearestHole(bp.x, bp.y);
    if (hole) {
      const isTop = ROW_LABELS_TOP.includes(hole.row);
      setDropPreview({ col: hole.col, strip: isTop ? 'top' : 'bot' });
    }
  }, [viewport]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const compType = e.dataTransfer.getData('application/circuit-component');
    if (!compType || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const bp = screenToBoard(e.clientX - rect.left, e.clientY - rect.top);
    const hole = nearestHole(bp.x, bp.y);
    if (!hole) return;

    const def = COMPONENT_DEFINITIONS[compType as ComponentType];
    const pinCount = Math.max(2, (def?.pins.length ?? 2));
    const isTop = ROW_LABELS_TOP.includes(hole.row);
    const rowIdx = isTop ? ROW_LABELS_TOP.indexOf(hole.row) : ROW_LABELS_BOT.indexOf(hole.row);
    const colorIdx = placed.length % WIRE_COLORS.length;

    setPlaced(prev => [...prev, {
      id: `bb-${Date.now()}`,
      type: compType,
      label: def?.label ?? compType,
      col: Math.max(0, Math.min(COLS - pinCount, hole.col)),
      strip: isTop ? 'top' : 'bot',
      row: rowIdx,
      pinCount,
      color: WIRE_COLORS[colorIdx],
    }]);

    setDropPreview(null);
    endDrag();
  }, [viewport, placed, endDrag]);

  // ── Render holes grid ───────────────────────────────────────
  const renderHoles = (rows: string[], baseY: number) => {
    const els: React.ReactElement[] = [];
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = PAD_X + c * PITCH;
        const cy = baseY + r * PITCH;
        const isHovered = hoverHole?.col === c && hoverHole?.row === rows[r];
        els.push(
          <g key={`${rows[r]}-${c}`}>
            <circle cx={cx} cy={cy} r={HOLE_R + 2} fill="rgba(0,0,0,0.3)" />
            <circle
              cx={cx} cy={cy} r={HOLE_R}
              fill={isHovered ? '#1e3a4a' : '#0a0c0a'}
              stroke={isHovered ? '#3b82f6' : '#2a3a2a'}
              strokeWidth={0.5}
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoverHole({ col: c, row: rows[r] })}
              onMouseLeave={() => setHoverHole(null)}
            />
            {/* Metallic ring */}
            <circle cx={cx} cy={cy} r={HOLE_R - 0.5} fill="none" stroke="#3a5a3a" strokeWidth={0.5} opacity={0.4} />
          </g>
        );
      }
    }
    return els;
  };

  const renderRailHoles = (y: number, isPos: boolean) => {
    const els: React.ReactElement[] = [];
    for (let c = 0; c < COLS; c++) {
      const cx = PAD_X + c * PITCH;
      const isSep = c > 0 && c % 5 === 0;
      if (isSep) continue;
      els.push(
        <circle key={c} cx={cx} cy={y} r={HOLE_R}
          fill="#080a08" stroke={isPos ? '#8b1a1a' : '#1a1a6b'} strokeWidth={0.5}
        />
      );
    }
    return els;
  };

  // ── Render placed components ────────────────────────────────
  const renderPlaced = () => placed.map(pc => {
    const baseRow = pc.strip === 'top' ? ROW_LABELS_TOP[pc.row] : ROW_LABELS_BOT[pc.row];
    const startX = PAD_X + pc.col * PITCH;
    const endX = PAD_X + (pc.col + pc.pinCount - 1) * PITCH;
    const { y } = holePos(pc.col, baseRow);
    const w = (pc.pinCount - 1) * PITCH;
    const compH = pc.type === 'bjt_npn' || pc.type === 'bjt_pnp' ? PITCH * 3 : PITCH * 1.8;
    const isIC = ['timer_555', 'opamp', 'gate_and', 'gate_or', 'gate_not', 'arduino_uno'].includes(pc.type);

    return (
      <g key={pc.id}>
        {/* Lead lines to holes */}
        {Array.from({ length: pc.pinCount }, (_, i) => (
          <line key={i}
            x1={PAD_X + (pc.col + i) * PITCH} y1={y - HOLE_R}
            x2={PAD_X + (pc.col + i) * PITCH} y2={y - compH * 0.35}
            stroke="#c0a060" strokeWidth={1.5}
          />
        ))}

        {/* Component body */}
        {isIC ? (
          // DIP IC body
          <>
            <rect
              x={startX - 4} y={y - compH}
              width={w + 8} height={compH}
              rx={3} fill="#1a1a2e" stroke="#4a4a7e" strokeWidth={1}
            />
            {/* Notch */}
            <path d={`M ${startX + w / 2 - 5} ${y - compH} Q ${startX + w / 2} ${y - compH + 6} ${startX + w / 2 + 5} ${y - compH}`}
              fill="none" stroke="#3a3a6e" strokeWidth={1} />
            <text x={startX + w / 2} y={y - compH / 2 + 3}
              textAnchor="middle" fontSize={8} fill="#8888cc" fontFamily="monospace">{pc.label}</text>
          </>
        ) : pc.type === 'capacitor' ? (
          // Electrolytic capacitor cylinder
          <ellipse cx={startX + w / 2} cy={y - compH * 0.6} rx={PITCH * 0.45} ry={PITCH * 0.6}
            fill="#0f3070" stroke="#1a5aa0" strokeWidth={1} />
        ) : pc.type === 'led' ? (
          // LED dome
          <g>
            <ellipse cx={startX + w / 2} cy={y - compH * 0.5} rx={PITCH * 0.35} ry={PITCH * 0.5}
              fill={pc.color} stroke={pc.color} strokeWidth={0.5} opacity={0.85} />
            <ellipse cx={startX + w / 2} cy={y - compH * 0.5} rx={PITCH * 0.18} ry={PITCH * 0.25}
              fill="white" opacity={0.3} />
          </g>
        ) : (
          // Generic resistor/component body
          <rect
            x={startX + 2} y={y - compH}
            width={Math.max(w - 4, 8)} height={compH * 0.7}
            rx={2} fill={pc.color} stroke={pc.color} strokeWidth={0.5} opacity={0.85}
          />
        )}

        {/* Label */}
        <text x={startX + w / 2} y={y - compH - 3}
          textAnchor="middle" fontSize={7} fill="#a0b0a0" fontFamily="monospace">
          {pc.label}
        </text>
      </g>
    );
  });

  // ── Render jumper wires ─────────────────────────────────────
  const renderWires = () => wires.map(w => {
    const a = holePos(w.fromCol, w.fromRow);
    const b = holePos(w.toCol, w.toRow);
    const mx = (a.x + b.x) / 2;
    const my = Math.min(a.y, b.y) - 20;
    return (
      <path key={w.id}
        d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
        fill="none" stroke={w.color} strokeWidth={2.5} strokeLinecap="round" opacity={0.9}
      />
    );
  });

  // ── Drop preview ────────────────────────────────────────────
  const renderDropPreview = () => {
    if (!dropPreview || !draggingDef) return null;
    const row0 = dropPreview.strip === 'top' ? ROW_LABELS_TOP[0] : ROW_LABELS_BOT[0];
    const { y } = holePos(dropPreview.col, row0);
    const pinCount = Math.max(2, draggingDef.pins.length);
    const w = (pinCount - 1) * PITCH;
    const x = PAD_X + dropPreview.col * PITCH;
    return (
      <g opacity={0.6}>
        <rect x={x - 6} y={y - PITCH * 2.5} width={w + 12} height={PITCH * 2.8}
          rx={4} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth={1.5}
          strokeDasharray="5 3" />
        {Array.from({ length: pinCount }, (_, i) => (
          <circle key={i} cx={x + i * PITCH} cy={y} r={HOLE_R + 2}
            fill="none" stroke="#22c55e" strokeWidth={1.5} />
        ))}
        <text x={x + w / 2} y={y - PITCH * 2.8} textAnchor="middle" fontSize={8}
          fill="#3b82f6" fontFamily="monospace">{draggingDef.label}</text>
      </g>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#060a06]">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className={isPanning ? 'cursor-grabbing' : 'cursor-default'}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropPreview(null)}
        style={{ userSelect: 'none' }}
      >
        <rect width={size.w} height={size.h} fill="#060a06" />

        <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.zoom})`}>
          {/* ── Board body ─────────────────────────────────── */}
          <rect x={0} y={0} width={BOARD_W} height={BOARD_H}
            rx={8} fill="#0e1a0e" stroke="#1a2a1a" strokeWidth={1} />

          {/* Texture overlay stripes */}
          {Array.from({ length: Math.floor(BOARD_H / 4) }, (_, i) => (
            <line key={i} x1={0} y1={i * 4} x2={BOARD_W} y2={i * 4}
              stroke="rgba(255,255,255,0.008)" strokeWidth={1} />
          ))}

          {/* ── Power rail backgrounds ─────────────────── */}
          {/* Top rails */}
          <rect x={PITCH * 1.5} y={TOP_RAIL_POS - PITCH * 0.4} width={BOARD_W - PITCH * 3} height={PITCH * 0.85}
            rx={2} fill="#1a0808" stroke="#3a1010" strokeWidth={0.5} />
          <rect x={PITCH * 1.5} y={TOP_RAIL_NEG - PITCH * 0.4} width={BOARD_W - PITCH * 3} height={PITCH * 0.85}
            rx={2} fill="#08081a" stroke="#10103a" strokeWidth={0.5} />

          {/* Red/Blue rail lines */}
          <line x1={PAD_X} y1={TOP_RAIL_POS} x2={PAD_X + (COLS / 2 - 1) * PITCH} y2={TOP_RAIL_POS}
            stroke="#cc2222" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />
          <line x1={PAD_X + (COLS / 2 + 1) * PITCH} y1={TOP_RAIL_POS} x2={PAD_X + (COLS - 1) * PITCH} y2={TOP_RAIL_POS}
            stroke="#cc2222" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />
          <line x1={PAD_X} y1={TOP_RAIL_NEG} x2={PAD_X + (COLS / 2 - 1) * PITCH} y2={TOP_RAIL_NEG}
            stroke="#2222cc" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />
          <line x1={PAD_X + (COLS / 2 + 1) * PITCH} y1={TOP_RAIL_NEG} x2={PAD_X + (COLS - 1) * PITCH} y2={TOP_RAIL_NEG}
            stroke="#2222cc" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />

          {/* Bottom rails */}
          <rect x={PITCH * 1.5} y={BOT_RAIL_POS - PITCH * 0.4} width={BOARD_W - PITCH * 3} height={PITCH * 0.85}
            rx={2} fill="#1a0808" stroke="#3a1010" strokeWidth={0.5} />
          <rect x={PITCH * 1.5} y={BOT_RAIL_NEG - PITCH * 0.4} width={BOARD_W - PITCH * 3} height={PITCH * 0.85}
            rx={2} fill="#08081a" stroke="#10103a" strokeWidth={0.5} />
          <line x1={PAD_X} y1={BOT_RAIL_POS} x2={PAD_X + (COLS - 1) * PITCH} y2={BOT_RAIL_POS}
            stroke="#cc2222" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />
          <line x1={PAD_X} y1={BOT_RAIL_NEG} x2={PAD_X + (COLS - 1) * PITCH} y2={BOT_RAIL_NEG}
            stroke="#2222cc" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />

          {/* ── Center DIP channel ──────────────────────── */}
          <rect x={PAD_X - PITCH * 0.5} y={TOP_STRIP_Y + STRIP_H}
            width={(COLS - 1) * PITCH + PITCH} height={GAP_H}
            fill="#060a06" stroke="#1a2a1a" strokeWidth={0.5} />

          {/* ── Rail holes ─────────────────────────────── */}
          {renderRailHoles(TOP_RAIL_POS, true)}
          {renderRailHoles(TOP_RAIL_NEG, false)}
          {renderRailHoles(BOT_RAIL_POS, true)}
          {renderRailHoles(BOT_RAIL_NEG, false)}

          {/* ── Tie holes ──────────────────────────────── */}
          {renderHoles(ROW_LABELS_TOP, TOP_STRIP_Y)}
          {renderHoles(ROW_LABELS_BOT, BOTTOM_STRIP_Y)}

          {/* ── Column numbers ─────────────────────────── */}
          {Array.from({ length: COLS }, (_, i) => (i % 5 === 0 || i === COLS - 1) && (
            <text key={i}
              x={PAD_X + i * PITCH}
              y={TOP_STRIP_Y - PITCH * 0.3}
              textAnchor="middle" fontSize={6} fill="#2a4a2a" fontFamily="monospace">
              {i + 1}
            </text>
          ))}
          {Array.from({ length: COLS }, (_, i) => (i % 5 === 0 || i === COLS - 1) && (
            <text key={i}
              x={PAD_X + i * PITCH}
              y={BOTTOM_STRIP_Y + STRIP_H + PITCH * 0.25}
              textAnchor="middle" fontSize={6} fill="#2a4a2a" fontFamily="monospace">
              {i + 1}
            </text>
          ))}

          {/* ── Row labels ─────────────────────────────── */}
          {ROW_LABELS_TOP.map((r, i) => (
            <text key={r} x={PITCH * 1.2} y={TOP_STRIP_Y + i * PITCH + 3}
              textAnchor="middle" fontSize={8} fill="#3a5a3a" fontFamily="monospace">{r}</text>
          ))}
          {ROW_LABELS_BOT.map((r, i) => (
            <text key={r} x={PITCH * 1.2} y={BOTTOM_STRIP_Y + i * PITCH + 3}
              textAnchor="middle" fontSize={8} fill="#3a5a3a" fontFamily="monospace">{r}</text>
          ))}

          {/* ── Rail labels ────────────────────────────── */}
          <text x={PITCH * 0.7} y={TOP_RAIL_POS + 3} textAnchor="middle" fontSize={9} fill="#cc4444" fontFamily="sans-serif" fontWeight="bold">+</text>
          <text x={PITCH * 0.7} y={TOP_RAIL_NEG + 3} textAnchor="middle" fontSize={9} fill="#4444cc" fontFamily="sans-serif" fontWeight="bold">−</text>
          <text x={PITCH * 0.7} y={BOT_RAIL_POS + 3} textAnchor="middle" fontSize={9} fill="#cc4444" fontFamily="sans-serif" fontWeight="bold">+</text>
          <text x={PITCH * 0.7} y={BOT_RAIL_NEG + 3} textAnchor="middle" fontSize={9} fill="#4444cc" fontFamily="sans-serif" fontWeight="bold">−</text>

          {/* ── Jumper wires (below components) ────────── */}
          {renderWires()}

          {/* ── Placed components ──────────────────────── */}
          {renderPlaced()}

          {/* ── Drop preview ───────────────────────────── */}
          {renderDropPreview()}
        </g>
      </svg>

      {/* Controls overlay */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        {dropPreview && draggingDef && (
          <div className="text-xs text-blue-400 bg-blue-900/50 border border-blue-500/30 rounded-lg px-3 py-1.5 backdrop-blur-sm">
            Drop to place {draggingDef.label} on column {dropPreview.col + 1}
          </div>
        )}
      </div>

      <div className="absolute bottom-2 right-3 text-xs text-gray-700 pointer-events-none">
        Scroll to zoom · Alt+drag to pan
      </div>

      <div className="absolute bottom-2 left-3 text-xs text-gray-700 pointer-events-none">
        {placed.length} component{placed.length !== 1 ? 's' : ''} placed
      </div>
    </div>
  );
}
