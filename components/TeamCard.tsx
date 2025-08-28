import React, { useCallback, useEffect, useState } from 'react';
import ColorPicker from './ColorPicker';

export type Team = {
  id: string;
  name: string;
  owner: string;
  mascot: string;
  primary: string;
  secondary: string;
  seed: number;
  logoUrl?: string;
  generating?: boolean;
};

type Props = {
  team: Team;
  onUpdate: (patch: Partial<Team>) => void;
  onGenerate: () => Promise<void> | void;
  onOpenImage: () => void;
};

export default function TeamCard({ team, onUpdate, onGenerate, onOpenImage }: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [canShare, setCanShare] = useState(false);

  // Detect Web Share API on client only to avoid SSR issues
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      setCanShare(true);
    }
  }, []);

  const newSeed = useCallback(() => {
    onUpdate({ seed: Math.floor(Math.random() * 10_000) + 1 });
  }, [onUpdate]);

  const download = useCallback(async () => {
    if (!team.logoUrl) return;
    const a = document.createElement('a');
    a.href = team.logoUrl;
    a.download = `${team.name.replace(/\s+/g, '_')}_logo.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [team.logoUrl, team.name]);

  const copyUrl = useCallback(async () => {
    if (!team.logoUrl) return;
    try {
      await navigator.clipboard.writeText(team.logoUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      // ignore
    }
  }, [team.logoUrl]);

  const share = useCallback(async () => {
    if (!team.logoUrl) return;
    if (canShare) {
      try {
        await (navigator as any).share({ title: team.name, url: team.logoUrl });
      } catch {
        // user canceled share; ignore
      }
    } else {
      await copyUrl();
    }
  }, [canShare, copyUrl, team.logoUrl, team.name]);

  return (
    <div className="card overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Left: Image */}
        <div className="w-40 shrink-0">
          <div className="aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-center">
            {team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logoUrl}
                alt={`${team.name} logo`}
                className="h-full w-full object-cover cursor-zoom-in"
                onClick={onOpenImage}
              />
            ) : (
              <div className="text-center text-xs text-[var(--muted)] px-3">No logo yet — generate to preview</div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button className="btn btn-ghost w-full" onClick={onOpenImage} disabled={!team.logoUrl}>Open</button>
            <button className="btn btn-ghost w-full" onClick={download} disabled={!team.logoUrl}>Download</button>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate">
              <h3 className="text-sm font-semibold truncate">{team.name}</h3>
              <p className="text-[10px] text-[var(--muted)] truncate">{team.owner}</p>
            </div>
            <span className="badge">ID {team.id}</span>
          </div>

          <div className="mt-3 grid gap-2">
            <label className="text-xs flex items-center gap-2">
              <span className="w-16 text-[var(--muted)]">Mascot</span>
              <input
                value={team.mascot}
                onChange={(e) => onUpdate({ mascot: e.target.value })}
                className="flex-1 rounded-md bg-[var(--card)] border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="e.g., wolf"
              />
            </label>

            <ColorPicker label="Primary" value={team.primary} onChange={(v) => onUpdate({ primary: v })} />
            <ColorPicker label="Secondary" value={team.secondary} onChange={(v) => onUpdate({ secondary: v })} />

            <label className="text-xs flex items-center gap-2">
              <span className="w-16 text-[var(--muted)]">Seed</span>
              <input
                type="number"
                value={team.seed}
                onChange={(e) => onUpdate({ seed: parseInt(e.target.value || '0', 10) || 1 })}
                className="w-28 rounded-md bg-[var(--card)] border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                min={1}
              />
              <button className="btn btn-ghost" onClick={newSeed}>New Seed</button>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn btn-primary" onClick={onGenerate} disabled={!!team.generating}>
              {team.generating ? 'Generating…' : 'Generate'}
            </button>
            <button className="btn" onClick={share} disabled={!team.logoUrl}>
              {canShare ? 'Share' : (copyState === 'copied' ? 'Copied!' : 'Copy URL')}
            </button>
          </div>
        </div>
      </div>

      {/* Color chips footer */}
      <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded" style={{ background: team.primary }} />
          <div className="h-5 w-5 rounded border border-[var(--border)]" style={{ background: team.secondary }} />
        </div>
        {team.logoUrl ? <span className="text-[10px] text-[var(--muted)] truncate max-w-[60%]">{team.logoUrl}</span> : <span className="text-[10px] text-[var(--muted)]">No image yet</span>}
      </div>
    </div>
  );
}
