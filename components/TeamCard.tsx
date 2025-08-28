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
  seed: number;           // kept in data model; users see "New Look" instead of a numeric control
  logoUrl?: string;
  generating?: boolean;
};

type Props = {
  team: Team;
  onUpdate: (patch: Partial<Team>) => void;
  onGenerate: () => Promise<void> | void;
  onOpenImage: () => void;
};

/** Fallback mascot guess; only used internally if team.mascot is empty */
function guessMascot(name: string): string {
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
  return 'wolf';
}

export default function TeamCard({ team, onUpdate, onGenerate, onOpenImage }: Props) {
  const [copyState, setCopyState] = useState<'idle'|'copied'>('idle');
  const [canShare, setCanShare] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { if (typeof navigator !== 'undefined' && 'share' in navigator) setCanShare(true); }, []);

  // If mascot is blank, suggest one quietly (not shown as a button anymore)
  const suggestedMascot = useMemo(() => team.mascot?.trim() || guessMascot(team.name), [team.mascot, team.name]);

  const shuffleSeed = useCallback(() => {
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

  // Modal actions
  const generateAndClose = useCallback(() => {
    setEditOpen(false);
    onGenerate();
  }, [onGenerate]);

  const newLook = useCallback(() => {
    // Shuffle style then generate; close immediately so the grid never overflows
    setEditOpen(false);
    shuffleSeed();
    onGenerate();
  }, [shuffleSeed, onGenerate]);

  // Ensure we never send empty mascot to the API
  useEffect(() => {
    if (!team.mascot || !team.mascot.trim()) {
      onUpdate({ mascot: suggestedMascot });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedMascot]);

  return (
    <>
      <div className="card p-4 flex flex-col">
        {/* Header (code pill removed) */}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight break-words">{team.name}</h3>
          <p className="text-[10px] text-[var(--muted)]">{team.owner || '—'}</p>
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

      {/* EDIT MODAL (no overflow, closes on generate) */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Logo">
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

          <label className="text-xs flex items-center gap-2">
            <span className="w-28 text-[var(--muted)]">Mascot</span>
            <input
              value={team.mascot}
              onChange={(e) => onUpdate({ mascot: e.target.value })}
              className="input flex-1 text-xs"
              placeholder="e.g., fox"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorPicker label="Primary" value={team.primary} onChange={(v) => onUpdate({ primary: v })} />
            <ColorPicker label="Secondary" value={team.secondary} onChange={(v) => onUpdate({ secondary: v })} />
          </div>

          {/* Style controls: no number field, just actions */}
          <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <span className="text-xs text-[var(--muted)]">Style</span>
            <div className="flex gap-2 sm:ml-auto">
              <button className="btn" onClick={newLook} disabled={!!team.generating}>New Look</button>
              <button className="btn btn-primary" onClick={generateAndClose} disabled={!!team.generating}>
                {team.generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
