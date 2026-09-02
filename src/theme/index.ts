/**
 * UjianPintar Unified Design System Tokens
 * Fonts: Plus Jakarta Sans (Regular, Medium, SemiBold, Bold, ExtraBold)
 * Palette: Modern Slate, Cobalt Blue, Emerald, Amber, Crimson
 */

export const typography = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const colors = {
  // Brand / Primary
  primary: '#2563eb', // Modern Cobalt Blue
  primaryDark: '#1d4ed8',
  primaryLight: '#eff6ff',
  primaryBorder: '#bfdbfe',
  primarySurface: '#dbeafe',

  // Slate Neutral Text & Surfaces
  textPrimary: '#0f172a', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#64748b', // Slate 500
  textSubtle: '#94a3b8', // Slate 400

  // Backgrounds & Cards
  bgApp: '#f8fafc', // Slate 50
  bgSurface: '#ffffff', // Pure White
  bgCardSubtle: '#f1f5f9', // Slate 100
  bgElevated: '#f8fafc',

  // Borders
  borderLight: '#f1f5f9',
  borderDefault: '#e2e8f0', // Slate 200
  borderMedium: '#cbd5e1', // Slate 300
  borderDark: '#94a3b8',

  // Accents / Status
  success: '#059669', // Emerald 600
  successLight: '#ecfdf5',
  successBorder: '#a7f3d0',
  successText: '#065f46',

  warning: '#d97706', // Amber 600
  warningLight: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#92400e',

  danger: '#dc2626', // Crimson Red 600
  dangerLight: '#fef2f2',
  dangerBorder: '#fecaca',
  dangerText: '#991b1b',

  doubt: '#7c3aed', // Purple 600
  doubtLight: '#f5f3ff',
  doubtBorder: '#ddd6fe',
  doubtText: '#5b21b6',
} as const;

export const shadows = {
  card: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  primaryBtn: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;
