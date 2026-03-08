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

export function QuickActionButton({
  icon: Icon,
  label,
  description,
  href,
  className,
}: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group border-border bg-card hover:border-primary/20 flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:shadow-md',
        className
      )}
    >
      <div className="bg-primary/10 group-hover:bg-primary/15 rounded-xl p-3 transition-colors">
        <Icon className="text-primary h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
    </Link>
  );
}
