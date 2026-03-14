'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { MobileNav } from './MobileNav';

const AUTH_PATHS = ['/login', '/register'];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const collapsed = useStore((s) => s.ui.sidebarCollapsed);
  const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Auth pages render without the shell
  if (AUTH_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setSidebarCollapsed(!collapsed)}
        className="hidden lg:flex"
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="p-4 pb-20 sm:p-6 lg:pb-6">{children}</div>
        </main>
      </div>

      {/* Mobile navigation drawer */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
