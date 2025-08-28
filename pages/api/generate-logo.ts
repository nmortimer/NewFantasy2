import type { NextApiRequest, NextApiResponse } from 'next';

type Team = {
  id: string;
  name: string;
  owner: string;
  mascot: string;
  primary: string;
  secondary: string;
  seed: number;
  logoUrl?: string;
};

const sanitizeColor = (c: string) => {
  // Ensure color is a hex or named color that Pollinations can understand.
  // Keep hex (#RRGGBB) or basic CSS color names; fall back to white/black if odd.
  const hexMatch = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
  if (hexMatch.test(c)) return c;
  const basic = ['white','black','red','blue','green','yellow','orange','purple','teal','navy','silver','gold','maroon','brown','pink','aqua','lime','gray','grey'];
  if (basic.includes((c || '').toLowerCase())) return c;
  return '#ffffff';
};

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
    const mascot = (team.mascot || 'wolf').toLowerCase();

    // Prompt: strictly forbid text/typography/numbers; enforce palette.
    const prompt = `professional american football team logo, mascot head emblem: ${mascot}, color palette ONLY: ${primary}, ${secondary}, white, vector, bold, high contrast, symmetrical, centered, no text, no words, no typography, no banners, no numbers, no watermark`;

    const encoded = encodeURIComponent(prompt);
    const seed = team.seed ?? Math.floor(Math.random() * 10000) + 1;
    const url = `https://image.pollinations.ai/prompt/${encoded}?seed=${seed}&width=1024&height=1024`;

    // We simply return the generated image URL for the client to render/download.
    return res.status(200).json({ url });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Generation failed' });
  }
}
