import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import raw from '../data/sponsors.json';

/**
 * Sponsor logo sizing and legibility.
 *
 * The wall mixes long wordmarks (Siemens is 6.3:1) with square marks
 * (Huber+Suhner is 1:1). Capping every logo the same way makes the wordmarks
 * dominate and the square marks look like afterthoughts, so the cap is chosen
 * from each file's real aspect ratio, read here at build time. Nothing is ever
 * scaled up: the <img> carries no width/height, so it renders at its intrinsic
 * size and the caps only ever shrink it.
 *
 * `treat` handles contrast. Most sponsors supplied a white lockup that needs
 * nothing, but a few sent artwork that is unreadable on the dark green ground.
 */
export type Fit = 'wide' | 'standard' | 'mark';
export type Treat = 'none' | 'forceWhite' | 'knockout';

interface Entry {
  file: string;
  /** forceWhite: dark artwork on a transparent ground -> flatten to white.
   *  knockout:   artwork with a baked light background -> drop the background. */
  treat?: Treat;
  /**
   * Multiplier on the size cap, for artwork delivered with wide transparent
   * margins baked into the canvas. Aspect ratio cannot detect that padding —
   * Vector's mark occupies a fraction of its 1200x800 canvas — so those files
   * land far smaller than everything beside them. Vector artwork rescales
   * losslessly; a raster is still clamped to its intrinsic width below, so
   * this never enlarges one past its real pixels.
   */
  scale?: number;
}

const entries = raw as Record<string, Entry | string>;
const dir = resolve(process.cwd(), 'public/assets/sponsors');

/** Intrinsic pixel (or user-unit) dimensions, or null when unreadable. */
function dimensions(file: string): { w: number; h: number } | null {
  let buf: Buffer;
  try {
    buf = readFileSync(resolve(dir, file));
  } catch {
    return null;
  }

  if (file.endsWith('.svg')) {
    const head = buf.toString('utf8', 0, 2048);
    const view = head.match(/viewBox\s*=\s*"([-\d.eE]+)[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)"/);
    if (view) return { w: parseFloat(view[3]), h: parseFloat(view[4]) };
    const w = head.match(/\swidth\s*=\s*"([\d.]+)/);
    const h = head.match(/\sheight\s*=\s*"([\d.]+)/);
    if (w && h) return { w: parseFloat(w[1]), h: parseFloat(h[1]) };
    return null;
  }

  // PNG: IHDR width/height are the two big-endian uint32 at offset 16.
  if (buf.length > 24 && buf.toString('binary', 1, 4) === 'PNG') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }

  // WebP: VP8X carries 24-bit (value - 1) dimensions; VP8L packs 14 bits each.
  if (buf.length > 30 && buf.toString('binary', 8, 12) === 'WEBP') {
    const chunk = buf.toString('binary', 12, 16);
    if (chunk === 'VP8X') {
      return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
    }
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8 ') {
      return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
  }

  return null;
}

export interface LogoInfo {
  file: string;
  fit: Fit;
  treat: Treat;
  /** Inline custom properties: the size multiplier and, for rasters, a hard
   *  ceiling at the file's intrinsic width so it is only ever scaled down. */
  style: string;
}

/** Logo metadata for a brand, or null when that brand sent no artwork. */
export function logoFor(brand: string): LogoInfo | null {
  const entry = entries[brand];
  if (!entry || brand.startsWith('_')) return null;

  const { file, treat = 'none', scale = 1 } =
    typeof entry === 'string' ? ({ file: entry } as Entry) : entry;
  const dim = dimensions(file);

  // Unreadable dimensions fall back to the middle cap, which is never wrong
  // enough to break the row — only slightly small for a square mark.
  let fit: Fit = 'standard';
  if (dim && dim.h > 0) {
    const aspect = dim.w / dim.h;
    if (aspect >= 3) fit = 'wide';
    else if (aspect < 1.4) fit = 'mark';
  }

  const style = [
    scale !== 1 ? `--logo-scale:${scale}` : '',
    // Rasters get a hard ceiling at their own width. Vectors do not need one.
    dim && !file.endsWith('.svg') ? `--logo-cap-w:${dim.w}px` : '',
  ]
    .filter(Boolean)
    .join(';');

  return { file, fit, treat, style };
}
