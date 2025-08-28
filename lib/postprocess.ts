// /lib/postprocess.ts
// Client-side helpers: quantize to team palette, auto-crop, and vectorize to SVG (free).
// Only import this module dynamically from the browser (no SSR).

type RGB = { r: number; g: number; b: number };

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '').trim();
  const n = h.length === 3
    ? [h[0]+h[0], h[1]+h[1], h[2]+h[2]]
    : [h.slice(0,2), h.slice(2,4), h.slice(4,6)];
  return { r: parseInt(n[0],16), g: parseInt(n[1],16), b: parseInt(n[2],16) };
}

function dist2(a: RGB, b: RGB) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return dr*dr + dg*dg + db*db;
}

// Map every pixel to the nearest of [primary, secondary, white, black]
function quantizeToPalette(img: ImageData, primary: RGB, secondary: RGB): ImageData {
  const { data, width, height } = img;
  const out = new ImageData(width, height);
  const palette = [primary, secondary, WHITE, BLACK];
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) { // transparent
      out.data[i] = 0; out.data[i+1] = 0; out.data[i+2] = 0; out.data[i+3] = 0;
      continue;
    }
    const px = { r: data[i], g: data[i+1], b: data[i+2] };
    let best = 0, bestd = Infinity;
    for (let p = 0; p < palette.length; p++) {
      const d = dist2(px, palette[p]);
      if (d < bestd) { bestd = d; best = p; }
    }
    const c = palette[best];
    out.data[i] = c.r; out.data[i+1] = c.g; out.data[i+2] = c.b; out.data[i+3] = 255;
  }
  return out;
}

// Auto-crop to the bounding box of non-white pixels
function autoCrop(img: ImageData): { cropped: ImageData; x: number; y: number } {
  const { data, width, height } = img;
  const isNonWhite = (idx: number) => {
    const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
    if (a < 10) return false;
    // treat very near white as background
    return !(r > 245 && g > 245 && b > 245);
  };

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isNonWhite(i)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    // nothing found; return original
    return { cropped: img, x: 0, y: 0 };
  }

  // add a small padding
  const pad = Math.floor(Math.max(width, height) * 0.02);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = new ImageData(cw, ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const srcIdx = ((y + minY) * width + (x + minX)) * 4;
      const dstIdx = (y * cw + x) * 4;
      out.data[dstIdx] = data[srcIdx];
      out.data[dstIdx+1] = data[srcIdx+1];
      out.data[dstIdx+2] = data[srcIdx+2];
      out.data[dstIdx+3] = data[srcIdx+3];
    }
  }
  return { cropped: out, x: minX, y: minY };
}

async function imageDataToPngUrl(imageData: ImageData): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.putImageData(imageData, 0, 0);
  const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/png'));
  return URL.createObjectURL(blob);
}

async function vectorizeToSvgUrl(imageData: ImageData): Promise<string> {
  // Lazy-load imagetracerjs (MIT) on the client
  // @ts-ignore
  const ImageTracer = (await import('imagetracerjs')).default || (await import('imagetracerjs'));
  // Options tuned for flat fills (we quantized already)
  const svgString = ImageTracer.imagedataToSVG(imageData, {
    numberofcolors: 4,
    pathomit: 1,
    blurradius: 0,
    blurdelta: 0,
    strokewidth: 0,
    ltres: 1,
    qtres: 1,
    scale: 1,
    roundcoords: 1
  });
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

export async function postProcessLogo(
  remoteUrl: string,
  primaryHex: string,
  secondaryHex: string
): Promise<{ pngUrl: string; svgUrl: string }> {
  // Fetch as blob to avoid CORS-tainted canvas
  const resp = await fetch(remoteUrl, { cache: 'no-store' });
  const blob = await resp.blob();
  const bmp = await createImageBitmap(blob);

  // Draw to canvas and read pixels
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  const raw = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Quantize → Crop → Export
  const q = quantizeToPalette(raw, hexToRgb(primaryHex), hexToRgb(secondaryHex));
  const { cropped } = autoCrop(q);

  const [pngUrl, svgUrl] = await Promise.all([
    imageDataToPngUrl(cropped),
    vectorizeToSvgUrl(cropped),
  ]);

  return { pngUrl, svgUrl };
}
