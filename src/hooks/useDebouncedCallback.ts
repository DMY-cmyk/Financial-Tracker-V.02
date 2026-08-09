'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createDebounced, createKeyedDebounced } from '@/lib/debounce';

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number
): (...args: A) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const debounced = useMemo(
    () => createDebounced((...args: A) => fnRef.current(...args), delayMs),
    [delayMs]
  );
  useEffect(() => () => debounced.cancel(), [debounced]);
  return debounced;
}

export function useKeyedDebouncedCallback<A extends unknown[]>(
  fn: (key: string, ...args: A) => void,
  delayMs: number
): (key: string, ...args: A) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const debounced = useMemo(
    () => createKeyedDebounced((key: string, ...args: A) => fnRef.current(key, ...args), delayMs),
    [delayMs]
  );
  useEffect(() => () => debounced.cancelAll(), [debounced]);
  return debounced;
}
