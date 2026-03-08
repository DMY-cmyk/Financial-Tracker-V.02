// Animation presets for Framer Motion integration
// Import these in components that need animation

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
} as const;

export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.3 },
} as const;

export const fadeInDown = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3 },
} as const;

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
} as const;

export const slideInRight = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 16 },
  transition: { duration: 0.3 },
} as const;

// Stagger children pattern: use with `motion.div` parent + `variants`
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
} as const;

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
} as const;

// Button press scale
export const tapScale = { scale: 0.97 } as const;

// Spring config for animated counters
export const counterSpring = { stiffness: 100, damping: 30 } as const;

// Durations
export const DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  counter: 0.8,
} as const;

// Easing
export const EASE = {
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const;
