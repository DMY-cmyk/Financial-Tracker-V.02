'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  createDebounced,
  createKeyedDebounced,
  type Debounced,
  type KeyedDebounced,
} from '@/lib/debounce';

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number
): (...args: A) => void {
  const fnRef = useRef(fn);
  const debouncedRef = useRef<Debounced<A> | null>(null);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(
    () => () => {
      debouncedRef.current?.cancel();
      debouncedRef.current = null;
    },
    [delayMs]
  );
  return useCallback(
    (...args: A) => {
      if (!debouncedRef.current) {
        debouncedRef.current = createDebounced((...a: A) => fnRef.current(...a), delayMs);
      }
      debouncedRef.current(...args);
    },
    [delayMs]
  );
}

export function useKeyedDebouncedCallback<A extends unknown[]>(
  fn: (key: string, ...args: A) => void,
  delayMs: number
): (key: string, ...args: A) => void {
  const fnRef = useRef(fn);
  const debouncedRef = useRef<KeyedDebounced<A> | null>(null);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(
    () => () => {
      debouncedRef.current?.cancelAll();
      debouncedRef.current = null;
    },
    [delayMs]
  );
  return useCallback(
    (key: string, ...args: A) => {
      if (!debouncedRef.current) {
        debouncedRef.current = createKeyedDebounced(
          (k: string, ...a: A) => fnRef.current(k, ...a),
          delayMs
        );
      }
      debouncedRef.current(key, ...args);
    },
    [delayMs]
  );
}
