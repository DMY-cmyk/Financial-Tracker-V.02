import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';

export async function DELETE() {
  try {
    const db = await getDb();
    await db.exec(`
      DELETE FROM transactions;
      DELETE FROM categories;
      DELETE FROM payment_methods;
      DELETE FROM bills;
      DELETE FROM savings_goals;
      DELETE FROM settings;
      DELETE FROM uploads;
      DELETE FROM export_jobs;
    `);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to clear data',
          code: 'CLEAR_FAILED',
        },
      },
      { status: 500 }
    );
  }
}
