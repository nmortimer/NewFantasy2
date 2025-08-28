import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import ColorPicker from './ColorPicker';

export type Team = {
  id: string;
  name: string;
  owner: string;
  mascot: string;
  primary: string;
  secondary: string;
  seed: number;           // kept in data model, but shown to users as "Variation"
  logoUrl?: string;
  generating?: boolean;
};

type Props = {
  team: Team;
  onUpdate: (patch: Partial<Team>) => void;
  onGenerate: () => Promise<void> | void;
  onOpenImage: () => void;
};

/** Guess a mascot from the full team name (used if user doesn't specify one) */
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
    dragons: 'dragon',
  };
  for (const k of Object.keys(map)) if (n.includes(k)) return map[k];
  const fallbacks = ['wolf','bear','eagle','hawk','dragon','knight','viking','pirate','bull','tiger','panther','raven','shark','stallion','bison','ram','fox','gorilla'];
  for (const f of fallbacks) if (n.includes(f)) return f;
  return 'wolf';
}

export default function TeamCard({ team, onUpdate, onGenerate, onOpenImage }: Props) {
  const [copyState, setCopyState] = useState<'idle'|'copied'>('idle');
  const [canShare, setCanShare] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) setCanShare(true);
  }, []);

  const suggestedMascot = useMemo(() => deriveMascotFromName(team.name), [team.name]);

  const shuffleVariation = useCallback(() => {
    onUpdate({ seed: Math.floor(Math.random() * 10_000) + 1 });
  }, [onUpdate]);

  const download = useCallback(async () => {
    if (!team.logoUrl) return;
    const a = document.createElement('a');
    a.href = team.logoUrl;
    a.download = `${team.name.replace(/\s+/g, '_')}_logo.png`;
    document.body.appendChild(a); a.click(); a.remove();
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

  return (
    <>
      <div className="card p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight break-words">{team.name}</h3>
            <p className="text-[10px] text-[var(--muted)]">{team.owner || '—'}</p>
          </div>
          <span className="badge">#{team.id}</span>
        </div>

        {/* Image */}
        <div className="mt-3 aspect-square border border-[var(--border)] bg-[var(--card-2)] rounded-xl overflow-hidden">
          {team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logoUrl} alt={`${team.name} logo`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-xs text-[var(--muted)] px-3">
              No logo yet — generate to preview
            </div>
          )}
        </div>

        {/* Primary actions */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn btn-primary h-10" onClick={onGenerate} disabled={!!team.generating}>
            {team.generating ? 'Generating…' : 'Generate Logo'}
          </button>
          <button className="btn h-10" onClick={() => setEditOpen(true)}>Edit</button>
        </div>

        {/* Secondary actions */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button className="btn h-9" onClick={onOpenImage} disabled={!team.logoUrl}>Open</button>
          <button className="btn h-9" onClick={download} disabled={!team.logoUrl}>Download</button>
          <button className="btn h-9" onClick={share} disabled={!team.logoUrl}>
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
      </div>

      {/* EDIT MODAL (no card growth, no overflow) */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Logo Settings">
        <div className="grid gap-3">
          <label className="text-xs flex items-center gap-2">
            <span className="w-28 text-[var(--muted)]">Team Name</span>
            <input
              value={team.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="input flex-1 text-xs"
              placeholder="e.g., Swedish Arctic Foxes"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <label className="text-xs flex items-center gap-2">
              <span className="w-28 text-[var(--muted)]">Mascot</span>
              <input
                value={team.mascot}
                onChange={(e) => onUpdate({ mascot: e.target.value })}
                className="input flex-1 text-xs"
                placeholder="e.g., fox"
              />
            </label>
            <button
              type="button"
              className="btn text-xs"
              onClick={() => onUpdate({ mascot: suggestedMascot })}
              title={`Use mascot from team name`}
            >
              Use “{suggestedMascot}”
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorPicker label="Primary" value={team.primary} onChange={(v) => onUpdate({ primary: v })} />
            <ColorPicker label="Secondary" value={team.secondary} onChange={(v) => onUpdate({ secondary: v })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[auto_auto_1fr] gap-2 items-center">
            <label className="text-xs flex items-center gap-2">
              <span className="w-28 text-[var(--muted)]">Variation</span>
              <input
                type="number"
                value={team.seed}
                onChange={(e) => onUpdate({ seed: parseInt(e.target.value || '0', 10) || 1 })}
                className="input w-28 text-xs"
                min={1}
              />
            </label>
            <button className="btn text-xs" onClick={shuffleVariation}>Shuffle</button>
            <div className="sm:text-right">
              <button className="btn btn-primary text-xs" onClick={onGenerate} disabled={!!team.generating}>
                {team.generating ? 'Generating…' : 'Generate from these settings'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
