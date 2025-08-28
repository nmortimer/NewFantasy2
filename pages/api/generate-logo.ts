// /pages/api/generate-logo.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Team = {
  id: string;
  name: string;
  owner: string;
  mascot: string;
  primary: string;
  secondary: string;
  seed: number;
  style?: number;   // 0..5
  logoUrl?: string;
};

// --- simple animal heuristic ---
const ANIMALS = [
  'wolf','fox','lion','tiger','bear','bull','ram','eagle','hawk','falcon','owl','shark',
  'panther','jaguar','leopard','cougar','cat','dog','husky','stallion','mustang','horse',
  'gorilla','ape','monkey','dragon','viper','cobra','raven','crow','cardinal','dolphin',
  'bison','buffalo','coyote','wolverine','otter','gator','croc','rhino','hippo','whale',
  'duck','goose','goat','yak','boar','pig','turtle','phoenix','griffin','eagle'
];

function isAnimal(text: string) {
  const s = text.toLowerCase();
  return ANIMALS.some(a => s.includes(a));
}

// --- color helpers (unchanged) ---
function sanitizeColor(input: string): string {
  const v = (input || '').trim();
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
  if (hex.test(v)) return v.toUpperCase();
  const basic = ['white','black','red','blue','green','yellow','orange','purple','teal','navy','silver','gold','maroon','brown','pink','aqua','lime','gray','grey'];
  if (basic.includes(v.toLowerCase())) return v.toLowerCase();
  return '#FFFFFF';
}

function hexToSimpleName(hex: string): string {
  const key = hex.toUpperCase();
  const h = key.replace('#','');
  if (h.length !== 6) return 'white';
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const v = max/255, s = max===0?0:(max-min)/max;
  let H = 0;
  if (max !== min) {
    if (max === r) H = (g-b)/(max-min);
    else if (max === g) H = 2+(b-r)/(max-min);
    else H = 4+(r-g)/(max-min);
    H *= 60; if (H<0) H += 360;
  }
  if (v < 0.12) return 'black';
  if (s < 0.10) return v > 0.85 ? 'white' : 'gray';
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

// --- style grammars (the knob) ---
const STYLES: Array<{ name: string; phrase: (animal: boolean) => string }> = [
  {
    name: 'Modern',
    phrase: (animal) =>
      `${animal ? 'front-facing mascot head' : 'object-only emblem'}, sharp angular geometry, heavy 6–8px outer stroke, bold negative space cuts, high contrast`
  },
  {
    name: 'Geometric',
    phrase: (animal) =>
      `${animal ? 'front-facing mascot head' : 'object-only emblem'}, simplified geometric primitives, symmetrical, minimal details, clean modular forms`
  },
  {
    name: 'Symmetric',
    phrase: (animal) =>
      `${animal ? 'perfectly front-facing mascot head' : 'centered object emblem'}, strict mirror symmetry, thick outline, balanced proportions`
  },
  {
    name: 'Dynamic',
    phrase: (animal) =>
      `${animal ? '3/4 view mascot head' : 'angled object emblem'}, forward motion cues, crisp edges, athletic energy`
  },
  {
    name: 'Retro',
    phrase: (animal) =>
      `${animal ? 'front-facing mascot head' : 'object emblem'}, chunky simplified shapes, flat blocks, classic patch-style`
  },
  {
    name: 'Rounded',
    phrase: (animal) =>
      `${animal ? 'front-facing mascot head' : 'object emblem'}, soft curves, friendly geometry, smooth silhouette`
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ error:'Method not allowed' }); }

    const { team } = req.body as { team: Team };
    if (!team) return res.status(400).json({ error: 'Missing team' });

    const primaryRaw = sanitizeColor(team.primary);
    const secondaryRaw = sanitizeColor(team.secondary);
    const primaryName = primaryRaw.startsWith('#') ? hexToSimpleName(primaryRaw) : primaryRaw;
    const secondaryName = secondaryRaw.startsWith('#') ? hexToSimpleName(secondaryRaw) : secondaryRaw;

    const subject = (team.mascot && team.mascot.trim()) ? team.mascot.trim() : team.name;

    const variationSeed = team.seed ?? Math.floor(Math.random() * 10000) + 1;
    const idx = typeof team.style === 'number' && team.style >= 0 && team.style < STYLES.length
      ? team.style : variationSeed % STYLES.length;

    const animal = isAnimal(subject);
    const stylePhrase = STYLES[idx].phrase(animal);

    const paletteBlock =
      `STRICT PALETTE: primary ${primaryName} (${primaryRaw}) and secondary ${secondaryName} (${secondaryRaw}), plus WHITE (#FFFFFF) and BLACK (#000000) only. ` +
      `Dominant coverage: PRIMARY 70–80%, SECONDARY 10–25%, remainder white/black. Flat solid fills ONLY — NO gradients, NO extra hues. ` +
      `If shading is needed, posterize using ONLY these four colors. Duotone vector look.`;

    // Circles/rings: ban for animal heads; allow for objects (so grenades/shields can be round)
    const circleNeg = animal ? 'no circle, no roundel, no ring, no circular border, ' : '';

    const negatives =
      'no text, no letters, no writing, no wordmark, no team name, no initials, no monogram, no numbers, ' +
      'no shield, no crest, no badge, no patch, no emblem border, no border text, ' +
      circleNeg +
      'no banner, no ribbon, no sticker, no stamp, no coin, no medallion, ' +
      'no watermark, no signature, no background graphics, no textures, no gradient background, no scene';

    const subjectLine =
      `Mascot phrase: “${subject}”. Interpret this phrase semantically and depict a SINGLE ${animal ? 'animal head' : 'object/bust'} emblem. Do NOT draw any words.`;

    const prompt =
      `professional sports team logo — ${stylePhrase}; ` +
      `${subjectLine} ` +
      `centered composition, vector/SVG-like flat design, crisp edges, heavy black outline, PURE WHITE (#FFFFFF) BACKGROUND. ` +
      `${paletteBlock}. ${negatives}.`;

    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?seed=${variationSeed}&width=1024&height=1024&nologo=true`;
    return res.status(200).json({ url });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Generation failed' });
  }
}
