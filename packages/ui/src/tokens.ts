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
  backgroundPrimary: '#fafaf7',
  backgroundSecondary: '#f1f1ec',
  backgroundElevated: '#ffffff',
  surfacePrimary: '#ffffff',
  surfaceSecondary: '#f1f1ec',
  textPrimary: '#17171a',
  textSecondary: '#3d4450',
  textMuted: '#565e6b',
  borderDefault: '#e4e4dd',
  borderStrong: '#c7c7bc',
  accentPrimary: '#2d3e4e',
  accentSecondary: '#a2461f',
  onAccentPrimary: '#fafaf7',
  onAccentSecondary: '#fafaf7',
  success: '#2e7d57',
  warning: '#8a5a00',
  error: '#b3261e',
  information: '#2d5aa0',
  focusRing: '#3b6fd4',
  disabledBackground: '#e8e8e2',
  disabledText: '#8c8c82',
};

export const darkTheme: ThemeColors = {
  backgroundPrimary: '#121316',
  backgroundSecondary: '#1a1c20',
  backgroundElevated: '#22252b',
  surfacePrimary: '#1a1c20',
  surfaceSecondary: '#22252b',
  textPrimary: '#f4f4f0',
  textSecondary: '#c4c7ce',
  textMuted: '#9aa0ab',
  borderDefault: '#2e3238',
  borderStrong: '#474c55',
  accentPrimary: '#a9c4dc',
  accentSecondary: '#e08a5f',
  onAccentPrimary: '#121316',
  onAccentSecondary: '#121316',
  success: '#56c596',
  warning: '#d6a044',
  error: '#ef6a63',
  information: '#7aa7e6',
  focusRing: '#6fa0ff',
  disabledBackground: '#24272d',
  disabledText: '#6b7079',
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
