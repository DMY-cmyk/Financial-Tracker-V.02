// Polyfill sessionStorage for Node environment in tests
// Only needed for tests that exercise browser storage APIs

if (typeof globalThis.sessionStorage === 'undefined') {
  const store: Record<string, string> = {};

  globalThis.sessionStorage = {
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string): void {
      store[key] = value;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
  } as Storage;
}
