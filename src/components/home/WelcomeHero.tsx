'use client';

import { motion } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp } from '@/lib/motion';

interface WelcomeHeroProps {
  userName: string;
  isLoading: boolean;
}

function getGreetingKey(): 'welcomeMorning' | 'welcomeAfternoon' | 'welcomeEvening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'welcomeMorning';
  if (hour >= 12 && hour < 18) return 'welcomeAfternoon';
  return 'welcomeEvening';
}

export function WelcomeHero({ userName, isLoading }: WelcomeHeroProps) {
  const locale = useLocale();
  const greetingKey = getGreetingKey();

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 sm:p-8 dark:from-blue-950/30 dark:via-gray-900 dark:to-emerald-950/30"
    >
      {isLoading ? (
        <div className="space-y-3">
          <div className="bg-muted h-8 w-48 animate-pulse rounded-lg" />
          <div className="bg-muted h-5 w-64 animate-pulse rounded-lg" />
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {t(locale, greetingKey)}
            {userName ? `, ${userName}` : ''}
          </h1>
          <motion.p
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.05 }}
            className="text-muted-foreground mt-2 text-sm sm:text-base"
          >
            {t(locale, 'homeSubtitle')}
          </motion.p>
        </>
      )}
    </motion.div>
  );
}
