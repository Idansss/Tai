/**
 * Silhouette geometry for the garment mockups, in the shared 400×460 viewBox (registry.ts).
 *
 * Each style has a `body` outline (one closed path — torso + sleeves), a `collar` detail for the
 * neckline, and optional `seams` (topstitch lines) and `folds` (soft drape lines). These are hand
 * authored to read as a real flat-lay: dropped-in sleeves, a scooped crew neck, a gently tapered
 * body and a curved hem — never a rectangle. The <GarmentSvg> component fills `body` with the
 * fabric colour and draws the rest as derived shades of it, so one shape works for every colour.
 */

import type { GarmentStyle, GarmentView } from './registry';

export interface GarmentShape {
  /** Closed silhouette path (torso + sleeves). */
  body: string;
  /** Neckline / collar rib detail, sitting on top of the body. */
  collar: string;
  /** Back-neck tape, only on the back view. */
  neckTape?: string;
  /** Topstitch / seam lines (sleeve hems, side, bottom hem). */
  seams: string[];
  /** Cuff bands for long sleeves. */
  cuffs?: string[];
  /** Soft fold/drape guide lines that add fabric movement. */
  folds: string[];
}

// --- Classic T-shirt -------------------------------------------------------

const CLASSIC_BODY_SLEEVES_TO_HEM =
  'C 120 74, 92 86, 64 108 C 44 128, 40 150, 48 172 C 62 190, 90 188, 116 184 ' +
  'C 110 250, 106 340, 120 426 Q 160 435, 200 435 Q 240 435, 280 426 ' +
  'C 294 340, 290 250, 284 184 C 310 188, 338 190, 352 172 C 360 150, 356 128, 336 108 ' +
  'C 308 86, 280 74, 250 72';

const classicFront: GarmentShape = {
  body:
    `M150 72 ${CLASSIC_BODY_SLEEVES_TO_HEM} ` +
    'C 240 74, 232 74, 226 76 Q 200 104, 174 76 C 168 74, 160 74, 150 72 Z',
  collar: 'M172 76 Q 200 106, 228 76 L 224 86 Q 200 118, 176 86 Z',
  seams: [
    'M120 426 Q 160 433, 200 433 Q 240 433, 280 426', // hem topstitch
    'M56 176 Q 74 186, 104 184', // left sleeve hem
    'M344 176 Q 326 186, 296 184', // right sleeve hem
  ],
  folds: [
    'M150 210 C 158 280, 156 350, 150 410', // left drape
    'M250 210 C 242 280, 244 350, 250 410', // right drape
    'M132 200 C 128 210, 126 224, 130 236', // underarm crease L
    'M268 200 C 272 210, 274 224, 270 236', // underarm crease R
  ],
};

const classicBack: GarmentShape = {
  body:
    `M150 72 ${CLASSIC_BODY_SLEEVES_TO_HEM} ` +
    'C 240 74, 224 72, 200 73 C 176 72, 160 72, 150 72 Z',
  collar: 'M164 74 Q 200 92, 236 74 L 234 80 Q 200 96, 166 80 Z',
  neckTape: 'M186 78 L214 78 L213 85 L187 85 Z',
  seams: [
    'M120 426 Q 160 433, 200 433 Q 240 433, 280 426',
    'M56 176 Q 74 186, 104 184',
    'M344 176 Q 326 186, 296 184',
  ],
  folds: [
    'M150 210 C 158 280, 156 350, 150 410',
    'M250 210 C 242 280, 244 350, 250 410',
    'M200 110 C 200 200, 200 320, 200 420', // centre-back seam hint
  ],
};

// --- Oversized T-shirt (wider, boxier, dropped shoulder, longer) -----------

const OVERSIZED_BODY_SLEEVES_TO_HEM =
  'C 112 84, 84 92, 52 110 C 36 124, 34 150, 44 178 C 66 196, 96 196, 120 190 ' +
  'C 116 264, 112 366, 118 448 Q 160 458, 200 458 Q 240 458, 282 448 ' +
  'C 288 366, 284 264, 280 190 C 304 196, 334 196, 356 178 C 366 150, 364 124, 348 110 ' +
  'C 316 92, 288 84, 262 84';

const oversizedFront: GarmentShape = {
  body:
    `M138 84 ${OVERSIZED_BODY_SLEEVES_TO_HEM} ` +
    'C 250 86, 240 86, 228 88 Q 200 114, 172 88 C 160 86, 150 84, 138 84 Z',
  collar: 'M170 88 Q 200 116, 230 88 L 226 98 Q 200 130, 174 98 Z',
  seams: [
    'M118 448 Q 160 456, 200 456 Q 240 456, 282 448',
    'M46 182 Q 68 194, 104 192',
    'M354 182 Q 332 194, 296 192',
  ],
  folds: [
    'M140 214 C 150 300, 148 380, 142 436',
    'M260 214 C 250 300, 252 380, 258 436',
    'M118 206 C 112 220, 110 236, 116 250',
    'M282 206 C 288 220, 290 236, 284 250',
  ],
};

const oversizedBack: GarmentShape = {
  body:
    `M138 84 ${OVERSIZED_BODY_SLEEVES_TO_HEM} ` +
    'C 250 86, 226 84, 200 85 C 174 84, 150 84, 138 84 Z',
  collar: 'M160 86 Q 200 104, 240 86 L 238 93 Q 200 108, 162 93 Z',
  neckTape: 'M184 90 L216 90 L215 98 L185 98 Z',
  seams: [
    'M118 448 Q 160 456, 200 456 Q 240 456, 282 448',
    'M46 182 Q 68 194, 104 192',
    'M354 182 Q 332 194, 296 192',
  ],
  folds: [
    'M140 214 C 150 300, 148 380, 142 436',
    'M260 214 C 250 300, 252 380, 258 436',
    'M200 120 C 200 220, 200 340, 200 440',
  ],
};

// --- Long-sleeve shirt (long tube sleeves down to cuffs) -------------------

const longFront: GarmentShape = {
  body:
    'M150 74 C 122 76, 96 86, 78 104 C 60 150, 48 250, 40 372 ' +
    'C 40 390, 46 400, 60 402 L 98 398 C 102 300, 110 220, 120 186 ' +
    'C 112 250, 108 340, 122 426 Q 160 434, 200 434 Q 240 434, 278 426 ' +
    'C 292 340, 288 250, 280 186 C 290 220, 298 300, 302 398 L 340 402 ' +
    'C 354 400, 360 390, 360 372 C 352 250, 340 150, 322 104 ' +
    'C 304 86, 278 76, 250 74 C 240 76, 232 76, 226 78 Q 200 104, 174 78 ' +
    'C 168 76, 160 74, 150 74 Z',
  collar: 'M172 78 Q 200 106, 228 78 L 224 88 Q 200 118, 176 88 Z',
  seams: [
    'M122 426 Q 160 433, 200 433 Q 240 433, 278 426',
    'M58 392 L98 388', // left cuff seam
    'M342 392 L302 388', // right cuff seam
  ],
  cuffs: ['M56 386 L100 382 L102 402 L60 402 Z', 'M344 386 L300 382 L298 402 L340 402 Z'],
  folds: [
    'M150 200 C 158 280, 156 350, 150 410',
    'M250 200 C 242 280, 244 350, 250 410',
    'M96 160 C 84 240, 76 320, 74 372', // left sleeve length fold
    'M304 160 C 316 240, 324 320, 326 372', // right sleeve length fold
  ],
};

// Same outer silhouette as the front but with a shallow, closed back neckline.
const LONG_BACK_BODY =
  'M150 74 C 122 76, 96 86, 78 104 C 60 150, 48 250, 40 372 ' +
  'C 40 390, 46 400, 60 402 L 98 398 C 102 300, 110 220, 120 186 ' +
  'C 112 250, 108 340, 122 426 Q 160 434, 200 434 Q 240 434, 278 426 ' +
  'C 292 340, 288 250, 280 186 C 290 220, 298 300, 302 398 L 340 402 ' +
  'C 354 400, 360 390, 360 372 C 352 250, 340 150, 322 104 ' +
  'C 304 86, 278 76, 250 74 C 224 72, 200 74, 200 74 C 176 72, 160 74, 150 74 Z';

const longBack: GarmentShape = {
  body: LONG_BACK_BODY,
  collar: 'M164 76 Q 200 94, 236 76 L 234 82 Q 200 98, 166 82 Z',
  neckTape: 'M186 80 L214 80 L213 87 L187 87 Z',
  seams: longFront.seams,
  cuffs: longFront.cuffs,
  folds: [
    'M150 200 C 158 280, 156 350, 150 410',
    'M250 200 C 242 280, 244 350, 250 410',
    'M96 160 C 84 240, 76 320, 74 372',
    'M304 160 C 316 240, 324 320, 326 372',
    'M200 100 C 200 200, 200 320, 200 420',
  ],
};

const SHAPES: Record<GarmentStyle, Record<GarmentView, GarmentShape>> = {
  'classic-tee': { front: classicFront, back: classicBack },
  'oversized-tee': { front: oversizedFront, back: oversizedBack },
  'long-sleeve': { front: longFront, back: longBack },
};

export function garmentShape(style: GarmentStyle, view: GarmentView): GarmentShape {
  return SHAPES[style][view];
}
