/**
 * Build the Design Studio's photographic shirt mockups from the supplied source renders.
 *
 * Each source PNG is a single image holding the FRONT on the left half and the BACK on the right
 * half, shot flat on a light-grey ground. This script:
 *   1. splits each source into its left (front) and right (back) halves,
 *   2. trims the grey ground away to find the garment's bounding box,
 *   3. re-frames every garment identically inside a 400:460 canvas (the Studio's viewBox ratio),
 *      collar-anchored near the top and horizontally centred, so artwork placed in the shared
 *      400x460 coordinate space always lands on the chest / upper back regardless of colour, and
 *   4. encodes fast, browser-friendly WebP into ../public/garments/.
 *
 * The photographs are used as-is — the fabric, seams, folds, collar and natural lighting are the
 * real render. Nothing is procedurally redrawn or hue-tinted.
 *
 * The giant original PNGs are NOT committed; only the optimised WebP derivatives are. Re-run with:
 *
 *   node apps/storefront/scripts/build-shirt-photos.mjs "C:/Users/Admin/Downloads"
 *
 * (pass the folder holding the Gemini_Generated_Image_*.png sources; defaults to ~/Downloads).
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = process.argv[2] || path.join(os.homedir(), 'Downloads');
const OUT_DIR = path.resolve(__dirname, '../public/garments');

// Colour name (asset slug) → source file. Front = left half, back = right half of each source.
const SOURCES = [
  { slug: 'red', file: 'Gemini_Generated_Image_gvwt6egvwt6egvwt.png' },
  { slug: 'black', file: 'Gemini_Generated_Image_3yoxh53yoxh53yox.png' },
  { slug: 'white', file: 'Gemini_Generated_Image_9ewla09ewla09ewl.png' },
  { slug: 'bone', file: 'Gemini_Generated_Image_99kifb99kifb99ki.png' },
  { slug: 'brown', file: 'Gemini_Generated_Image_5kkpl25kkpl25kkp.png' },
  { slug: 'navy', file: 'Gemini_Generated_Image_pp8h3ipp8h3ipp8h.png' },
  { slug: 'slate', file: 'Gemini_Generated_Image_yhpg8fyhpg8fyhpg.png' },
  { slug: 'olive', file: 'Gemini_Generated_Image_1fqy391fqy391fqy.png' },
  { slug: 'burgundy', file: 'Gemini_Generated_Image_52aylw52aylw52ay.png' },
  { slug: 'sand', file: 'Gemini_Generated_Image_6w6xn86w6xn86w6x.png' },
];

// Output canvas — the Studio viewBox ratio (400:460) at 2.5× for crisp retina display.
const CANVAS_W = 1000;
const CANVAS_H = 1150;
// How the trimmed garment is seated in the canvas. Tuned so the garment fills the SAME vertical
// band as the SVG silhouette the print zones (registry.ts) were calibrated against — collar ~15%
// down, body ~80% tall — so an artwork placed in the shared 400×460 space lands on the chest / back
// of the photograph exactly as it does on the SVG, without touching the shared print zones.
const MAX_W_FRAC = 0.94; // garment may span up to 94% of the canvas width…
const MAX_H_FRAC = 0.8; // …or 80% of the height, whichever keeps it fully inside (contain).
const TOP_FRAC = 0.15; // collar sits ~15% down from the top (matching the SVG shoulder line).
const TRIM_THRESHOLD = 22; // grey-ground tolerance: keeps fabric, drops ground + soft shadow + watermark.

async function sampleBackground(img) {
  // The ground colour is the very corner of the source; used to pad the canvas seamlessly.
  const { data } = await img
    .clone()
    .extract({ left: 2, top: 2, width: 2, height: 2 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

async function frameHalf(src, region, bg, outFile) {
  // Materialise the half first — extract + trim in a single pipeline confuses sharp's area maths.
  const half = await sharp(src).extract(region).png().toBuffer();
  // Trim the ground away to the garment's bounding box.
  const trimmed = await sharp(half)
    .trim({ background: bg, threshold: TRIM_THRESHOLD })
    .toBuffer({ resolveWithObject: true });

  const gw = trimmed.info.width;
  const gh = trimmed.info.height;

  // Contain-fit the garment into the target frame, preserving its own proportions.
  const scale = Math.min((CANVAS_W * MAX_W_FRAC) / gw, (CANVAS_H * MAX_H_FRAC) / gh);
  const rw = Math.round(gw * scale);
  const rh = Math.round(gh * scale);
  const resized = await sharp(trimmed.data).resize(rw, rh).toBuffer();

  const left = Math.round((CANVAS_W - rw) / 2);
  const top = Math.round(CANVAS_H * TOP_FRAC);

  await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 3, background: bg },
  })
    .composite([{ input: resized, left, top }])
    .webp({ quality: 82, effort: 6 })
    .toFile(outFile);

  const bytes = fs.statSync(outFile).size;
  console.log(`  ${path.basename(outFile)}  ${rw}x${rh} in ${CANVAS_W}x${CANVAS_H}  ${(bytes / 1024).toFixed(0)}KB`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const { slug, file } of SOURCES) {
    const src = path.join(SRC_DIR, file);
    if (!fs.existsSync(src)) {
      console.warn(`! missing source for ${slug}: ${src}`);
      continue;
    }
    const meta = await sharp(src).metadata();
    const mid = Math.floor(meta.width / 2);
    const bg = await sampleBackground(sharp(src));
    console.log(`${slug}  (${meta.width}x${meta.height}, ground rgb(${bg.r},${bg.g},${bg.b}))`);
    await frameHalf(src, { left: 0, top: 0, width: mid, height: meta.height }, bg, path.join(OUT_DIR, `${slug}-front.webp`));
    await frameHalf(src, { left: mid, top: 0, width: meta.width - mid, height: meta.height }, bg, path.join(OUT_DIR, `${slug}-back.webp`));
  }
  console.log(`\nDone → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
