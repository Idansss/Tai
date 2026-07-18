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
  backgroundPrimary: '#f3f1e9',
  backgroundSecondary: '#e9e6da',
  backgroundElevated: '#fbfaf5',
  surfacePrimary: '#fbfaf5',
  surfaceSecondary: '#eeebe1',
  textPrimary: '#241f1b',
  textSecondary: '#4a443b',
  textMuted: '#5e594f',
  borderDefault: '#ddd6c6',
  borderStrong: '#b9b19d',
  accentPrimary: '#8a5a10',
  accentSecondary: '#8c4a2f',
  onAccentPrimary: '#fbfaf5',
  onAccentSecondary: '#fbfaf5',
  success: '#2f6b47',
  warning: '#8a5a00',
  error: '#b3261e',
  information: '#2d5aa0',
  focusRing: '#b4530f',
  disabledBackground: '#e6e2d5',
  disabledText: '#7d7669',
};

export const darkTheme: ThemeColors = {
  backgroundPrimary: '#191614',
  backgroundSecondary: '#211d19',
  backgroundElevated: '#2a251f',
  surfacePrimary: '#211d19',
  surfaceSecondary: '#2a251f',
  textPrimary: '#f3f1e9',
  textSecondary: '#ccc5b8',
  textMuted: '#9d9689',
  borderDefault: '#332d26',
  borderStrong: '#4e463c',
  accentPrimary: '#e8b25c',
  accentSecondary: '#e0916a',
  onAccentPrimary: '#191614',
  onAccentSecondary: '#191614',
  success: '#56c596',
  warning: '#d6a044',
  error: '#ef6a63',
  information: '#7aa7e6',
  focusRing: '#f0a24a',
  disabledBackground: '#241f1b',
  disabledText: '#6d665b',
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
