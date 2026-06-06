import { useRef, type ReactNode } from 'react';

const PEEK = 92; // px of the sheet visible when collapsed

function restingTransform(open: boolean) {
  return open ? 'translateY(0)' : `translateY(calc(100% - ${PEEK}px))`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peek: ReactNode; // always-visible header row (drag handle area)
  children: ReactNode; // scrollable body, shown when expanded
};

/**
 * Mobile bottom sheet with two snap points (peek / expanded), draggable by its
 * handle. Non-modal: the map stays visible and interactive behind it.
 */
export default function BottomSheet({ open, onOpenChange, peek, children }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; base: number; height: number; active: boolean }>({
    startY: 0,
    base: 0,
    height: 0,
    active: false,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    const el = elRef.current;
    if (!el) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const height = el.clientHeight;
    drag.current = {
      startY: e.clientY,
      base: open ? 0 : height - PEEK,
      height,
      active: true,
    };
    el.style.transition = 'none';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = elRef.current;
    const d = drag.current;
    if (!el || !d.active) return;
    const dy = e.clientY - d.startY;
    const ty = Math.min(Math.max(d.base + dy, 0), d.height - PEEK);
    el.style.transform = `translateY(${ty}px)`;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const el = elRef.current;
    const d = drag.current;
    if (!el || !d.active) return;
    d.active = false;
    const dy = e.clientY - d.startY;
    // Decide snap: small intentional drag flips state; otherwise nearest.
    let next = open;
    if (dy < -40) next = true;
    else if (dy > 40) next = false;
    el.style.transition = '';
    el.style.transform = restingTransform(next);
    if (next !== open) onOpenChange(next);
  };

  return (
    <div
      ref={elRef}
      className="fixed inset-x-0 bottom-0 z-[1500] h-[86vh] rounded-t-3xl border-t border-white/10 bg-ink-900/85 backdrop-blur-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] flex flex-col"
      style={{ transform: restingTransform(open), paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Handle + peek row — the drag target */}
      <div
        className="no-tap shrink-0 cursor-grab active:cursor-grabbing px-4 pt-2.5 pb-1"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => onOpenChange(!open)}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/25" />
        {peek}
      </div>
      {/* Scrollable body */}
      <div className={`min-h-0 flex-1 overflow-y-auto px-4 pb-6 ${open ? '' : 'pointer-events-none'}`}>
        {children}
      </div>
    </div>
  );
}
