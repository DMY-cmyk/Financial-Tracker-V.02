export interface PasswordResetTemplateInput {
  locale: 'en' | 'id';
  resetUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COPY = {
  en: {
    subject: 'Reset your Financial Tracker password',
    headline: 'Reset your ledger.',
    body: "We received a request to reset your password. The link below is valid for 1 hour. If you didn't ask for this, you can safely ignore this email.",
    cta: 'Reset password',
    fallback: 'Or paste this URL into your browser:',
    signoff: '— Financial Tracker',
  },
  id: {
    subject: 'Atur ulang kata sandi Financial Tracker Anda',
    headline: 'Atur ulang buku besar Anda.',
    body: 'Kami menerima permintaan untuk mengatur ulang kata sandi Anda. Tautan di bawah ini berlaku 1 jam. Abaikan email ini jika Anda tidak meminta perubahan.',
    cta: 'Atur ulang kata sandi',
    fallback: 'Atau tempel URL berikut ke browser Anda:',
    signoff: '— Financial Tracker',
  },
} as const;

export function renderPasswordResetEmail({
  locale,
  resetUrl,
}: PasswordResetTemplateInput): RenderedEmail {
  const c = COPY[locale];
  const html = `<!doctype html>
<html><body style="margin:0;padding:32px;background:#f4f4f2;font-family:Geist,system-ui,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e3;">
    <tr><td style="padding:32px 36px;">
      <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#6b6b6b;">FINANCIAL TRACKER</div>
      <h1 style="font-family:Fraunces,serif;font-style:italic;font-weight:400;font-size:32px;letter-spacing:-0.015em;line-height:1;margin:16px 0 12px;">${c.headline}</h1>
      <p style="font-size:14px;line-height:1.5;margin:0 0 24px;">${c.body}</p>
      <a href="${resetUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;font-size:12px;padding:14px 22px;text-decoration:none;">${c.cta} →</a>
      <p style="font-size:12px;color:#6b6b6b;margin:24px 0 4px;">${c.fallback}</p>
      <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;word-break:break-all;color:#0a0a0a;margin:0 0 24px;">${resetUrl}</p>
      <hr style="border:0;border-top:1px solid #e6e6e3;margin:24px 0;" />
      <p style="font-family:Fraunces,serif;font-style:italic;font-size:13px;color:#6b6b6b;margin:0;">${c.signoff}</p>
    </td></tr>
  </table>
</body></html>`;

  const text = `${c.headline}\n\n${c.body}\n\n${c.cta}: ${resetUrl}\n\n${c.signoff}\n`;

  return { subject: c.subject, html, text };
}
