'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import { NAV_GROUPS, type NavGroup } from './nav-config';

interface UseNavGroupsReturn {
  groups: NavGroup[];
  isGroupCollapsed: (groupId: string) => boolean;
  toggleGroup: (groupId: string) => void;
}

export function useNavGroups(): UseNavGroupsReturn {
  const pathname = usePathname();
  const collapsedGroups = useStore((s) => s.ui.collapsedGroups);
  const toggleNavGroup = useStore((s) => s.toggleNavGroup);

  const hasActiveItem = useCallback(
    (group: NavGroup): boolean => {
      return group.items.some((item) => {
        if (item.href === '/') return pathname === '/';
        if (item.href === '/home') return pathname === '/home';
        return pathname.startsWith(item.href);
      });
    },
    [pathname]
  );

  const isGroupCollapsed = useCallback(
    (groupId: string): boolean => {
      const group = NAV_GROUPS.find((g) => g.id === groupId);
      if (!group) return false;
      // Groups with no labelKey are never collapsible
      if (!group.labelKey) return false;
      // Groups containing the active route are always expanded
      if (hasActiveItem(group)) return false;
      return (collapsedGroups ?? {})[groupId] ?? group.defaultCollapsed ?? false;
    },
    [collapsedGroups, hasActiveItem]
  );

  const toggleGroup = useCallback(
    (groupId: string) => {
      const group = NAV_GROUPS.find((g) => g.id === groupId);
      if (!group || !group.labelKey) return; // not collapsible
      if (hasActiveItem(group)) return; // active route guard
      toggleNavGroup(groupId);
    },
    [toggleNavGroup, hasActiveItem]
  );

  return { groups: NAV_GROUPS, isGroupCollapsed, toggleGroup };
}
