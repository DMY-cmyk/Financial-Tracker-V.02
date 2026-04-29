import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface FormatCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function FormatCard({ icon: Icon, label, description, selected, onClick }: FormatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
        selected
          ? 'border-primary bg-primary/5 shadow-card'
          : 'bg-surface-inset hover:border-border-subtle hover:bg-card hover:shadow-card border-transparent'
      )}
    >
      <Icon className={cn('h-8 w-8', selected ? 'text-primary' : 'text-muted-foreground')} />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </button>
  );
}
