import { CATEGORY_COLORS } from '@/lib/constants';
import { useStore } from '@/store';

interface CategoryChipProps {
  category: string;
}

export function CategoryChip({ category }: CategoryChipProps) {
  const categories = useStore(s => s.categories);
  const cat = categories.find(c => c.name === category);
  const color = cat?.color || CATEGORY_COLORS[category] || '#6B7280';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {category}
    </span>
  );
}
