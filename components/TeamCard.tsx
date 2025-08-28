import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

// Local helper to convert a full team name into a mascot guess
function deriveMascotFromName(name: string): string {
  const n = (name || '').toLowerCase();
  const map: Record<string, string> = {
    bears: 'bear', cubs: 'bear',
    lions: 'lion', tigers: 'tiger',
    wolves: 'wolf', wolfpack: 'wolf', timberwolves: 'wolf',
    eagles: 'eagle', hawks: 'hawk', falcons: 'falcon',
    ravens: 'raven', crows: 'raven',
    broncos: 'stallion', mustangs: 'stallion', colts: 'stallion', horses: 'stallion',
    panthers: 'panther', jaguars: 'jaguar', leopards: 'leopard',
    sharks: 'shark', dolphins: 'dolphin',
    bulls: 'bull', bison: 'bison', buffaloes: 'bison',
    vikings: 'viking', knights: 'knight', pirates: 'pirate', buccaneers: 'pirate',
    rams: 'ram', foxes: 'fox', gorillas: 'gorilla', gators: 'alligator', crocodiles: 'crocodile',
    dragons: 'dragon', wolves2: 'wolf'
  };
  for (const k of Object.keys(map)) if (n.includes(k)) return map[k];
  const fallbacks = ['wolf','bear','eagle','hawk','dragon','knight','viking','pirate','bull','tiger','panther','raven','shark','stallion','bison','ram','fox','gorilla'];
  for (const f of fallbacks) if (n.includes(f)) return f;
  return 'wolf';
}

export default function TeamCard({ team, onUpdate, onGenerate, onOpenImage }: Props) {
  const [copyState, setCopyState] = useState<'idle'|'copied'>('idle');
  const [canShare, setCanShare] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { if (typeof navigator !== 'undefined' && 'share' in navigator) setCanShare(true); }, []);

  const newSeed = useCallback(() => onUpdate({ seed: Math.floor(Math.random() * 10_000) + 1 }), [onUpdate]);

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
    } catch {}
  }, [team.logoUrl]);

  const share = useCallback(async () => {
    if (!team.logoUrl) return;
    if (canShare) {
      try { await (navigator as any).share({ title: team.name, url: team.logoUrl }); } catch {}
    } else {
      await copyUrl();
    }
  }, [canShare, copyUrl, team.logoUrl, team.name]);

  // If mascot field is empty, show a live suggestion derived from the team name
  const suggestedMascot = useMemo(() => deriveMascotFromName(team.name), [team.name]);

  return (
    <div className="card overflow-hidden p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Show full team name (wrap) so users see what the logo is based on */}
          <h3 className="text-sm font-semibold leading-tight break-words">{team.name}</h3>
          <p className="text-[10px] text-[var(--muted)]">{team.owner || '—'}</p>
        </div>
        <span className="badge">#{team.id}</span>
      </div>

      {/* Image */}
      <div className="mt-3 logo-frame">
        {team.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logoUrl} alt={`${team.name} logo`} className="h-full w-full object-cover" />
        ) : (
          <div className="text-center text-xs text-[var(--muted)] px-3">No logo yet — generate to preview</div>
        )}
      </div>

      {/* Primary Actions */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn btn-primary" onClick={onGenerate} disabled={!!team.generating}>
          {team.generating ? 'Generating…' : 'Generate Logo'}
        </button>
        <button className="btn" onClick={() => setOpen((s) => !s)}>{open ? 'Close' : 'Edit Logo'}</button>
      </div>

      {/* Secondary actions */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button className="btn" onClick={onOpenImage} disabled={!team.logoUrl}>Open</button>
        <button className="btn" onClick={download} disabled={!team.logoUrl}>Download</button>
        <button className="btn" onClick={share} disabled={!team.logoUrl}>
          {canShare ? 'Share' : (copyState === 'copied' ? 'Copied!' : 'Copy URL')}
        </button>
      </div>

      {/* Color strip + URL */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded" style={{ background: team.primary }} />
          <div className="h-5 w-5 rounded border border-[var(--border)]" style={{ background: team.secondary }} />
        </div>
        <span className="text-[10px] text-[var(--muted)] truncate max-w-[60%]">
          {team.logoUrl ? team.logoUrl : 'No image yet'}
        </span>
      </div>

      {/* Edit Drawer */}
      {open && (
        <div className="drawer">
          <div className="grid gap-3">
            {/* Team Name drives mascot suggestion */}
            <label className="text-xs flex items-center gap-2">
              <span className="w-20 text-[var(--muted)]">Team Name</span>
              <input
                value={team.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="input flex-1 text-xs"
                placeholder="e.g., Swedish Arctic Foxes"
              />
            </label>

            <label className="text-xs flex items-center gap-2">
              <span className="w-20 text-[var(--muted)]">Mascot</span>
              <input
                value={team.mascot}
                onChange={(e) => onUpdate({ mascot: e.target.value })}
                className="input flex-1 text-xs"
                placeholder="e.g., fox"
              />
              {/* Helper: set mascot from the full team name */}
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => onUpdate({ mascot: suggestedMascot })}
                title={`Use "${suggestedMascot}" from team name`}
              >
                From Name → {suggestedMascot}
              </button>
            </label>

            <ColorPicker label="Primary" value={team.primary} onChange={(v) => onUpdate({ primary: v })} />
            <ColorPicker label="Secondary" value={team.secondary} onChange={(v) => onUpdate({ secondary: v })} />

            <label className="text-xs flex items-center gap-2">
              <span className="w-20 text-[var(--muted)]">Seed</span>
              <input
                type="number"
                value={team.seed}
                onChange={(e) => onUpdate({ seed: parseInt(e.target.value || '0', 10) || 1 })}
                className="input w-28 text-xs"
                min={1}
              />
              <button className="btn" onClick={newSeed}>New Seed</button>
              <button className="btn btn-success" onClick={onGenerate} disabled={!!team.generating}>
                {team.generating ? 'Generating…' : 'Generate from these settings'}
              </button>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
