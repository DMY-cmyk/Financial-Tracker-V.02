import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createUpload, listUploads, deleteUpload } from '@/server/services/upload.service';
import { DEMO_USER_ID } from '@/server/auth/current-user';

const OTHER_USER = 'other-user-0000-0000-000000000000';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('deleteUpload', () => {
  it('deletes an existing upload', async () => {
    const created = await createUpload(DEMO_USER_ID, {
      filename: 'receipt.png',
      fileSize: 123,
      mimeType: 'image/png',
    });
    expect(created.data).toBeDefined();

    const result = await deleteUpload(DEMO_USER_ID, created.data!.id);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ success: true });

    const list = await listUploads(DEMO_USER_ID);
    expect(list.data).toHaveLength(0);
  });

  it('returns NOT_FOUND for a missing id', async () => {
    const result = await deleteUpload(DEMO_USER_ID, 'nope');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });

  it("cannot delete another user's upload", async () => {
    const created = await createUpload(DEMO_USER_ID, {
      filename: 'receipt.png',
      fileSize: 123,
      mimeType: 'image/png',
    });

    const result = await deleteUpload(OTHER_USER, created.data!.id);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');

    const list = await listUploads(DEMO_USER_ID);
    expect(list.data).toHaveLength(1);
  });
});
