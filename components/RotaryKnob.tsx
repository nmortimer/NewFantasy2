import React, { useCallback, useMemo, useRef, useState } from 'react';

/**
 * RotaryKnob — a discrete rotary control with N stops (default 6, 0..5).
 * Click/drag or use arrow keys. 270° sweep (-135°..+135°).
 */
type Props = {
  value: number;                // current stop index (0..stops-1)
  onChange: (v: number) => void;
  size?: number;                // px, default 72
  stops?: number;               // default 6
  ariaLabel?: string;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function RotaryKnob({
  value,
  onChange,
  size = 72,
  stops = 6,
  ariaLabel = 'Style knob',
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const startDeg = -135;
  const endDeg = 135;
  const span = endDeg - startDeg; // 270

  const toAngle = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current!;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
      let clamped = angle;
      if (angle < startDeg) clamped = startDeg;
      if (angle > endDeg) clamped = endDeg;
      return clamped;
    },
    []
  );

  const setFromEvent = useCallback(
    (e: PointerEvent | MouseEvent | React.PointerEvent | React.MouseEvent) => {
      const any = e as any;
      const deg = toAngle(any.clientX, any.clientY);
      const t = (deg - startDeg) / span; // 0..1
      const v = Math.round(t * (stops - 1));
      onChange(clamp(v, 0, stops - 1));
    },
    [onChange, span, stops]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDragging(true);
      setFromEvent(e);
    },
    [setFromEvent]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setFromEvent(e);
    },
    [dragging, setFromEvent]
  );

  const onPointerUp = useCallback(() => setDragging(false), []);

  const angle = useMemo(
    () => startDeg + (span * clamp(value, 0, stops - 1)) / (stops - 1),
    [value, span, stops]
  );

  const tickEls = useMemo(() => {
    const arr = [];
    for (let i = 0; i < stops; i++) {
      const a = startDeg + (span * i) / (stops - 1);
      arr.push(
        <div
          key={i}
          className="absolute left-1/2 top-1/2 h-[10%] w-[2px] bg-[var(--border)] rounded"
          style={{
            transform: `rotate(${a}deg) translate(${size * 0.4}px)`,
            transformOrigin: '0 0',
            opacity: i === value ? 1 : 0.6,
          }}
        />
      );
    }
    return arr;
  }, [stops, size, value, span]);

  return (
    <div
      ref={ref}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={stops - 1}
      aria-valuenow={value}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(clamp(value - 1, 0, stops - 1));
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(clamp(value + 1, 0, stops - 1));
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative rounded-full shadow-inner select-none"
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,0.08), rgba(0,0,0,0.35))',
        boxShadow:
          'inset 0 6px 16px rgba(0,0,0,0.45), inset 0 -4px 10px rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.6)',
      }}
    >
      {tickEls}

      {/* center cap */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border)]"
        style={{
          width: size * 0.58,
          height: size * 0.58,
          background:
            'radial-gradient(50% 50% at 40% 35%, rgba(255,255,255,0.08), rgba(0,0,0,0.4))',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08)',
        }}
      />

      {/* indicator */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: size * 0.10,
          height: size * 0.10,
          background: 'var(--accent)',
          transform: `rotate(${angle}deg) translate(${size * 0.36}px)`,
          transformOrigin: 'center left',
          boxShadow: '0 0 12px rgba(56,189,248,0.45)',
        }}
      />
    </div>
  );
}
