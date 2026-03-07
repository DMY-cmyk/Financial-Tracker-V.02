const STORAGE_KEY = 'financial-tracker-v2';

export function loadState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveState<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY}-${key}`, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

export function clearAll(): void {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY));
  keys.forEach(k => localStorage.removeItem(k));
}

export function isFirstLoad(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(`${STORAGE_KEY}-initialized`) !== 'true';
}

export function markInitialized(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY}-initialized`, 'true');
}
