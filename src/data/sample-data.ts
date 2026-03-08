import { migrateWorkbook } from '@/lib/data-migration';
import workbookData from '../../data/workbook.json';

export function getSampleData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return migrateWorkbook(workbookData as any);
}
