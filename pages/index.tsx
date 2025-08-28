import { FormEvent, useCallback, useMemo, useState } from 'react';
import TeamCard, { Team } from '../components/TeamCard';
import Modal from '../components/Modal';

type Provider = 'sleeper' | 'mfl' | 'espn';

const NFL_PALETTE: Array<{ primary: string; secondary: string; name: string }> = [
  { name: 'Chiefs',        primary: '#E31837', secondary: '#FFB612' },
  { name: 'Packers',       primary: '#203731', secondary: '#FFB612' },
  { name: 'Bears',         primary: '#0B162A', secondary: '#C83803' },
  { name: 'Broncos',       primary: '#0A2342', secondary: '#FB4F14' },
  { name: 'Seahawks',      primary: '#002244', secondary: '#69BE28' },
  { name: 'Vikings',       primary: '#4F2683', secondary: '#FFC62F' },
  { name: 'Dolphins',      primary: '#008E97', secondary: '#FC4C02' },
  { name: '49ers',         primary: '#AA0000', secondary: '#B3995D' },
  { name: 'Raiders',       primary: '#000000', secondary: '#A5ACAF' },
  { name: 'Cowboys',       primary: '#041E42', secondary: '#869397' },
  { name: 'Giants',        primary: '#0B2265', secondary: '#A71930' },
  { name: 'Bills',         primary: '#00338D', secondary: '#C60C30' },
  { name: 'Jets',          primary: '#125740', secondary: '#FFFFFF' },
  { name: 'Ravens',        primary: '#241773', secondary: '#000000' },
  { name: 'Panthers',      primary: '#0085CA', secondary: '#101820' },
  { name: 'Jaguars',       primary: '#006778', secondary: '#9F792C' },
  { name: 'Saints',        primary: '#101820', secondary: '#D3BC8D' },
  { name: 'Patriots',      primary: '#002244', secondary: '#C60C30' },
  { name: 'Buccaneers',    primary: '#D50A0A', secondary: '#34302B' },
  { name: 'Chargers',      primary: '#0073CF', secondary: '#FFC20E' },
];

const FALLBACK_MASCOTS = [
  'wolf', 'bear', 'eagle', 'hawk', 'dragon', 'knight', 'viking', 'pirate',
  'bull', 'tiger', 'panther', 'raven', 'shark', 'stallion', 'bison', 'ram', 'fox', 'gorilla'
];

function deriveMascot(name: string): string {
  const n = (name || '').toLowerCase();
  const map: Record<string, string> = {
    bears: 'bear', cubs: 'bear',
    lions: 'lion', tigers: 'tiger',
    wolves: 'wolf', wolfpack: 'wolf', timberwolves: 'wolf',
    eagles: 'eagle', hawks: 'hawk', falcons: 'falcon',
    ravens: 'raven', crows: 'raven',
    broncos: 'stallion', mustangs: 'stallion', colts: 'stallion', horses: 'stallion',
    panthers: 'panther', jaguars: 'jaguar', leopards: 'leopard',
    sharks: 'shark',
    bulls: 'bull', bison: 'bison', buffaloes: 'bison',
    vikings: 'viking', knights: 'knight', pirates: 'pirate', buccaneers: 'pirate',
    rams: 'ram', foxes: 'fox', gorillas: 'gorilla', gators: 'alligator', crocodiles: 'crocodile'
  };
  for (const key of Object.keys(map)) {
    if (n.includes(key)) return map[key];
  }
  // Single-word hints
  const hints = ['bear','wolf','eagle','hawk','dragon','knight','viking','pirate','bull','tiger','panther','raven','shark','stallion','bison','ram','fox','gorilla'];
  for (const h of hints) if (n.includes(h)) return h;
  return FALLBACK_MASCOTS[Math.floor(Math.random() * FALLBACK_MASCOTS.length)];
}

export default function HomePage() {
  const [provider, setProvider] = useState<Provider>('sleeper');
  const [leagueId, setLeagueId] = useState('');
  const [espnSWID, setEspnSWID] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [commissionerMode, setCommissionerMode] = useState(true);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  const palettePreview = useMemo(() => NFL_PALETTE.slice(0, Math.max(3, Math.min(6, teams.length || 6))), [teams.length]);

  const applyNFLPalette = useCallback(() => {
    setTeams((prev) =>
      prev.map((t, i) => {
        const p = NFL_PALETTE[i % NFL_PALETTE.length];
        return { ...t, primary: p.primary, secondary: p.secondary };
      })
    );
  }, []);

  const remixPalette = useCallback(() => {
    setTeams((prev) =>
      prev.map((t) => {
        const p = NFL_PALETTE[Math.floor(Math.random() * NFL_PALETTE.length)];
        return { ...t, primary: p.primary, secondary: p.secondary };
      })
    );
  }, []);

  const handleLoadLeague = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!leagueId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          leagueId: leagueId.trim(),
          swid: espnSWID || undefined,
          s2: espnS2 || undefined
        })
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      const mapped: Team[] = (data.teams || []).map((t: any, idx: number) => {
        const name = t.name || `Team ${idx + 1}`;
        const mascot = t.mascot || deriveMascot(name);
        const base = NFL_PALETTE[idx % NFL_PALETTE.length];
        return {
          id: t.id?.toString() ?? `${idx + 1}`,
          name,
          owner: t.owner || '',
          mascot,
          primary: t.primary || base.primary,
          secondary: t.secondary || base.secondary,
          seed: t.seed || Math.floor(Math.random() * 10_000) + 1,
          logoUrl: t.logoUrl || ''
        };
      });
      setTeams(mapped);
    } catch (err) {
      console.error(err);
      alert('Could not load league. Double-check provider and ID (ESPN may require SWID/S2).');
    } finally {
      setLoading(false);
    }
  }, [provider, leagueId, espnSWID, espnS2]);

  const updateTeam = useCallback((id: string, patch: Partial<Team>) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const generateLogo = useCallback(async (team: Team) => {
    updateTeam(team.id, { generating: true });
    try {
      const res = await fetch('/api/generate-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team })
      });
      if (!res.ok) throw new Error(`Gen failed: ${res.status}`);
      const data = await res.json();
      updateTeam(team.id, { logoUrl: data.url });
    } catch (e) {
      console.error(e);
      alert(`Logo generation failed for ${team.name}. Try again.`);
    } finally {
      updateTeam(team.id, { generating: false });
    }
  }, [updateTeam]);

  const generateAll = useCallback(async () => {
    // Simple concurrency limiter (2 at a time) to be nice to the free API
    const queue = [...teams];
    const running: Promise<void>[] = [];
    const worker = async (t: Team) => { await generateLogo(t); };
    while (queue.length) {
      while (running.length < 2 && queue.length) {
        const t = queue.shift()!;
        const p = worker(t).finally(() => {
          const idx = running.indexOf(p);
          if (idx >= 0) running.splice(idx, 1);
        });
        running.push(p);
      }
      // eslint-disable-next-line no-await-in-loop
      await Promise.race(running);
    }
    await Promise.all(running);
  }, [teams, generateLogo]);

  const clearAll = useCallback(() => {
    setTeams((prev) => prev.map((t) => ({ ...t, logoUrl: '' })));
  }, []);

  return (
    <>
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--panel)]/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--accent2)]/15 px-3 py-2 text-sm font-semibold text-[var(--accent2)] shadow-[var(--shadow)]">
              Fantasy Logo Studio
            </div>
            <span className="hidden md:inline text-sm text-[var(--muted)]">Generate clean, NFL-style logos with your own colors.</span>
          </div>

          <form onSubmit={handleLoadLeague} className="flex flex-col md:flex-row gap-2 md:items-center">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="rounded-lg bg-[var(--card)] text-sm px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Provider"
            >
              <option value="sleeper">Sleeper</option>
              <option value="mfl">MFL</option>
              <option value="espn">ESPN</option>
            </select>
            <input
              placeholder="League ID"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="rounded-lg bg-[var(--card)] text-sm px-3 py-2 border border-[var(--border)] w-48 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            {provider === 'espn' && (
              <>
                <input
                  placeholder="ESPN SWID (e.g. {XXXX-...})"
                  value={espnSWID}
                  onChange={(e) => setEspnSWID(e.target.value)}
                  className="rounded-lg bg-[var(--card)] text-sm px-3 py-2 border border-[var(--border)] w-56 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <input
                  placeholder="ESPN S2"
                  value={espnS2}
                  onChange={(e) => setEspnS2(e.target.value)}
                  className="rounded-lg bg-[var(--card)] text-sm px-3 py-2 border border-[var(--border)] w-52 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </>
            )}
            <button disabled={loading} className="btn btn-primary">
              {loading ? 'Loading…' : 'Load League'}
            </button>
          </form>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="panel space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">Mode</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${commissionerMode ? 'opacity-60' : 'opacity-100'}`}>Manager</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={commissionerMode}
                  onChange={(e) => setCommissionerMode(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full bg-[var(--border)] peer-checked:bg-[var(--accent)] transition"></div>
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white peer-checked:translate-x-5 transition"></div>
              </label>
              <span className={`text-xs ${commissionerMode ? 'opacity-100' : 'opacity-60'}`}>Commish</span>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">League Colors</h3>
              <span className="badge">NFL-Inspired</span>
            </div>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {palettePreview.map((p, i) => (
                <div key={i} className="flex">
                  <div className="h-6 w-6 rounded-l" style={{ background: p.primary }} />
                  <div className="h-6 w-6 rounded-r border border-[var(--border)]" style={{ background: p.secondary }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={applyNFLPalette} className="btn btn-secondary w-full">Apply NFL Palette</button>
              <button onClick={remixPalette} className="btn w-full">Remix Palette</button>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4 space-y-2">
            <button onClick={generateAll} disabled={!teams.length} className="btn btn-primary w-full">Generate All</button>
            <button onClick={clearAll} disabled={!teams.length} className="btn w-full">Clear Logos</button>
          </div>

          {!teams.length && (
            <p className="text-xs text-[var(--muted)] pt-2">
              Load a league to populate team cards. Click a logo preview to open it in a modal. No paid keys required.
            </p>
          )}
        </aside>

        {/* Team Grid */}
        <section>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onUpdate={(patch) => updateTeam(team.id, patch)}
                onGenerate={() => generateLogo(team)}
                onOpenImage={() => team.logoUrl && setImageModalUrl(team.logoUrl)}
              />
            ))}
          </div>
        </section>
      </main>

      <Modal
        isOpen={!!imageModalUrl}
        onClose={() => setImageModalUrl(null)}
        title="Logo Preview"
      >
        {imageModalUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageModalUrl} alt="Generated logo full" className="rounded-xl shadow-lg max-h-[75vh] object-contain mx-auto" />
        )}
      </Modal>

      <footer className="py-8 text-center text-xs text-[var(--muted)]">
        Built for commissioners & managers. Images generated via Pollinations (free).
      </footer>
    </>
  );
}
