import { describe, expect, it } from 'vitest';
import { GARMENT_VIEWBOX, GARMENTS, type PrintZone } from './registry';
import { printBox, printBoxPercent } from './print-geometry';

const zone: PrintZone = { cx: 200, cy: 236, maxW: 150, maxH: 180 };

describe('printBox — the placement contract in viewBox units', () => {
  it('with no adjustment sits at the zone centre at the zone size', () => {
    expect(printBox(zone)).toEqual({ centerX: 200, centerY: 236, width: 150, height: 180 });
  });

  it('scale multiplies the box size but not its centre', () => {
    const box = printBox(zone, { scale: 0.5 });
    expect(box.width).toBe(75);
    expect(box.height).toBe(90);
    expect(box.centerX).toBe(200);
    expect(box.centerY).toBe(236);
  });

  it('offset shifts the centre by a percentage of the viewBox (400×460)', () => {
    const box = printBox(zone, { dxPct: 10, dyPct: -10 });
    expect(box.centerX).toBe(200 + 0.1 * GARMENT_VIEWBOX.w); // 240
    expect(box.centerY).toBe(236 - 0.1 * GARMENT_VIEWBOX.h); // 190
  });

  it('is a pure function of its inputs (no shared mutation)', () => {
    const a = printBox(zone, { scale: 2, dxPct: 5, dyPct: 5 });
    const b = printBox(zone, { scale: 2, dxPct: 5, dyPct: 5 });
    expect(a).toEqual(b);
  });
});

describe('printBoxPercent — the same box as CSS percentages', () => {
  it('matches the manual top-left/size derivation', () => {
    const p = printBoxPercent(zone);
    expect(p.widthPct).toBeCloseTo((150 / 400) * 100);
    expect(p.heightPct).toBeCloseTo((180 / 460) * 100);
    expect(p.leftPct).toBeCloseTo(((200 - 75) / 400) * 100);
    expect(p.topPct).toBeCloseTo(((236 - 90) / 460) * 100);
  });

  it('agrees with printBox (overlay uses printBox, the print layer uses printBoxPercent)', () => {
    const adj = { scale: 0.8, dxPct: 12, dyPct: -6 };
    const box = printBox(zone, adj);
    const pct = printBoxPercent(zone, adj);
    // The overlay and the print layer must describe the identical rectangle.
    expect(pct.leftPct).toBeCloseTo(((box.centerX - box.width / 2) / GARMENT_VIEWBOX.w) * 100);
    expect(pct.topPct).toBeCloseTo(((box.centerY - box.height / 2) / GARMENT_VIEWBOX.h) * 100);
    expect(pct.widthPct).toBeCloseTo((box.width / GARMENT_VIEWBOX.w) * 100);
    expect(pct.heightPct).toBeCloseTo((box.height / GARMENT_VIEWBOX.h) * 100);
  });
});

describe('printBox — real catalogue zones stay put (regression lock)', () => {
  it('classic-tee front zone resolves to its known percentages', () => {
    // Locks the calibrated placement so a helper change can never silently move a print.
    const p = printBoxPercent(GARMENTS['classic-tee'].print.front);
    expect(p.leftPct).toBeCloseTo(31.25);
    expect(p.topPct).toBeCloseTo(31.7391, 3);
    expect(p.widthPct).toBeCloseTo(37.5);
    expect(p.heightPct).toBeCloseTo(39.1304, 3);
  });

  it('every style has a distinct front and back zone', () => {
    for (const def of Object.values(GARMENTS)) {
      expect(def.print.front).not.toEqual(def.print.back);
    }
  });
});
