'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createDebounced } from '@/lib/debounce';

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
