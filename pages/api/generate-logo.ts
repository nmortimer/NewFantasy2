import type { NextApiRequest, NextApiResponse } from 'next';

type Team = {
  id: string;
  name: string;
  owner: string;
  mascot: string; // may be empty; we'll derive if needed
  primary: string;
  secondary: string;
  seed: number;
  logoUrl?: string;
};

/** --------- Color helpers --------- */
function sanitizeColor(input: string): string {
  const v = (input || '').trim();
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
  if (hex.test(v)) return v.toUpperCase();
  // allow a few basic names if someone typed "white", etc.
  const basic = ['white','black','red','blue','green','yellow','orange','purple','teal','navy','silver','gold','maroon','brown','pink','aqua','lime','gray','grey'];
  if (basic.includes(v.toLowerCase())) return v.toLowerCase();
  return '#FFFFFF';
}

function hexToName(hex: string): string {
  // crude but effective mapping so the model "understands" the color
  const h = hex.replace('#','');
  if (h.length !== 6) return 'white';
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const v = max/255, s = max === 0 ? 0 : (max-min)/max;
  let H = 0;
  if (max !== min) {
    if (max === r) H = (g - b) / (max - min);
    else if (max === g) H = 2 + (b - r) / (max - min);
    else H = 4 + (r - g) / (max - min);
    H *= 60; if (H < 0) H += 360;
  }
  const sat = s, val = v;
  if (val < 0.12) return 'black';
  if (sat < 0.10) return val > 0.85 ? 'white' : 'gray';
  if (H < 15 || H >= 345) return 'red';
  if (H < 45) return 'orange';
  if (H < 70) return 'gold';
  if (H < 90) return 'yellow-green';
  if (H < 135) return 'green';
  if (H < 160) return 'teal';
  if (H < 200) return 'cyan';
  if (H < 225) return 'sky blue';
  if (H < 250) return 'blue';
  if (H < 275) return 'indigo';
  if (H < 300) return 'purple';
  if (H < 330) return 'magenta';
  return 'crimson';
}

/** --------- Mascot fallback --------- */
function deriveMascotFromName(name: string): string {
  const n = (name || '').toLowerCase();
  const map: Record<string, string> = {
    bears:'bear', cubs:'bear',
    lions:'lion', tigers:'tiger',
    wolves:'wolf', timberwolves:'wolf', wolfpack:'wolf',
    eagles:'eagle', hawks:'hawk', falcons:'falcon',
    ravens:'raven', crows:'raven',
    broncos:'stallion', mustangs:'stallion', colts:'stallion',
    panthers:'panther', jaguars:'jaguar', leopards:'leopard',
    sharks:'shark', dolphins:'dolphin',
    bulls:'bull', bison:'bison', buffaloes:'bison',
    vikings:'viking', knights:'knight', pirates:'pirate', buccaneers:'pirate',
    rams:'ram', foxes:'fox', gorillas:'gorilla', gators:'alligator', crocodiles:'crocodile',
    dragons:'dragon'
  };
  for (const k of Object.keys(map)) if (n.includes(k)) return map[k];
  return 'wolf';
}

/** --------- Style variants (rotate for diversity while staying pro) --------- */
const STYLE_VARIANTS = [
  'modern NFL style, sharp angular geometry, bold negative space',
  'sleek geometric vector, minimal, clean shapes, balanced proportions',
  'front-facing symmetrical emblem, thick outline, strong contrast',
  '3/4 view dynamic head, aggressive expression, crisp edges',
  'retro-inspired simplified mark, solid fills, subtle inner shadow',
  'rounded friendly geometry, smooth curves, high clarity',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { team } = req.body as { team: Team };
    if (!team) return res.status(400).json({ error: 'Missing team' });

    const primaryRaw = sanitizeColor(team.primary);
    const secondaryRaw = sanitizeColor(team.secondary);
    const primaryName = primaryRaw.startsWith('#') ? hexToName(primaryRaw) : primaryRaw;
    const secondaryName = secondaryRaw.startsWith('#') ? hexToName(secondaryRaw) : secondaryRaw;

    const mascot = (team.mascot && team.mascot.trim()) ? team.mascot.trim().toLowerCase() : deriveMascotFromName(team.name);

    // pick a style variant deterministically from the variation seed
    const variationSeed = team.seed ?? Math.floor(Math.random() * 10000) + 1;
    const style = STYLE_VARIANTS[variationSeed % STYLE_VARIANTS.length];

    // Palette directive appears multiple times to strongly bias colors
    const paletteList = `${primaryName} (${primaryRaw}), ${secondaryName} (${secondaryRaw}), white, black`;
    const paletteStrict = `color palette strictly limited to: ${paletteList}. dominant color: ${primaryName} (${primaryRaw}); accent: ${secondaryName} (${secondaryRaw}). absolutely no other colors.`;

    // Strong text suppression & cleanliness
    const negatives = 'no text, no letters, no typography, no wordmark, no numbers, no jersey, no helmet decals, no banners, no ribbons, no slogans, no watermark, no signature';

    // Final prompt
    const prompt =
      `professional sports team mascot logo — ${style}; ` +
      `vector emblem of a ${mascot} head, centered, high contrast, crisp edges, thick outline, clean background, export-quality; ` +
      `${paletteStrict}; ${negatives}`;

    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?seed=${variationSeed}&width=1024&height=1024`;

    return res.status(200).json({ url });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Generation failed' });
  }
}
