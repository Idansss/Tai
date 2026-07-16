/**
 * Machine-readable mirror of the CSS token values in styles/tokens.css.
 * Used by the contrast test (a11y gate) and available to apps that need raw values.
 * Keep in sync with styles/tokens.css.
 */

export interface ThemeColors {
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundElevated: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderDefault: string;
  borderStrong: string;
  accentPrimary: string;
  accentSecondary: string;
  onAccentPrimary: string;
  onAccentSecondary: string;
  success: string;
  warning: string;
  error: string;
  information: string;
  focusRing: string;
  disabledBackground: string;
  disabledText: string;
}

export const lightTheme: ThemeColors = {
  backgroundPrimary: '#f4f3f0',
  backgroundSecondary: '#eae8e3',
  backgroundElevated: '#ffffff',
  surfacePrimary: '#ffffff',
  surfaceSecondary: '#eae8e3',
  textPrimary: '#131417',
  textSecondary: '#3b3f47',
  textMuted: '#5c606a',
  borderDefault: '#dcd9d2',
  borderStrong: '#bcb8ae',
  accentPrimary: '#16171a',
  accentSecondary: '#0f6b63',
  onAccentPrimary: '#f4f3f0',
  onAccentSecondary: '#f4f3f0',
  success: '#1f7a52',
  warning: '#8a5a00',
  error: '#b3261e',
  information: '#1f5aa8',
  focusRing: '#2f6fdb',
  disabledBackground: '#e2e0da',
  disabledText: '#9a968c',
};

export const darkTheme: ThemeColors = {
  backgroundPrimary: '#0d0e10',
  backgroundSecondary: '#151619',
  backgroundElevated: '#1c1e22',
  surfacePrimary: '#151619',
  surfaceSecondary: '#1c1e22',
  textPrimary: '#f1f0ec',
  textSecondary: '#c3c2bc',
  textMuted: '#96958e',
  borderDefault: '#2b2d31',
  borderStrong: '#474a50',
  accentPrimary: '#edebe4',
  accentSecondary: '#43bbb0',
  onAccentPrimary: '#0d0e10',
  onAccentSecondary: '#0d0e10',
  success: '#4ecf95',
  warning: '#d6a044',
  error: '#ef6a63',
  information: '#7aa7e6',
  focusRing: '#6fa0ff',
  disabledBackground: '#1c222c',
  disabledText: '#6b7380',
};

/** WCAG relative luminance for an sRGB hex colour. */
export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(full.slice(0, 2), 16));
  const g = channel(parseInt(full.slice(2, 4), 16));
  const b = channel(parseInt(full.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
