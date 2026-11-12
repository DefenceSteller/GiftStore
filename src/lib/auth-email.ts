/**
 * Branded auth emails (signup confirmation + password recovery) via the
 * Brevo HTTP API.
 *
 * Supabase's own dispatch always sends from "Supabase auth" with a plain
 * default template. We generate the link ourselves (auth.admin.generateLink)
 * and deliver it through Brevo so the sender shows "Confetti Club" and the
 * body matches the storefront theme (ink / iris / acid).
 *
 * Sender: `Confetti Club <confetticlubadmin@gmail.com>` (verified in Brevo).
 * API key: `process.env.SMTP_USER`.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

interface BrevoResult {
  ok: boolean;
  error?: string;
}

async function sendBrevo(to: string, subject: string, html: string): Promise<BrevoResult> {
  const apiKey = process.env.SMTP_USER;
  if (!apiKey) {
    return { ok: false, error: "Brevo API key not configured (SMTP_USER env var)" };
  }
  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Confetti Club", email: "confetticlubadmin@gmail.com" },
        to: [{ email: to, name: "Confetti Club member" }],
        subject,
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

/** Shared page shell matching the storefront (ink header, mist body, ink footer). */
function shell(badge: string, heading: string, intro: string, ctaHref: string, ctaLabel: string, note: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>${heading}</title></head>
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
            <div style="display:inline-block;background:#D6FF3E;color:#0D0D12;font-weight:900;font-size:12px;letter-spacing:0.12em;padding:6px 16px;border-radius:99px;margin-bottom:16px">${badge}</div>
            <h1 style="font-size:26px;font-weight:900;color:#0D0D12;margin:0 0 8px;line-height:1.2">${heading}</h1>
            <p style="font-size:15px;color:#5B5B6B;margin:0;line-height:1.6">${intro}</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:28px 36px">
            <a href="${ctaHref}" target="_blank" style="display:inline-block;background:#7C5CFF;color:#FFFDF7;font-weight:900;font-size:15px;padding:14px 32px;border-radius:99px;text-decoration:none;letter-spacing:0.02em">${ctaLabel} →</a>
            <div style="font-size:12px;color:#8A8A99;margin-top:14px;line-height:1.5">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${ctaHref}" style="color:#7C5CFF;text-decoration:none;word-break:break-all">${ctaHref}</a></div>
          </td>
        </tr>
        <tr>
          <td style="background:#0D0D12;padding:24px 36px;text-align:center">
            <div style="font-size:13px;color:#B7A6FF;font-weight:700;margin-bottom:6px">Made with confetti ✨ by Confetti Club</div>
            <div style="font-size:11px;color:#8A8A99;line-height:1.6">${note}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Send the signup confirmation link, branded as Confetti Club. */
export async function sendSignupConfirmation(data: {
  to: string;
  name?: string;
  confirmUrl: string;
}): Promise<BrevoResult> {
  const greeting = data.name ? `Hi ${data.name},` : "Hi,";
  const html = shell(
    "ONE MORE STEP",
    `${greeting} Confirm your account`,
    "Thanks for joining Confetti Club. Click the button below to activate your account — then your bag is waiting.",
    data.confirmUrl,
    "Activate my account",
    "This is an automated message. If you didn't create a Confetti Club account, you can safely ignore this email."
  );
  return sendBrevo(data.to, "Activate your Confetti Club account ✦", html);
}

/** Send the password-recovery link, branded as Confetti Club. */
export async function sendRecoveryEmail(data: {
  to: string;
  recoverUrl: string;
}): Promise<BrevoResult> {
  const html = shell(
    "PASSWORD RESET",
    "Reset your password",
    "We received a request to reset your Confetti Club password. Click the button below to choose a new one. If you didn't ask for this, you can ignore this email.",
    data.recoverUrl,
    "Reset my password",
    "This link expires shortly. Request a new one from the sign-in page if it has."
  );
  return sendBrevo(data.to, "Reset your Confetti Club password ✦", html);
}