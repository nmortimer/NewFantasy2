import type { NextApiRequest, NextApiResponse } from 'next';

type Team = {
  id: string;
  name: string;
  owner: string;
  mascot: string;   // subject phrase (defaults to team name)
  primary: string;
  secondary: string;
  seed: number;
  style?: number;   // 0..5 style family
  logoUrl?: string;
};

/** ------- Color helpers ------- */
function sanitizeColor(input: string): string {
  const v = (input || '').trim();
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
  if (hex.test(v)) return v.toUpperCase();
  const basic = [
    'white','black','red','blue','green','yellow','orange','purple','teal','navy','silver','gold','maroon','brown','pink','aqua','lime','gray','grey',
  ];
  if (basic.includes(v.toLowerCase())) return v.toLowerCase();
  return '#FFFFFF';
}

const NAMED_HEX: Record<string, string> = {
  '#E31837': 'scarlet',
  '#FFB612': 'athletic gold',
  '#203731': 'green',
  '#0B162A': 'deep navy',
  '#C83803': 'orange',
  '#0A2342': 'navy blue',
  '#FB4F14': 'bronco orange',
  '#002244': 'navy',
  '#69BE28': 'action green',
  '#4F2683': 'purple',
  '#FFC62F': 'gold',
  '#008E97': 'teal',
  '#FC4C02': 'orange-red',
  '#AA0000': 'red',
  '#B3995D': 'gold metallic',
  '#A5ACAF': 'silver',
  '#041E42': 'cowboys blue',
  '#869397': 'silver gray',
  '#0B2265': 'giants blue',
  '#A71930': 'crimson',
  '#00338D': 'royal blue',
  '#C60C30': 'red',
  '#125740': 'forest green',
  '#241773': 'purple',
  '#000000': 'black',
  '#0085CA': 'panthers blue',
  '#101820': 'black',
  '#006778': 'teal',
  '#9F792C': 'bronze',
  '#D3BC8D': 'vegas gold',
  '#0073CF': 'charger blue',
  '#FFC20E': 'bolt gold',
};

function hexToSimpleName(hex: string): string {
  const key = hex.toUpperCase();
  if (NAMED_HEX[key]) return NAMED_HEX[key];

  const h = key.replace('#', '');
  if (h.length !== 6) return 'white';

  const r = parseInt(h.slice(0, 2), 16),
    g = parseInt(h.slice(2, 4), 16),
    b = parseInt(h.slice(4, 6), 16);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const v = max / 255;
  const s = max === 0 ? 0 : (max - min) / max;

  let H = 0;
  if (max !== min) {
    if (max === r) H = (g - b) / (max - min);
    else if (max === g) H = 2 + (b - r) / (max - min);
    else H = 4 + (r - g) / (max - min);
    H *= 60;
    if (H < 0) H += 360;
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

/** ------- Style families (aligned to knob) ------- */
const STYLE_VARIANTS = [
  'modern NFL style, sharp angular geometry, bold negative space, aggressive silhouette',
  'sleek geometric vector, minimal clean shapes, balanced proportions, modular forms',
  'front-facing symmetrical emblem, mirror symmetry, heavy outline, strong contrast',
  '3/4 view dynamic head, forward motion, crisp edges, athletic energy',
  'retro simplified mark, flat blocks, minimal detail, classic proportions',
  'rounded friendly geometry, soft curves, approachable, high clarity',
];

/** ------- API handler ------- */
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
    const primaryName = primaryRaw.startsWith('#') ? hexToSimpleName(primaryRaw) : primaryRaw;
    const secondaryName = secondaryRaw.startsWith('#') ? hexToSimpleName(secondaryRaw) : secondaryRaw;

    // Subject phrase: use mascot (defaults to team name). Team name is not fed separately.
    const subject = (team.mascot && team.mascot.trim()) ? team.mascot.trim() : team.name;

    const variationSeed = team.seed ?? Math.floor(Math.random() * 10000) + 1;
    const styleIdx =
      typeof team.style === 'number' && team.style >= 0 && team.style < STYLE_VARIANTS.length
        ? team.style
        : variationSeed % STYLE_VARIANTS.length;
    const style = STYLE_VARIANTS[styleIdx];

    // Palette enforcement — names + hex + composition
    const paletteBlock =
      `STRICT PALETTE: primary ${primaryName} (${primaryRaw}) and secondary ${secondaryName} (${secondaryRaw}), plus WHITE (#FFFFFF) and BLACK (#000000) only. ` +
      `Dominant coverage: PRIMARY 70–80%, SECONDARY 10–25%, remainder white/black. Flat solid fills ONLY — NO gradients, NO extra hues. ` +
      `If shading is needed, posterize using ONLY these four colors. Duotone/simplified vector look.`;

    // Hard negatives (no text/rings/badges/backgrounds)
    const negatives =
      'no text, no letters, no writing, no wordmark, no team name, no initials, no monogram, no numbers, ' +
      'no shield, no crest, no badge, no patch, no emblem border, no border text, ' +
      'no circle, no roundel, no ring, no circular border, ' +
      'no banner, no ribbon, no sticker, no stamp, no coin, no medallion, ' +
      'no watermark, no signature, no background graphics, no textures, no gradient background, no scene';

    // Interpret the mascot phrase semantically; no example that anchors to any animal.
    const subjectLine =
      `Mascot phrase: “${subject}”. Interpret this phrase semantically and depict a SINGLE mascot/object that represents it. Do NOT draw any words.`;

    const prompt =
      `professional sports team logo — ${style}; ` +
      `${subjectLine} ` +
      `HEAD-ONLY mascot emblem, centered, vector/SVG-like flat design, crisp edges, heavy black outline, PURE WHITE (#FFFFFF) BACKGROUND. ` +
      `${paletteBlock}. ${negatives}.`;

    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?seed=${variationSeed}&width=1024&height=1024&nologo=true`;

    return res.status(200).json({ url });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Generation failed' });
  }
}
