import { describe, it, expect, vi } from 'vitest';
import { createDebounced, createKeyedDebounced } from '@/lib/debounce';

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

describe('createKeyedDebounced', () => {
  it('different keys do not cancel each other', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const keyed = createKeyedDebounced(spy, 500);
    keyed('a', 1);
    keyed('b', 2); // within the window — must NOT cancel a
    vi.advanceTimersByTime(500);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith('a', 1);
    expect(spy).toHaveBeenCalledWith('b', 2);
    vi.useRealTimers();
  });

  it('same key collapses to the last call', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const keyed = createKeyedDebounced(spy, 500);
    keyed('a', 1);
    keyed('a', 9);
    vi.advanceTimersByTime(500);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('a', 9);
    vi.useRealTimers();
  });
});
