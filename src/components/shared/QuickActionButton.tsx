import Link from 'next/link';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  href: string;
  className?: string;
}

export function QuickActionButton({ icon: Icon, label, description, href, className }: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md',
        className
      )}
    >
      <div className="rounded-xl bg-primary/10 p-3 transition-colors group-hover:bg-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </Link>
  );
}
