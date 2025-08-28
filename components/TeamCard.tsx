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
  const [copyState, setCopyState] = useState<'idle'|'copied'>('idle');
  const [canShare, setCanShare] = useState(false);
  const [open, setOpen] = useState(false); // edit drawer

  useEffect(() => { if (typeof navigator !== 'undefined' && 'share' in navigator) setCanShare(true); }, []);

  const newSeed = useCallback(() => onUpdate({ seed: Math.floor(Math.random()*10_000)+1 }), [onUpdate]);

  const download = useCallback(async () => {
    if (!team.logoUrl) return;
    const a = document.createElement('a');
    a.href = team.logoUrl;
    a.download = `${team.name.replace(/\s+/g,'_')}_logo.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }, [team.logoUrl, team.name]);

  const copyUrl = useCallback(async () => {
    if (!team.logoUrl) return;
    try {
      await navigator.clipboard.writeText(team.logoUrl);
      setCopyState('copied'); setTimeout(()=>setCopyState('idle'),1200);
    } catch {}
  }, [team.logoUrl]);

  const share = useCallback(async () => {
    if (!team.logoUrl) return;
    if (canShare) { try { await (navigator as any).share({ title: team.name, url: team.logoUrl }); } catch {} }
    else { await copyUrl(); }
  }, [canShare, copyUrl, team.logoUrl, team.name]);

  return (
    <div className="card p-4 flex flex-col">
      {/* Top row: name + tiny badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{team.name}</h3>
          <p className="text-[10px] text-[var(--muted)] truncate">{team.owner || '—'}</p>
        </div>
        <span className="badge">#{team.id}</span>
      </div>

      {/* IMAGE */}
      <div className="mt-3 logo-frame cursor-zoom-in" onClick={team.logoUrl ? onOpenImage : undefined}>
        {team.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logoUrl} alt={`${team.name} logo`} className="h-full w-full object-cover" />
        ) : (
          <div className="text-center text-xs text-[var(--muted)] px-3">No logo yet — generate to preview</div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="mt-3 flex items-center justify-between">
        <div className="iconbar">
          <button className="iconbtn" title="Generate" onClick={onGenerate} disabled={!!team.generating}>
            {team.generating ? '…' : '⚡'}
          </button>
          <button className="iconbtn" title="Open" onClick={onOpenImage} disabled={!team.logoUrl}>🔍</button>
          <button className="iconbtn" title="Download" onClick={download} disabled={!team.logoUrl}>⬇️</button>
          <button className="iconbtn" title={canShare ? 'Share' : 'Copy URL'} onClick={share} disabled={!team.logoUrl}>
            {canShare ? '📤' : (copyState === 'copied' ? '✅' : '🔗')}
          </button>
        </div>
        <button className="btn btn-ghost text-xs" onClick={()=>setOpen(s=>!s)}>{open ? 'Close' : 'Edit'}</button>
      </div>

      {/* COLORS STRIP */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded" style={{ background: team.primary }} />
          <div className="h-5 w-5 rounded border border-[var(--border)]" style={{ background: team.secondary }} />
        </div>
        <span className="text-[10px] text-[var(--muted)] truncate max-w-[60%]">{team.logoUrl ? team.logoUrl : 'No image yet'}</span>
      </div>

      {/* EDIT DRAWER */}
      {open && (
        <div className="drawer">
          <div className="grid gap-2">
            <label className="text-xs flex items-center gap-2">
              <span className="w-16 text-[var(--muted)]">Mascot</span>
              <input
                value={team.mascot}
                onChange={(e)=>onUpdate({ mascot: e.target.value })}
                className="input flex-1 text-xs"
                placeholder="e.g., wolf"
              />
            </label>

            <ColorPicker label="Primary" value={team.primary} onChange={(v)=>onUpdate({ primary: v })} />
            <ColorPicker label="Secondary" value={team.secondary} onChange={(v)=>onUpdate({ secondary: v })} />

            <label className="text-xs flex items-center gap-2">
              <span className="w-16 text-[var(--muted)]">Seed</span>
              <input
                type="number"
                value={team.seed}
                onChange={(e)=>onUpdate({ seed: parseInt(e.target.value||'0',10)||1 })}
                className="input w-28 text-xs"
                min={1}
              />
              <button className="btn btn-ghost text-xs" onClick={newSeed}>New Seed</button>
              <button className="btn btn-success text-xs" onClick={onGenerate} disabled={!!team.generating}>
                {team.generating ? 'Generating…' : 'Generate'}
              </button>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
