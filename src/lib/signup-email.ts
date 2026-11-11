/**
 * Signup-confirmation email via the Brevo HTTP API.
 *
 * Supabase's own `resend({type: "signup"})` is rate-limited (2/hour per
 * address) and frequently fails on a fresh signup with
 * "over_email_send_rate_limit" — which used to silently swallow the
 * activation link while the UI still said "check your inbox". This module
 * takes a `confirmUrl` (from `auth.admin.generateLink`) and delivers it
 * ourselves, so the link always goes out.
 *
 * Sender: `Confetti Club <confetticlubadmin@gmail.com>` (verified in Brevo).
 * API key: `process.env.SMTP_USER` (same key used for order emails).
 */

export interface SignupEmailData {
  to: string;
  name?: string;
  confirmUrl: string;
}

const FROM_EMAIL = "Confetti Club <confetticlubadmin@gmail.com>";

export async function sendSignupConfirmation(
  data: SignupEmailData
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.SMTP_USER;
  if (!apiKey) {
    return { ok: false, error: "Brevo API key not configured (SMTP_USER env var)" };
  }

  const greeting = data.name ? `Hi ${data.name},` : "Hi,";
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Confirm your Confetti Club account</title></head>
<body style="margin:0;padding:0;background:#F4F1E8;font-family:'Manrope',system-ui,-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1E8;padding:24px 0">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFDF7;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(13,13,18,0.08)">
        <tr>
          <td style="background:#0D0D12;padding:32px 36px;text-align:center">
            <div style="font-size:28px;font-weight:900;color:#FFFDF7;letter-spacing:-0.5px">🎉 Confetti Club</div>
            <div style="font-size:13px;color:#B7A6FF;margin-top:4px;font-weight:600;letter-spacing:0.1em">GIFTS THAT HIT DIFFERENT</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 0;text-align:center">
            <div style="display:inline-block;background:#7C5CFF;color:#FFFDF7;font-weight:900;font-size:12px;letter-spacing:0.12em;padding:6px 16px;border-radius:99px;margin-bottom:16px">ONE MORE STEP</div>
            <h1 style="font-size:26px;font-weight:900;color:#0D0D12;margin:0 0 8px;line-height:1.2">${greeting} Confirm your account</h1>
            <p style="font-size:15px;color:#5B5B6B;margin:0;line-height:1.6">Thanks for joining Confetti Club. Click the button below to activate your account — then your bag is waiting.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:28px 36px">
            <a href="${data.confirmUrl}" target="_blank" style="display:inline-block;background:#7C5CFF;color:#FFFDF7;font-weight:900;font-size:15px;padding:14px 32px;border-radius:99px;text-decoration:none;letter-spacing:0.02em">Activate my account →</a>
            <div style="font-size:12px;color:#8A8A99;margin-top:14px;line-height:1.5">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${data.confirmUrl}" style="color:#7C5CFF;text-decoration:none;word-break:break-all">${data.confirmUrl}</a></div>
          </td>
        </tr>
        <tr>
          <td style="background:#0D0D12;padding:24px 36px;text-align:center">
            <div style="font-size:11px;color:#8A8A99;line-height:1.6">This is an automated message. If you didn't create a Confetti Club account, you can ignore this email.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Confetti Club", email: "confetticlubadmin@gmail.com" },
        to: [{ email: data.to, name: data.name || "Confetti Club member" }],
        subject: "Activate your Confetti Club account ✦",
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Brevo API error (${response.status}): ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Send failed: " + (err instanceof Error ? err.message : String(err)) };
  }
}