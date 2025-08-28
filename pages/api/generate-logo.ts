import type { NextApiRequest, NextApiResponse } from 'next';

type Provider = 'sleeper' | 'mfl' | 'espn';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
    const { provider, leagueId } = req.body as { provider: Provider; leagueId: string; swid?: string; s2?: string };
    if (!provider || !leagueId) return res.status(400).json({ error: 'Missing provider or leagueId' });

    if (provider === 'sleeper') {
      const lg = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`).then(r => r.json());
      const users = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`).then(r => r.json());
      const rosters = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`).then(r => r.json());

      const userMap: Record<string, string> = {};
      for (const u of users) userMap[u.user_id] = u.display_name || u.username || 'Manager';

      const teams = rosters.map((r: any, i: number) => ({
        id: r.roster_id?.toString() ?? `${i + 1}`,
        name: (r?.metadata?.team_name || r?.metadata?.name || r?.metadata?.team_name_updated || `Team ${i + 1}`).toString(),
        owner: userMap[r.owner_id] || '—',
      }));

      return res.status(200).json({ league: { name: lg.name }, teams });
    }

    if (provider === 'mfl') {
      // Minimal MFL support — users can still edit inside UI
      const year = new Date().getFullYear();
      const lg = await fetch(`https://api.myfantasyleague.com/${year}/export?TYPE=league&L=${leagueId}&JSON=1`).then(r => r.json());
      const fr = await fetch(`https://api.myfantasyleague.com/${year}/export?TYPE=franchises&L=${leagueId}&JSON=1`).then(r => r.json());

      const teams = (fr?.franchises?.franchise || []).map((f: any, i: number) => ({
        id: f.id?.toString() ?? `${i + 1}`,
        name: f.name || `Team ${i + 1}`,
        owner: f.owner_name || '—',
      }));
      return res.status(200).json({ league: { name: lg?.league?.name || 'MFL League' }, teams });
    }

    if (provider === 'espn') {
      // ESPN often needs SWID + S2 cookies; we attempt without but allow user to supply
      const { swid, s2 } = req.body as { swid?: string; s2?: string };
      const cookies: string[] = [];
      if (swid) cookies.push(`SWID=${swid}`);
      if (s2) cookies.push(`espn_s2=${s2}`);

      const seasonId = new Date().getFullYear();
      const url = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}?view=mTeam`;
      const espnRes = await fetch(url, { headers: cookies.length ? { Cookie: cookies.join('; ') } : {} });

      if (!espnRes.ok) {
        // fallback: return empty team list; UI still works
        return res.status(200).json({ league: { name: 'ESPN League' }, teams: [] });
      }
      const data = await espnRes.json();
      const teams = (data?.teams || []).map((t: any) => ({
        id: t.id?.toString(),
        name: t.location && t.nickname ? `${t.location} ${t.nickname}` : t.nickname || `Team ${t.id}`,
        owner: (t.owners && t.owners.length) ? t.owners[0] : '—',
      }));
      return res.status(200).json({ league: { name: data?.settings?.name || 'ESPN League' }, teams });
    }

    return res.status(400).json({ error: 'Unsupported provider' });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'League load failed' });
  }
}
