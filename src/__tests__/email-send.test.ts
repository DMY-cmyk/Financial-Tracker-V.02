import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

beforeEach(() => {
  sendMock.mockReset();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('email/send', () => {
  it('logs to console and returns dev-mode result when RESEND_API_KEY missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendMail } = await import('@/server/email/send');
    const res = await sendMail({ to: 'a@b.co', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' });
    expect(res.dev).toBe(true);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('calls Resend.emails.send when key is set', async () => {
    vi.stubEnv('RESEND_API_KEY', 'real-key');
    vi.stubEnv('EMAIL_FROM', 'noreply@example.com');
    sendMock.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
    const { sendMail } = await import('@/server/email/send');
    const res = await sendMail({ to: 'a@b.co', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' });
    expect(sendMock).toHaveBeenCalled();
    expect(res.id).toBe('msg-1');
  });
});
