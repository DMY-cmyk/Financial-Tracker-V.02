'use client';

import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { FolderNavigator } from '@/components/folders/FolderNavigator';

export default function DashboardPage() {
  const router = useRouter();
  useKeyboardShortcuts({
    onNewTransaction: () => router.push('/transactions/new'),
  });

  return <FolderNavigator />;
}
