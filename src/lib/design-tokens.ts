// Design token constants for Financial Tracker V.02
// These mirror the CSS variables in globals.css as TypeScript constants
// for use in JS-driven styling (charts, dynamic colors, etc.)

export const colors = {
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
} as const;

export const categoryColors: Record<string, string> = {
  Food: '#F59E0B',
  Transport: '#3B82F6',
  Utilities: '#8B5CF6',
  Entertainment: '#EC4899',
  Salary: '#10B981',
  Freelance: '#06B6D4',
  Other: '#6B7280',
};

export const chartConfig = {
  income: { color: '#059669', label: 'Income' },
  expense: { color: '#DC2626', label: 'Expense' },
  areaOpacity: 0.15,
  gridDash: '3 3',
  gridColor: '#E5E7EB',
  animationDuration: 600,
  staggerDelay: 50,
  barRadius: 6,
  donutInnerRadius: '60%',
  donutOuterRadius: '85%',
} as const;

export const motion = {
  pageEnter: { opacity: 0, y: 8 },
  pageAnimate: { opacity: 1, y: 0 },
  pageDuration: 0.3,
  cardEnter: { opacity: 0, y: 12 },
  cardAnimate: { opacity: 1, y: 0 },
  cardDuration: 0.4,
  staggerDelay: 0.06,
  counterDuration: 0.8,
  buttonTap: { scale: 0.97 },
  toastSlide: { x: 100, opacity: 0 },
} as const;

export const typography = {
  fontPrimary: 'var(--font-jakarta)',
  fontMono: 'var(--font-jetbrains)',
  scale: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
