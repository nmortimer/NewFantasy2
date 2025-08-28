import React from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

export default function ColorPicker({ label, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-xs text-[var(--muted)]">{label}</span>
      <input
        type="color"
        className="h-8 w-10 rounded border border-[var(--border)] bg-[var(--card-2)]"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={`${label} color`}
      />
      <input
        className="input flex-1 text-xs"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="#RRGGBB"
      />
    </div>
  );
}
