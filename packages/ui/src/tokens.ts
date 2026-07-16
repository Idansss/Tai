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
  backgroundPrimary: '#f4f6f8',
  backgroundSecondary: '#e8ecf0',
  backgroundElevated: '#ffffff',
  surfacePrimary: '#ffffff',
  surfaceSecondary: '#e8ecf0',
  textPrimary: '#0c1017',
  textSecondary: '#3a4454',
  textMuted: '#5a6575',
  borderDefault: '#d5dbe3',
  borderStrong: '#b4becb',
  accentPrimary: '#152238',
  accentSecondary: '#0f6b63',
  onAccentPrimary: '#f4f6f8',
  onAccentSecondary: '#f4f6f8',
  success: '#1f7a52',
  warning: '#8a5a00',
  error: '#b3261e',
  information: '#1f5aa8',
  focusRing: '#2f6fdb',
  disabledBackground: '#e2e6eb',
  disabledText: '#8a93a0',
};

export const darkTheme: ThemeColors = {
  backgroundPrimary: '#0b0e13',
  backgroundSecondary: '#131821',
  backgroundElevated: '#1a212c',
  surfacePrimary: '#131821',
  surfaceSecondary: '#1a212c',
  textPrimary: '#eef2f6',
  textSecondary: '#c0c8d4',
  textMuted: '#939cab',
  borderDefault: '#2a3340',
  borderStrong: '#445064',
  accentPrimary: '#8eb4d8',
  accentSecondary: '#4db8ad',
  onAccentPrimary: '#0b0e13',
  onAccentSecondary: '#0b0e13',
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
