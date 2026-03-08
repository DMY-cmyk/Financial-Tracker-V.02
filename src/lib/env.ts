/**
 * Typed access to public environment variables.
 * All values are strings or undefined at runtime.
 * Use these accessors instead of reading process.env directly.
 */

export const env = {
  /** Base path for GitHub Pages deployment (e.g., "/Financial-Tracker-V.02") */
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  /** App display title */
  appTitle: process.env.NEXT_PUBLIC_APP_TITLE || 'Financial Tracker',

  /** Backend API URL (placeholder — app is currently fully client-side) */
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',

  /** Whether the app is running in production */
  isProd: process.env.NODE_ENV === 'production',
} as const;
