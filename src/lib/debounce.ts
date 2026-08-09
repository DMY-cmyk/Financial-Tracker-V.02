export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
}

export function createDebounced<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

export interface KeyedDebounced<A extends unknown[]> {
  (key: string, ...args: A): void;
  cancelAll: () => void;
}

/** One independent debounce timer per key — calls for different keys never cancel each other. */
export function createKeyedDebounced<A extends unknown[]>(
  fn: (key: string, ...args: A) => void,
  delayMs: number
): KeyedDebounced<A> {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const keyed = (key: string, ...args: A) => {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn(key, ...args);
      }, delayMs)
    );
  };
  keyed.cancelAll = () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  };
  return keyed;
}
