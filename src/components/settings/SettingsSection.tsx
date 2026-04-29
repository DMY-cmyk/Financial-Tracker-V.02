import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <div
      className={cn(
        'border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-6 transition-shadow duration-300',
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      </div>
      {children}
    </div>
  );
}
