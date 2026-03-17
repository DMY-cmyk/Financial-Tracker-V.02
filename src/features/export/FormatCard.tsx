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
        'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'bg-muted/50 hover:bg-muted border-transparent'
      )}
    >
      <Icon className="text-muted-foreground h-8 w-8" />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </button>
  );
}
