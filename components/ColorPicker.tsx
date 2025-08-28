import React from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
};

export default function ColorPicker({ label, value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-16 text-[var(--muted)]">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 rounded-md border border-[var(--border)] bg-[var(--card)]"
        aria-label={label}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md bg-[var(--card)] border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        placeholder="#000000"
      />
    </label>
  );
}
