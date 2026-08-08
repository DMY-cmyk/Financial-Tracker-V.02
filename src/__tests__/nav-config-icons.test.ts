import { describe, it, expect } from 'vitest';
import { NAV_GROUPS } from '@/features/navigation/nav-config';

describe('sidebar nav icons', () => {
  it('every nav item uses a distinct icon', () => {
    const items = NAV_GROUPS.flatMap((g) => g.items);
    const seen = new Map<unknown, string>();
    for (const item of items) {
      const existing = seen.get(item.icon);
      expect(
        existing,
        `${item.href} reuses the same icon as ${existing} — pick a distinct one`
      ).toBeUndefined();
      seen.set(item.icon, item.href);
    }
  });
});
