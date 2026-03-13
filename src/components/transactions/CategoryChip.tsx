import { CATEGORY_COLORS } from '@/lib/constants';

interface CategoryChipProps {
  category: string;
  color?: string;
}

export function CategoryChip({ category, color: colorProp }: CategoryChipProps) {
  const color = colorProp || CATEGORY_COLORS[category] || '#6B7280';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {category}
    </span>
  );
}
