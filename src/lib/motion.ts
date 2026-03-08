// Animation presets for Framer Motion
// Keep animations subtle, premium, and restrained

import { type Variants, type Transition } from 'framer-motion';

// --- Basic presets (spread onto motion.div) ---

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

// --- Stagger pattern (parent variants + child variants) ---

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

// Grid-optimized stagger (slightly slower)
export const staggerGrid: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

export const staggerGridItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

// List-optimized stagger (fast, for rows)
export const staggerList: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

export const staggerListItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

// --- Interactive feedback ---

export const tapScale = { scale: 0.97 } as const;
export const hoverLift = { y: -2, transition: { duration: 0.2 } } as const;
export const hoverGlow = { boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transition: { duration: 0.2 } } as const;

// --- Panel transitions (dialog, sheet, overlay) ---

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const panelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } },
};

// --- Spring configs ---

export const counterSpring = { stiffness: 100, damping: 30 } as const;

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

// --- Durations & Easing ---

export const DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  counter: 0.8,
} as const;

export const EASE = {
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  decelerate: [0, 0, 0.2, 1] as [number, number, number, number],
} as const;

// --- Reduced motion helper ---

export const reduceMotionProps = {
  initial: false as const,
  animate: false as const,
};
