// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DayOfWeekPills } from '@/features/insights/DayOfWeekPills';
import type { DayOfWeekItem } from '@/lib/api/contracts';

afterEach(() => cleanup());

const mockData: DayOfWeekItem[] = [
  { dayIndex: 0, totalAmount: 100000, count: 1, avgAmount: 100000 },
  { dayIndex: 1, totalAmount: 200000, count: 2, avgAmount: 100000 },
];

describe('DayOfWeekPills accessibility', () => {
  it('pill container has role="list" with aria-label', () => {
    render(<DayOfWeekPills data={mockData} locale="en" />);
    const list = screen.getByRole('list');
    expect(list).toBeDefined();
    expect(list.getAttribute('aria-label')).toBeTruthy();
  });

  it('each pill has role="listitem" with aria-label containing day name', () => {
    render(<DayOfWeekPills data={mockData} locale="en" />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(mockData.length);
    expect(items[0].getAttribute('aria-label')).toContain('Sun');
  });
});
