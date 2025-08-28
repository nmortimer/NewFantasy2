import { FormEvent, useCallback, useMemo, useState } from 'react';
import TeamCard, { Team } from '../components/TeamCard';
import Modal from '../components/Modal';

type Provider = 'sleeper' | 'mfl' | 'espn';

const NFL_PALETTE: Array<{ primary: string; secondary: string; name: string }> = [
  { name: 'Chiefs', primary: '#E31837', secondary: '#FFB612' },
  { name: 'Packers', primary: '#203731', secondary: '#FFB612' },
  { name: 'Bears', primary: '#0B162A', secondary: '#C83803' },
  { name: 'Broncos', primary: '#0A2342', secondary: '#FB4F14' },
  { name: 'Seahawks', primary: '#002244', secondary: '#69BE28' },
  { name: 'Vikings', primary: '#4F2683', secondary: '#FFC62F' },
  { name: 'Dolphins', primary: '#008E97', secondary: '#FC4C02' },
  { name: '49ers', primary: '#AA0000', secondary: '#B3995D' },
  { name: 'Raiders', primary: '#000000', secondary: '#A5ACAF' },
  { name: 'Cowboys', primary: '#041E42', secondary: '#869397' },
  { name: 'Giants', primary: '#0B2265', secondary: '#A71930' },
  { name: 'Bills', primary: '#00338D', secondary: '#C60C30' },
  { name: 'Jets', primary: '#125740', secondary: '#FFFFFF' },
  { name: 'Ravens', primary: '#241773', secondary: '#000000' },
  { name: 'Panthers', primary: '#0085CA', secondary: '#101820' },
  { name: 'Jaguars', primary: '#006778', secondary: '#9F792C' },
  { name: 'Saints', primary: '#101820', secondary: '#D3BC8D' },
  { name: 'Patriots', primary: '#002244', secondary: '#C60C30' },
  { name: 'Buccaneers', primary: '#D50A0A', secondary: '#34302B' },
  { name: 'Chargers', primary: '#0073CF', secondary: '#FFC20E' },
];

const FALLBACK_MASCOTS = ['wolf','bear','eagle','hawk','dragon','knight','viking','pirate','bull','tiger','panther','raven','shark','stallion','bison','ram','fox','gorilla'];

function deriveMascot(name: string): string {
  const n = (name || '').toLowerCase();
  const map: Record<string,string> = {
    bears:'bear', cubs:'bear', lions:'lion', tigers:'tiger', wolves:'wolf', timberwolves:'wolf', wolfpack:'wolf',
    eagles:'eagle', hawks:'hawk', falcons:'falcon', ravens:'raven', crows:'raven',
    broncos:'stallion', mustangs:'stallion', colts:'stallion', horses:'stallion',
    panthers:'panther', jaguars:'jaguar', leopards:'leopard', sharks:'shark',
    bulls:'bull', bison:'bison', buffaloes:'bison',
    vikings:'viking', knights:'knight', pirates:'pirate', buccaneers:'pirate',
    rams:'ram', foxes:'fox', gorillas:'gorilla', gators:'alligator', crocodiles:'crocodile'
  };
  for(const k of Object.keys(map)) if(n.includes(k)) return map[k];
  for (const h of FALLBACK_MASCOTS) if (n.includes(h)) return h;
  return FALLBACK_MASCOTS[Math.floor(Math.random()*FALLBACK_MASCOTS.length)];
}

export default function HomePage(){
  const [provider, setProvider] = useState<Provider>('sleeper');
  const [leagueId, setLeagueId] = useState('');
  const [espnSWID, setEspnSWID] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string|null>(null);

  const palettePreview = useMemo(()=>NFL_PALETTE.slice(0, Math.max(4, Math.min(8, teams.length||8))),[teams.length]);

  const applyNFLPalette = useCallback(()=>{
    setTeams(prev => prev.map((t,i)=>{
      const p = NFL_PALETTE[i % NFL_PALETTE.length];
      return { ...t, primary: p.primary, secondary: p.secondary };
    }));
  },[]);

  const remixPalette = useCallback(()=>{
    setTeams(prev => prev.map((t)=>{
      const p = NFL_PALETTE[Math.floor(Math.random()*NFL_PALETTE.length)];
      return { ...t, primary: p.primary, secondary: p.secondary };
    }));
  },[]);

  const handleLoadLeague = useCallback(async (e: FormEvent)=>{
    e.preventDefault(); if(!leagueId.trim()) return;
    setLoading(true);
    try{
      const res = await fetch('/api/league',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({provider, leagueId:leagueId.trim(), swid: espnSWID || undefined, s2: espnS2 || undefined})
      });
      if(!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      const mapped: Team[] = (data.teams || []).map((t:any, idx:number)=>{
        const name = t.name || `Team ${idx+1}`;
        const mascot = t.mascot || deriveMascot(name);
        const base = NFL_PALETTE[idx % NFL_PALETTE.length];
        return {
          id: t.id?.toString() ?? `${idx+1}`,
          name, owner: t.owner || '', mascot,
          primary: t.primary || base.primary,
          secondary: t.secondary || base.secondary,
          seed: t.seed || Math.floor(Math.random()*10_000)+1,
          logoUrl: t.logoUrl || ''
        };
      });
      setTeams(mapped);
    }catch(err){ console.error(err); alert('Could not load league. Check provider/ID (ESPN may require SWID/S2).'); }
    finally{ setLoading(false); }
  },[provider,leagueId,espnSWID,espnS2]);

  const updateTeam = useCallback((id:string,patch:Partial<Team>)=>{
    setTeams(prev=>prev.map(t=>t.id===id?{...t,...patch}:t));
  },[]);

  const generateLogo = useCallback(async (team:Team)=>{
    updateTeam(team.id,{generating:true});
    try{
      const res = await fetch('/api/generate-logo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({team})});
      if(!res.ok) throw new Error(`Gen failed: ${res.status}`);
      const data = await res.json();
      updateTeam(team.id,{logoUrl:data.url});
    }catch(e){ console.error(e); alert(`Logo generation failed for ${team.name}. Try again.`); }
    finally{ updateTeam(team.id,{generating:false}); }
  },[updateTeam]);

  const generateAll = useCallback(async ()=>{
    const queue=[...teams]; const running:Promise<void>[]=[];
    const worker=async(t:Team)=>{ await generateLogo(t); };
    while(queue.length){
      while(running.length<2 && queue.length){
        const t=queue.shift()!; const p=worker(t).finally(()=>{ const i=running.indexOf(p); if(i>=0) running.splice(i,1);});
        running.push(p);
      }
      // eslint-disable-next-line no-await-in-loop
      await Promise.race(running);
    }
    await Promise.all(running);
  },[teams,generateLogo]);

  const clearAll = useCallback(()=>{ setTeams(prev=>prev.map(t=>({...t,logoUrl:''}))); },[]);

  return (
    <>
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--panel)]/80 backdrop-blur">
        <div className="shell py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--accent2)]/15 px-3 py-2 text-sm font-extrabold text-[var(--accent2)] shadow-[var(--shadow)]">
                Fantasy Logo Studio
              </div>
              <span className="hidden md:inline text-sm text-[var(--muted)]">Generate NFL-style logos with your colors.</span>
            </div>
            <form onSubmit={handleLoadLeague} className="flex flex-wrap gap-2 items-center">
              <select value={provider} onChange={(e)=>setProvider(e.target.value as Provider)} className="input text-sm w-[120px]" aria-label="Provider">
                <option value="sleeper">Sleeper</option>
                <option value="mfl">MFL</option>
                <option value="espn">ESPN</option>
              </select>
              <input className="input text-sm w-[200px]" placeholder="League ID" value={leagueId} onChange={(e)=>setLeagueId(e.target.value)} />
              {provider==='espn' && (
                <>
                  <input className="input text-sm w-[210px]" placeholder="ESPN SWID (e.g. {XXXX-...})" value={espnSWID} onChange={(e)=>setEspnSWID(e.target.value)} />
                  <input className="input text-sm w-[180px]" placeholder="ESPN S2" value={espnS2} onChange={(e)=>setEspnS2(e.target.value)} />
                </>
              )}
              <button disabled={loading} className="btn btn-primary">{loading ? 'Loading…' : 'Load League'}</button>
            </form>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="badge">League Palette</div>
            <div className="flex items-center gap-2">
              {palettePreview.map((p,i)=>(
                <div key={i} className="flex overflow-hidden rounded-md border border-[var(--border)]">
                  <div className="h-4 w-4" style={{background:p.primary}}/>
                  <div className="h-4 w-4" style={{background:p.secondary}}/>
                </div>
              ))}
            </div>
            <div className="flex gap-2 ml-auto">
              <button onClick={applyNFLPalette} className="btn btn-secondary">Apply NFL Palette</button>
              <button onClick={remixPalette} className="btn">Remix</button>
              <button onClick={generateAll} disabled={!teams.length} className="btn btn-primary">Generate All</button>
              <button onClick={clearAll} disabled={!teams.length} className="btn">Clear Logos</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="shell py-6">
        {!teams.length ? (
          <div className="panel text-sm text-[var(--muted)]">
            Load a league to populate team cards. Click the logo to open a full preview. All images use Pollinations (free).
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {teams.map(team=>(
              <TeamCard
                key={team.id}
                team={team}
                onUpdate={(patch)=>updateTeam(team.id, patch)}
                onGenerate={()=>generateLogo(team)}
                onOpenImage={()=> team.logoUrl && setImageModalUrl(team.logoUrl)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Image Modal */}
      <Modal isOpen={!!imageModalUrl} onClose={()=>setImageModalUrl(null)} title="Logo Preview">
        {imageModalUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageModalUrl} alt="Generated logo full" className="rounded-xl shadow-lg max-h-[75vh] object-contain mx-auto" />
        )}
      </Modal>

      <footer className="py-10 text-center text-xs text-[var(--muted)]">
        Built for commissioners & managers • Images via Pollinations
      </footer>
    </>
  );
}
