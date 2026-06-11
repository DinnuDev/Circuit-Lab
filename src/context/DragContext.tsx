/**
 * Global drag context — tracks which component is being dragged from the library
 * and provides a floating ghost preview that follows the cursor.
 */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { ComponentDefinition } from '@/types';

interface DragContextValue {
  dragging: ComponentDefinition | null;
  ghostPos: { x: number; y: number };
  startDrag: (def: ComponentDefinition, e: React.DragEvent) => void;
  endDrag: () => void;
}

const DragCtx = createContext<DragContextValue>({
  dragging: null,
  ghostPos: { x: 0, y: 0 },
  startDrag: () => {},
  endDrag: () => {},
});

export function useDragContext() {
  return useContext(DragCtx);
}

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [dragging, setDragging] = useState<ComponentDefinition | null>(null);
  const [ghostPos, setGhostPos] = useState({ x: -9999, y: -9999 });

  const startDrag = useCallback((def: ComponentDefinition, e: React.DragEvent) => {
    setDragging(def);
    setGhostPos({ x: e.clientX, y: e.clientY });

    // Transparent drag image so our custom ghost shows instead
    const blank = document.createElement('div');
    blank.style.cssText = 'position:fixed;top:-999px;left:-999px;width:1px;height:1px;opacity:0;';
    document.body.appendChild(blank);
    e.dataTransfer.setDragImage(blank, 0, 0);
    setTimeout(() => document.body.removeChild(blank), 0);
  }, []);

  const endDrag = useCallback(() => {
    setDragging(null);
    setGhostPos({ x: -9999, y: -9999 });
  }, []);

  // Track cursor during drag
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: DragEvent | MouseEvent) => {
      if ((e as DragEvent).dataTransfer || e.type === 'dragover') return; // handled by drop target
      setGhostPos({ x: e.clientX, y: e.clientY });
    };
    const onDrag = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) return; // end of drag
      setGhostPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('drag', onDrag);
    return () => window.removeEventListener('drag', onDrag);
  }, [dragging]);

  return (
    <DragCtx.Provider value={{ dragging, ghostPos, startDrag, endDrag }}>
      {children}
      {/* Global floating ghost */}
      {dragging && (
        <DragGhost def={dragging} pos={ghostPos} />
      )}
    </DragCtx.Provider>
  );
}

function DragGhost({ def, pos }: { def: ComponentDefinition; pos: { x: number; y: number } }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {/* Symbol card */}
        <div className="bg-[#1a2035]/95 border-2 border-blue-500/60 rounded-xl shadow-2xl shadow-blue-500/20 p-3 backdrop-blur-sm">
          <svg
            viewBox="-36 -22 72 44"
            width="72"
            height="44"
            className="text-blue-300"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              color="currentColor"
              dangerouslySetInnerHTML={{ __html: def.symbol }}
            />
          </svg>
        </div>
        {/* Label pill */}
        <div className="bg-blue-600/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
          {def.label} — {def.description}
        </div>
      </div>
    </div>
  );
}
