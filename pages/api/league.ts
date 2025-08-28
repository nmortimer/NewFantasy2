import type { NextApiRequest, NextApiResponse } from 'next';

type Provider = 'sleeper' | 'mfl' | 'espn';

function safe<T>(v: T | undefined | null, def: T): T {
  return (v === undefined || v === null) ? def : v;
}

function mascotFrom(name: string): string {
  const lower = (name || '').toLowerCase();
  const map: Record<string, string> = {
    bears: 'bear', cubs: 'bear',
    lions: 'lion', tigers: 'tiger',
    wolves: 'wolf', timberwolves: 'wolf', wolfpack: 'wolf',
    eagles: 'eagle', hawks: 'hawk', falcons: 'falcon',
    ravens: 'raven', crows: 'raven',
    broncos: 'stallion', mustangs: 'stallion', colts: 'stallion',
    panthers: 'panther', jaguars: 'jaguar', leopards: 'leopard',
    sharks: 'shark',
    bulls: 'bull', bison: 'bison', buffaloes: 'bison',
    vikings: 'viking', knights: 'knight', pirates: 'pirate', buccaneers: 'pirate',
    rams: 'ram', foxes: 'fox', gorillas: 'gorilla'
  };
  for (const k of Object.keys(map)) if (lower.includes(k)) return map[k];
  const fallback = ['wolf','bear','eagle','hawk','dragon','knight','viking','pirate','bull','tiger','panther','raven','shark','stallion','bison','ram','fox','gorilla'];
  return fallback[Math.floor(Math.random() * fallback.length)];
}

async function fetchSleeper(leagueId: string) {
  const [leagueRes, usersRes] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${leagueId}`),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
  ]);
  if (!leagueRes.ok) throw new Error('Sleeper league not found');
  if (!usersRes.ok) throw new Error('Sleeper users not found');
  const league = await leagueRes.json();
  const users = await usersRes.json();

  const teams = (users as any[]).map((u, idx) => {
    const name = u?.metadata?.team_name || u?.display_name || `Team ${idx + 1}`;
    return {
      id: String(u?.user_id ?? idx + 1),
      name,
      owner: u?.display_name || '',
      mascot: mascotFrom(name),
      primary: undefined,
      secondary: undefined,
      seed: Math.floor(Math.random() * 10000) + 1,
      logoUrl: '',
    };
  });

  return { info: league, teams };
}

async function fetchMFL(leagueId: string) {
  const year = new Date().getFullYear();
  const res = await fetch(`https://api.myfantasyleague.com/${year}/export?TYPE=league&L=${leagueId}&JSON=1`);
  if (!res.ok) throw new Error('MFL league not found');
  const data = await res.json();
  const franchises = safe(data?.league?.franchises?.franchise, []) as Array<any>;

  const teams = franchises.map((f: any, idx: number) => {
    const name = f?.name || `Franchise ${idx + 1}`;
    return {
      id: String(f?.id ?? idx + 1),
      name,
      owner: '',
      mascot: mascotFrom(name),
      primary: undefined,
      secondary: undefined,
      seed: Math.floor(Math.random() * 10000) + 1,
      logoUrl: '',
    };
  });

  return { info: data?.league ?? {}, teams };
}

async function fetchESPN(leagueId: string, swid?: string, s2?: string) {
  if (!swid || !s2) {
    throw new Error('ESPN requires SWID and S2 cookies.');
  }
  const year = new Date().getFullYear();
  const url = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mTeam`;
  const res = await fetch(url, {
    headers: {
      'Cookie': `SWID=${swid}; espn_s2=${s2}`,
    }
  });
  if (!res.ok) throw new Error('ESPN league fetch failed (check SWID/S2 and year)');
  const data = await res.json();
  const teams = (data?.teams || []).map((t: any, idx: number) => {
    const name = `${t?.location ?? 'Team'} ${t?.nickname ?? idx + 1}`.trim();
    return {
      id: String(t?.id ?? idx + 1),
      name,
      owner: '',
      mascot: mascotFrom(name),
      primary: undefined,
      secondary: undefined,
      seed: Math.floor(Math.random() * 10000) + 1,
      logoUrl: '',
    };
  });
  return { info: data, teams };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { provider, leagueId, swid, s2 } = req.body as { provider: Provider; leagueId: string; swid?: string; s2?: string; };

  try {
    if (!provider || !leagueId) throw new Error('Missing provider or leagueId');

    let out;
    if (provider === 'sleeper') out = await fetchSleeper(leagueId);
    else if (provider === 'mfl') out = await fetchMFL(leagueId);
    else if (provider === 'espn') out = await fetchESPN(leagueId, swid, s2);
    else throw new Error('Unsupported provider');

    return res.status(200).json({ ...out });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Unknown error' });
  }
}
