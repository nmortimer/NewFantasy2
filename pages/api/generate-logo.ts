import type { NextApiRequest, NextApiResponse } from 'next';

type Team = {
  id: string;
  name: string;
  owner: string;
  mascot: string;      // optional in practice; we’ll derive if empty
  primary: string;
  secondary: string;
  seed: number;
  logoUrl?: string;
};

const sanitizeColor = (c: string) => {
  const hexMatch = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
  if (hexMatch.test(c)) return c;
  const basic = ['white','black','red','blue','green','yellow','orange','purple','teal','navy','silver','gold','maroon','brown','pink','aqua','lime','gray','grey'];
  if (basic.includes((c || '').toLowerCase())) return c;
  return '#ffffff';
};

// Derive mascot from the full team name if the explicit mascot is missing
function deriveMascotFromName(name: string): string {
  const n = (name || '').toLowerCase();
  const map: Record<string, string> = {
    bears: 'bear', cubs: 'bear',
    lions: 'lion', tigers: 'tiger',
    wolves: 'wolf', timberwolves: 'wolf', wolfpack: 'wolf',
    eagles: 'eagle', hawks: 'hawk', falcons: 'falcon',
    ravens: 'raven', crows: 'raven',
    broncos: 'stallion', mustangs: 'stallion', colts: 'stallion', horses: 'stallion',
    panthers: 'panther', jaguars: 'jaguar', leopards: 'leopard',
    sharks: 'shark', dolphins: 'dolphin',
    bulls: 'bull', bison: 'bison', buffaloes: 'bison',
    vikings: 'viking', knights: 'knight', pirates: 'pirate', buccaneers: 'pirate',
    rams: 'ram', foxes: 'fox', gorillas: 'gorilla', gators: 'alligator', crocodiles: 'crocodile',
    dragons: 'dragon'
  };
  for (const k of Object.keys(map)) if (n.includes(k)) return map[k];
  const fallback = ['wolf','bear','eagle','hawk','dragon','knight','viking','pirate','bull','tiger','panther','raven','shark','stallion','bison','ram','fox','gorilla'];
  for (const f of fallback) if (n.includes(f)) return f;
  return 'wolf';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { team } = req.body as { team: Team };
    if (!team) return res.status(400).json({ error: 'Missing team' });

    const primary = sanitizeColor(team.primary);
    const secondary = sanitizeColor(team.secondary);

    // If the user typed a mascot, honor it; otherwise derive from the full team name
    const mascot = (team.mascot && team.mascot.trim().length > 0)
      ? team.mascot.trim().toLowerCase()
      : deriveMascotFromName(team.name);

    // Prompt explicitly forbids text/words/numbers and locks the palette
    const prompt = `professional american football team logo, mascot head emblem: ${mascot}, color palette ONLY: ${primary}, ${secondary}, white, vector, bold, high contrast, symmetrical, centered, no text, no words, no typography, no banners, no numbers, no watermark`;

    const encoded = encodeURIComponent(prompt);
    const seed = team.seed ?? Math.floor(Math.random() * 10000) + 1;
    const url = `https://image.pollinations.ai/prompt/${encoded}?seed=${seed}&width=1024&height=1024`;

    return res.status(200).json({ url });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Generation failed' });
  }
}
