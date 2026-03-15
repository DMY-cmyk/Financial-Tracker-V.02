'use client';

import { useState, useEffect } from 'react';
import { WelcomeHero } from '@/components/home/WelcomeHero';
import { FeatureGrid } from '@/components/home/FeatureGrid';

export default function HomePage() {
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.data?.user?.name) {
          setUserName(data.data.user.name);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <WelcomeHero userName={userName} isLoading={isLoading} />
      <FeatureGrid />
    </div>
  );
}
