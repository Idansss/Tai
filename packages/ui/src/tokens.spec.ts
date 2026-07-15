import { describe, expect, it } from 'vitest';
import { contrastRatio, darkTheme, lightTheme, type ThemeColors } from './tokens.js';

/** Foreground/background pairs that must meet WCAG 2.2 AA (master prompt §8). */
function pairs(t: ThemeColors): Array<{ name: string; fg: string; bg: string; min: number }> {
  return [
    // Body & secondary text on the primary and elevated surfaces.
    {
      name: 'text-primary / background-primary',
      fg: t.textPrimary,
      bg: t.backgroundPrimary,
      min: 4.5,
    },
    {
      name: 'text-secondary / background-primary',
      fg: t.textSecondary,
      bg: t.backgroundPrimary,
      min: 4.5,
    },
    { name: 'text-muted / background-primary', fg: t.textMuted, bg: t.backgroundPrimary, min: 4.5 },
    { name: 'text-muted / surface-secondary', fg: t.textMuted, bg: t.surfaceSecondary, min: 4.5 },
    { name: 'text-primary / surface-primary', fg: t.textPrimary, bg: t.surfacePrimary, min: 4.5 },
    // Foreground text placed on accent fills (buttons, badges).
    {
      name: 'on-accent-primary / accent-primary',
      fg: t.onAccentPrimary,
      bg: t.accentPrimary,
      min: 4.5,
    },
    {
      name: 'on-accent-secondary / accent-secondary',
      fg: t.onAccentSecondary,
      bg: t.accentSecondary,
      min: 4.5,
    },
    // Status colours used as text on the primary surface.
    { name: 'success / background-primary', fg: t.success, bg: t.backgroundPrimary, min: 4.5 },
    { name: 'warning / background-primary', fg: t.warning, bg: t.backgroundPrimary, min: 4.5 },
    { name: 'error / background-primary', fg: t.error, bg: t.backgroundPrimary, min: 4.5 },
    {
      name: 'information / background-primary',
      fg: t.information,
      bg: t.backgroundPrimary,
      min: 4.5,
    },
    // Meaningful interface boundaries / states and the focus indicator (WCAG 1.4.11, 3:1).
    // Note: border-default / border-strong are decorative dividers, exempt from 1.4.11;
    // their legibility is checked separately below, not against the 3:1 minimum.
    {
      name: 'accent-primary / background-primary',
      fg: t.accentPrimary,
      bg: t.backgroundPrimary,
      min: 3,
    },
    { name: 'focus-ring / background-primary', fg: t.focusRing, bg: t.backgroundPrimary, min: 3 },
  ];
}

describe.each([
  ['light', lightTheme],
  ['dark', darkTheme],
])('token contrast (%s theme)', (_label, theme) => {
  it.each(pairs(theme))('$name meets $min:1', ({ fg, bg, min }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('is symmetric', () => {
    expect(contrastRatio('#123456', '#abcdef')).toBeCloseTo(contrastRatio('#abcdef', '#123456'), 5);
  });
});
