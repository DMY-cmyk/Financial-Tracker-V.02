import { describe, it, expect, vi } from 'vitest';
import { createDebounced } from '@/lib/debounce';

describe('createDebounced', () => {
  it('collapses rapid calls into the last one', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = createDebounced(spy, 500);
    debounced('a');
    debounced('b');
    debounced('c');
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('c');
    vi.useRealTimers();
  });

  it('cancel() prevents pending call', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = createDebounced(spy, 500);
    debounced('x');
    debounced.cancel();
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
