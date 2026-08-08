import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/read-json';
import { listExportJobs, createExportJob } from '@/server/services/export-job.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const result = await listExportJobs(requireUserId(request));

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { jobs: result.data } });
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const result = await createExportJob(requireUserId(request), body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
