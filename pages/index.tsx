import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
  'wolf','bear','eagle','hawk','dragon','knight','viking','pirate','bull','tiger','panther','raven','shark','stallion','bison','ram','fox','gorilla'
];

function deriveMascot(name: string): string {
  const n = (name || '').toLowerCase();
  const map: Record<string,string> = {
    bears:'bear', cubs:'bear',
    lions:'lion', tigers:'tiger',
    wolves:'wolf', wolfpack:'wolf', timberwolves:'wolf',
    eagles:'eagle', hawks:'hawk', falcons:'falcon',
    ravens:'raven', crows:'raven',
    broncos:'stallion', mustangs:'stallion', colts:'stallion', horses:'stallion',
    panthers:'panther', jaguars:'jaguar', leopards:'leopard',
    sharks:'shark',
    bulls:'bull', bison:'bison', buffaloes:'bison',
    vikings:'viking', knights:'knight', pirates:'pirate', buccaneers:'pirate',
    rams:'ram', foxes:'fox', gorillas:'gorilla', gators:'alligator', crocodiles:'crocodile'
  };
  for (const key of Object.keys(map)) if (n.includes(key)) return map[key];
  for (const h of FALLBACK_MASCOTS) if (n.includes(h)) return h;
  return FALLBACK_MASCOTS[Math.floor(Math.random()*FALLBACK_MASCOTS.length)];
}

/** ---------- Demo/Sample Gallery ---------- **/
type Sample = { mascot: string; primary: string; secondary: string; seed: number; name: string };
const SAMPLES: Sample[] = [
  { mascot:'wolf',     primary:'#00338D', secondary:'#C60C30', seed:7123, name:'Blue Wolves' },
  { mascot:'eagle',    primary:'#203731', secondary:'#FFB612', seed:8142, name:'Verdant Eagles' },
  { mascot:'tiger',    primary:'#0B162A', secondary:'#C83803', seed:5177, name:'Night Tigers' },
  { mascot:'stallion', primary:'#0A2342', secondary:'#FB4F14', seed:4409, name:'Mile High' },
  { mascot:'raven',    primary:'#241773', secondary:'#000000', seed:1903, name:'Ravencrest' },
  { mascot:'panther',  primary:'#0085CA', secondary:'#101820', seed:6611, name:'Carolina' },
  { mascot:'jaguar',   primary:'#006778', secondary:'#9F792C', seed:3302, name:'Teal Fangs' },
  { mascot:'shark',    primary:'#002244', secondary:'#69BE28', seed:9281, name:'Sound Sharks' },
  { mascot:'knight',   primary:'#4F2683', secondary:'#FFC62F', seed:2845, name:'Violet Knights' },
  { mascot:'bear',     primary:'#AA0000', secondary:'#B3995D', seed:1199, name:'Gold Bears' },
  { mascot:'viking',   primary:'#4F2683', secondary:'#FFC62F', seed:4040, name:'Nordic' },
  { mascot:'bison',    primary:'#125740', secondary:'#FFFFFF', seed:9555, name:'Prairie Bison' },
];
function sampleUrl(s: Sample) {
  const prompt = `professional american football team logo, mascot head emblem: ${s.mascot}, color palette ONLY: ${s.primary}, ${s.secondary}, white, vector, bold, high contrast, symmetrical, centered, no text, no words, no typography, no banners, no numbers, no watermark`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${s.seed}&width=640&height=640`;
}

/** ---------- Page ---------- **/
export default function HomePage() {
  const [provider, setProvider] = useState<Provider>('sleeper');
  const [leagueId, setLeagueId] = useState('');
  const [espnSWID, setEspnSWID] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  // apply & remix palette (only used after league loads)
  const applyNFLPalette = useCallback(() => {
    setTeams(prev => prev.map((t, i) => {
      const p = NFL_PALETTE[i % NFL_PALETTE.length];
      return { ...t, primary: p.primary, secondary: p.secondary };
    }));
  }, []);
  const remixPalette = useCallback(() => {
    setTeams(prev => prev.map(t => {
      const p = NFL_PALETTE[Math.floor(Math.random()*NFL_PALETTE.length)];
      return { ...t, primary: p.primary, secondary: p.secondary };
    }));
  }, []);

  const handleLoadLeague = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!leagueId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/league', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ provider, leagueId: leagueId.trim(), swid: espnSWID || undefined, s2: espnS2 || undefined })
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      const mapped: Team[] = (data.teams || []).map((t:any, idx:number) => {
        const name = t.name || `Team ${idx+1}`;
        const mascot = t.mascot || deriveMascot(name);
        const base = NFL_PALETTE[idx % NFL_PALETTE.length];
        return {
          id: t.id?.toString() ?? `${idx+1}`,
          name,
          owner: t.owner || '',
          mascot,
          primary: t.primary || base.primary,
          secondary: t.secondary || base.secondary,
          seed: t.seed || Math.floor(Math.random()*10_000)+1,
          logoUrl: t.logoUrl || ''
        };
      });
      setTeams(mapped);
      // update URL for shareability
      const params = new URLSearchParams({ provider, leagueId: leagueId.trim() });
      if (typeof window !== 'undefined') window.history.replaceState(null, '', `?${params.toString()}`);
    } catch (err) {
      console.error(err);
      alert('Could not load league. Double-check provider and ID (ESPN may require SWID/S2).');
    } finally {
      setLoading(false);
    }
  }, [provider, leagueId, espnSWID, espnS2]);

  const updateTeam = useCallback((id: string, patch: Partial<Team>) => {
    setTeams(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const generateLogo = useCallback(async (team: Team) => {
    updateTeam(team.id, { generating: true });
    try {
      const res = await fetch('/api/generate-logo', {
        method:'POST', headers:{'Content-Type':'application/json'},
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

  const clearAll = useCallback(() => { setTeams(prev => prev.map(t => ({ ...t, logoUrl: '' }))); }, []);

  /** ---------- DEMO: instantly populate state with fake teams ---------- **/
  const loadDemo = useCallback(() => {
    const demo: Team[] = SAMPLES.slice(0, 12).map((s, idx) => ({
      id: String(idx + 1),
      name: s.name,
      owner: 'Demo',
      mascot: s.mascot,
      primary: s.primary,
      secondary: s.secondary,
      seed: s.seed,
      logoUrl: '' // will be generated on demand
    }));
    setTeams(demo);
  }, []);

  const [imageModalOpenUrl, setImageModalOpenUrl] = useState<string | null>(null);

  /** ---------- EMPTY (marketing) STATE ---------- **/
  if (!teams.length) {
    return (
      <>
        <header className="border-b border-[var(--border)] bg-[var(--panel)]/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between gap-3">
            <div className="rounded-xl bg-[var(--accent2)]/15 px-3 py-2 text-sm font-extrabold text-[var(--accent2)]">Fantasy Logo Studio</div>
            <div className="text-xs text-[var(--muted)]">Free • No API keys • Download-ready</div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4">
          {/* Hero */}
          <section className="py-12 md:py-16 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold">Instant, professional NFL-style logos for your fantasy league</h1>
            <p className="mt-3 text-[var(--muted)] max-w-2xl mx-auto">Paste your league, pick colors, and generate bold, text-free emblems your whole league can download and share.</p>

            <form onSubmit={handleLoadLeague} className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <select value={provider} onChange={(e)=>setProvider(e.target.value as Provider)} className="input text-sm w-[130px]" aria-label="Provider">
                <option value="sleeper">Sleeper</option>
                <option value="mfl">MFL</option>
                <option value="espn">ESPN</option>
              </select>
              <input className="input text-sm w-[240px]" placeholder="League ID" value={leagueId} onChange={(e)=>setLeagueId(e.target.value)} />
              {provider==='espn' && (
                <>
                  <input className="input text-sm w-[220px]" placeholder="ESPN SWID" value={espnSWID} onChange={(e)=>setEspnSWID(e.target.value)} />
                  <input className="input text-sm w-[180px]" placeholder="ESPN S2" value={espnS2} onChange={(e)=>setEspnS2(e.target.value)} />
                </>
              )}
              <button disabled={loading} className="btn btn-primary">{loading ? 'Loading…' : 'Load League'}</button>
              <button type="button" className="btn" onClick={loadDemo}>Try Demo League</button>
            </form>

            {/* Steps */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {[
                { t:'Choose provider', d:'Sleeper, MFL, or ESPN (cookies for ESPN).' },
                { t:'Fetch teams', d:'We map names → mascots and set a clean palette.' },
                { t:'Generate logos', d:'AI images with a locked palette and no text.' },
              ].map((s,i)=>(
                <div key={i} className="panel">
                  <div className="text-sm font-semibold">{i+1}. {s.t}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{s.d}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Sample gallery */}
          <section className="pb-14">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">What your league’s logos can look like</h2>
              <span className="badge">No text • Vector look</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {SAMPLES.map((s, idx)=>(
                <button
                  key={idx}
                  className="card overflow-hidden"
                  onClick={()=>setImageModalOpenUrl(sampleUrl(s))}
                  title={s.name}
                >
                  <div className="aspect-square bg-[var(--card)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sampleUrl(s)} alt={s.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="truncate">{s.name}</span>
                    <span className="flex items-center gap-1">
                      <span className="h-4 w-4 rounded" style={{background:s.primary}} />
                      <span className="h-4 w-4 rounded border border-[var(--border)]" style={{background:s.secondary}} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>

        <Modal isOpen={!!imageModalOpenUrl} onClose={()=>setImageModalOpenUrl(null)} title="Preview">
          {imageModalOpenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageModalOpenUrl} alt="Logo" className="rounded-xl shadow-lg max-h-[75vh] object-contain mx-auto" />
          )}
        </Modal>

        <footer className="py-10 text-center text-xs text-[var(--muted)]">
          Free to use • Download-ready PNG • Built for commissioners & managers
        </footer>
      </>
    );
  }

  /** ---------- WORKSPACE (after league loads) ---------- **/
  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--panel)]/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <div className="rounded-xl bg-[var(--accent2)]/15 px-3 py-2 text-sm font-extrabold text-[var(--accent2)]">Fantasy Logo Studio</div>
          <div className="flex gap-2">
            <button onClick={applyNFLPalette} className="btn">Apply NFL Palette</button>
            <button onClick={remixPalette} className="btn">Remix</button>
            <button onClick={generateAll} className="btn btn-primary">Generate All</button>
            <button onClick={clearAll} className="btn">Clear</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {teams.map(team=>(
            <TeamCard
              key={team.id}
              team={team}
              onUpdate={(patch)=>setTeams(prev=>prev.map(t=>t.id===team.id?{...t,...patch}:t))}
              onGenerate={()=>generateLogo(team)}
              onOpenImage={()=> team.logoUrl && setImageModalUrl(team.logoUrl)}
            />
          ))}
        </div>
      </main>

      <Modal isOpen={!!imageModalUrl} onClose={()=>setImageModalUrl(null)} title="Logo Preview">
        {imageModalUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageModalUrl} alt="Generated logo full" className="rounded-xl shadow-lg max-h-[75vh] object-contain mx-auto" />
        )}
      </Modal>
    </>
  );
}
