import React, { useEffect, useRef, useState } from 'react';

type Props = {
  value: number;          // 0..5
  onChange: (v: number) => void;
  size?: number;
  ariaLabel?: string;
};

export default function RotaryKnob({ value, onChange, size = 72, ariaLabel = 'Style knob' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);

  // Discrete 6 stops around a circle
  const stops = 6;
  const angle = (value / stops) * 300 - 150; // -150deg..+150deg range

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      if (!isDown) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = (e.clientX - cx);
      const y = (e.clientY - cy);
      const deg = (Math.atan2(y, x) * 180) / Math.PI; // -180..180
      // Map deg (-150..150) to 0..stops-1
      const clamped = Math.max(-150, Math.min(150, deg));
      const t = (clamped + 150) / 300; // 0..1
      const idx = Math.round(t * (stops - 1));
      onChange(idx);
    };

    const onUp = () => setIsDown(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDown, onChange]);

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value}
      className="relative rounded-full bg-[var(--card-2)] border border-[var(--border)] shadow-inner"
      style={{ width: size, height: size }}
      onPointerDown={() => setIsDown(true)}
    >
      {/* marks */}
      {[...Array(6)].map((_, i) => {
        const a = (i / stops) * 300 - 150;
        const r = size / 2 - 6;
        const x = size / 2 + r * Math.cos((a * Math.PI) / 180);
        const y = size / 2 + r * Math.sin((a * Math.PI) / 180);
        return (
          <div
            key={i}
            className={`absolute h-1 w-1 rounded-full ${i === value ? 'bg-[var(--accent2)]' : 'bg-[var(--muted)]/60'}`}
            style={{ left: x - 2, top: y - 2 }}
          />
        );
      })}
      {/* pointer */}
      <div
        className="absolute left-1/2 top-1/2 h-[70%] w-[2px] bg-[var(--accent2)] origin-bottom"
        style={{ transform: `translate(-50%, -100%) rotate(${angle}deg)` }}
      />
      {/* center dot */}
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--panel)] border border-[var(--border)]" />
    </div>
  );
}
