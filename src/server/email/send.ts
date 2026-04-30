import { getResend } from './client';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendMailResult {
  id?: string;
  dev?: boolean;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const client = getResend();
  if (!client) {
    console.log('[email] DEV MODE — would send:', input);
    return { dev: true };
  }
  const from = process.env.EMAIL_FROM ?? 'Financial Tracker <noreply@localhost>';
  const result = await client.emails.send({ from, ...input });
  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  return { id: result.data?.id };
}
