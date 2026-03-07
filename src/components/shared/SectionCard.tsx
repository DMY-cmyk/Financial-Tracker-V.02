import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({ title, description, action, children, className, contentClassName }: SectionCardProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-6', title && 'pt-4', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
