import { NextResponse } from 'next/server';

/**
 * Safely parse a JSON request body.
 *
 * `request.json()` throws on malformed/empty bodies; left unhandled that
 * surfaces as a generic 500. This wraps it so callers can return a clean 400
 * with the same error envelope the services use.
 *
 * Usage:
 *   const parsed = await readJsonBody(request);
 *   if (parsed.error) return parsed.error;
 *   const result = await doThing(parsed.data);
 */
export type JsonBodyResult =
  | { data: unknown; error?: undefined }
  | { data?: undefined; error: NextResponse };

export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  try {
    return { data: await request.json() };
  } catch {
    return {
      error: NextResponse.json(
        { error: { message: 'Invalid JSON body', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      ),
    };
  }
}
