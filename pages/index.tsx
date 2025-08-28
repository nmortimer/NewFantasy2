import { FormEvent, useCallback, useEffect, useState } from 'react';
import TeamCard, { Team } from '../components/TeamCard';
import Modal from '../components/Modal';
import RotaryKnob from '../components/RotaryKnob';

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
  { name: 'Chargers',      primary: '#0073CF', secondary: '#FFC20E' }
];

const STYLE_LABELS = ['Modern', 'Geometric', 'Symmetric', 'Dynamic', 'Retro', 'Rounded'] as const;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function HomePage() {
  const [provider, setProvider] = useState<Provider>('sleeper');
  const [leagueId, setLeagueId] = useState('');
  const [espnSWID, setEspnSWID] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  const [leagueStyle, setLeagueStyle] = useState<number>(0);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    setTeams(prev => prev.map(t => ({ ...t, style: typeof t.style === 'number' ? t.style : leagueStyle })));
  }, [leagueStyle]);

  const applyNFLPalette = useCallback(() => {
    setTeams(prev =>
      prev.map((t, i) => {
        const p = NFL_PALETTE[i % NFL_PALETTE.length];
        return { ...t, primary: p.primary, secondary: p.secondary };
      })
    );
  }, []);

  const remixPalette = useCallback(() => {
    setTeams(prev =>
      prev.map(t => {
        const p = NFL_PALETTE[Math.floor(Math.random() * NFL_PALETTE.length)];
        return { ...t, primary: p.primary, secondary: p.secondary };
      })
    );
  }, []);

  const applyLeagueStyleToAll = useCallback(() => {
    setTeams(prev => prev.map(t => ({ ...t, style: leagueStyle })));
  }, [leagueStyle]);

  const handleLoadLeague = useCallback(
    async (e: FormEvent) => {
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
          const base = NFL_PALETTE[idx % NFL_PALETTE.length];
          return {
            id: t.id?.toString() ?? `${idx + 1}`,
            name,
            owner: t.owner || '',
            mascot: name,
            primary: t.primary || base.primary,
            secondary: t.secondary || base.secondary,
            seed: Math.floor(Math.random() * 10000) + 1,
            style: leagueStyle,
            logoUrl: '',
            rawUrl: '',
            generating: false
          };
        });

        setTeams(mapped);
        const params = new URLSearchParams({ provider, leagueId: leagueId.trim() });
        if (typeof window !== 'undefined')
          window.history.replaceState(null, '', `?${params.toString()}`);
      } catch (err) {
        console.error(err);
        alert('Could not load league. Double-check provider/ID (ESPN may require SWID/S2).');
      } finally {
        setLoading(false);
      }
    },
    [provider, leagueId, espnSWID, espnS2, leagueStyle]
  );

  const updateTeam = useCallback((id: string, patch: Partial<Team>) => {
    setTeams(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const generateLogo = useCallback(
    async (team: Team) => {
      setTeams(prev => prev.map(t => (t.id === team.id ? { ...t, generating: true } : t)));
      try {
        const res = await fetch('/api/generate-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team })
        });
        if (!res.ok) throw new Error(`Gen failed: ${res.status}`);
        const data = await res.json();
        const remoteUrl: string = data.url;

        const { postProcessLogo } = await import('../lib/postprocess');
        const pngUrl = await postProcessLogo(remoteUrl, team.primary, team.secondary);

        setTeams(prev =>
          prev.map(t => (t.id === team.id ? { ...t, logoUrl: pngUrl, rawUrl: remoteUrl } : t))
        );
      } catch (e) {
        console.error(e);
        alert(`Logo generation failed for ${team.name}. Try again.`);
      } finally {
        setTeams(prev => prev.map(t => (t.id === team.id ? { ...t, generating: false } : t)));
      }
    },
    []
  );

  const generateAll = useCallback(async () => {
    if (!teams.length || bulkRunning) return;
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: teams.length });

    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      let attempt = 0;
      let success = false;
      while (attempt < 3 && !success) {
        try {
          await generateLogo(t);
          success = true;
        } catch {
          attempt++;
          await sleep(300 * attempt);
        }
      }
      setBulkProgress({ done: i + 1, total: teams.length });
      await sleep(200);
    }

    setBulkRunning(false);
  }, [teams, generateLogo, bulkRunning]);

  const clearAll = useCallback(() => {
    setTeams(prev => prev.map(t => ({ ...t, logoUrl: '', rawUrl: '' })));
  }, []);

  if (!teams.length) {
    return (
      <>
        <header className="border-b border-[var(--border)] bg-[var(--panel)]/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between gap-3">
            <div className="rounded-xl bg-[var(--accent2)]/15 px-3 py-2 text-sm font-extrabold text-[var(--accent2)]">
              Fantasy Logo Studio
            </div>
            <div className="text-xs text-[var(--muted)]">Free • No API keys • Download-ready</div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4">
          <section className="py-10 md:py-14 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold">
              Instant, professional NFL-style logos for your fantasy league
            </h1>
            <p className="mt-3 text-[var(--muted)] max-w-2xl mx-auto">
              Pick a league style, load teams, and generate bold text-free emblems. PNG downloads included.
            </p>

            <div className="mt-6 panel inline-block text-left">
              <div className="flex items-center gap-6 p-4">
                <div>
                  <div className="text-xs text-[var(--muted)]">League Style</div>
                  <div className="text-sm font-semibold">{STYLE_LABELS[leagueStyle]}</div>
                </div>
                <RotaryKnob value={leagueStyle} onChange={setLeagueStyle} size={92} ariaLabel="League style flavor" />
              </div>
            </div>

            <form onSubmit={handleLoadLeague} className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <select
                value={provider}
                onChange={e => setProvider(e.target.value as Provider)}
                className="input text-sm w-[130px]"
                aria-label="Provider"
              >
                <option value="sleeper">Sleeper</option>
                <option value="mfl">MFL</option>
                <option value="espn">ESPN</option>
              </select>
              <input
                className="input text-sm w-[240px]"
                placeholder="League ID"
                value={leagueId}
                onChange={e => setLeagueId(e.target.value)}
              />
              {provider === 'espn' && (
                <>
                  <input
                    className="input text-sm w-[220px]"
                    placeholder="ESPN SWID"
                    value={espnSWID}
                    onChange={e => setEspnSWID(e.target.value)}
                  />
                  <input
                    className="input text-sm w-[180px]"
                    placeholder="ESPN S2"
                    value={espnS2}
                    onChange={e => setEspnS2(e.target.value)}
                  />
                </>
              )}
              <button disabled={loading} className="btn btn-primary">
                {loading ? 'Loading…' : 'Load League'}
              </button>
            </form>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--panel)]/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <div className="rounded-xl bg-[var(--accent2)]/15 px-3 py-2 text-sm font-extrabold text-[var(--accent2)]">
            Fantasy Logo Studio
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs text-[var(--muted)]">Style</span>
              <RotaryKnob value={leagueStyle} onChange={setLeagueStyle} size={64} ariaLabel="League style flavor" />
              <span className="text-xs font-semibold">{STYLE_LABELS[leagueStyle]}</span>
              <button className="btn text-xs" onClick={applyLeagueStyleToAll}>
                Apply to all teams
              </button>
            </div>

            <button onClick={applyNFLPalette} className="btn">Apply NFL Palette</button>
            <button onClick={remixPalette} className="btn">Remix</button>
            <button onClick={generateAll} className="btn btn-primary" disabled={bulkRunning}>
              {bulkRunning ? `Generating… ${bulkProgress.done}/${bulkProgress.total}` : 'Generate All'}
            </button>
            <button onClick={clearAll} className="btn">Clear</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onUpdate={patch => updateTeam(team.id, patch)}
              onGenerate={() => generateLogo(team)}
              onOpenImage={() => team.logoUrl && setImageModalUrl(team.logoUrl)}
            />
          ))}
        </div>
      </main>

      <Modal isOpen={!!imageModalUrl} onClose={() => setImageModalUrl(null)} title="Logo Preview">
        {imageModalUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageModalUrl} alt="Generated logo full" className="rounded-xl shadow-lg max-h-[75vh] object-contain mx-auto" />
        )}
      </Modal>
    </>
  );
}
