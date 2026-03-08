import { initializeStore, isStoreInitialized } from './store';
import { getSampleData } from '@/data/sample-data';

export function ensureSeeded() {
  if (isStoreInitialized()) return;
  const data = getSampleData();
  initializeStore(data);
}
