import nodemailer from "nodemailer";

export interface OrderEmailData {
  to: string;
  name: string;
  orderNumber: string;
  totalCents: number;
  currency: string;
  items: Array<{ name: string; emoji: string; qty: number; unitPrice: number; lineTotal: number }>;
  address: { address1: string; address2?: string | null; city: string; state: string; postal: string; country: string };
  deliveryMethod: "standard" | "express";
}

export const FROM_EMAIL = process.env.EMAIL_FROM ?? "Confetti Club <noreply@confetticlub.shop>";

// Create transporter lazily only when needed (to avoid errors on module load)
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.brevo.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  
  console.log("[email] Creating transporter:", { host, port, hasUser: !!user, hasPass: !!pass });
  
  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });
}

function formatMoney(cents: number, symbol: string) {
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function esc(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Build a branded HTML order confirmation email */
export function buildOrderEmail(data: OrderEmailData): { subject: string; html: string } {
  const sym = data.currency === "PKR" ? "Rs" : "$";
  const deliveryLabel = data.deliveryMethod === "express" ? "Express (2–3 days)" : "Standard (5–7 days)";
  const trackUrl = `${process.env.SITE_URL}/track/${data.orderNumber}`;

  const itemRows = data.items
    .map(
      (item: any) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:48px;font-size:22px">${esc(item.emoji)}</td>
      <td style="padding:12px 16px 12px 0;border-bottom:1px solid #f0f0f0;vertical-align:middle">
        <div style="font-weight:800;font-size:14px;color:#0D0D12;line-height:1.3">${esc(item.name)}</div>
        <div style="font-size:12px;color:#8A8A99;margin-top:2px">Qty ${item.qty} × ${formatMoney(item.unitPrice, sym)}</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:middle;font-weight:700;font-size:14px;color:#0D0D12">${formatMoney(item.lineTotal, sym)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#F4F1E8;font-family:'Manrope',system-ui,-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1E8;padding:24px 0">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFDF7;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(13,13,18,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#0D0D12;padding:32px 36px;text-align:center">
            <div style="font-size:28px;font-weight:900;color:#FFFDF7;letter-spacing:-0.5px">🎁 Confetti Club</div>
            <div style="font-size:13px;color:#B7A6FF;margin-top:4px;font-weight:600;letter-spacing:0.1em">GIFTS THAT HIT DIFFERENT</div>
          </td>
        </tr>

        <!-- Greeting + confirm -->
        <tr>
          <td style="padding:36px 36px 0;text-align:center">
            <div style="display:inline-block;background:#D6FF3E;color:#0D0D12;font-weight:900;font-size:12px;letter-spacing:0.12em;padding:6px 16px;border-radius:99px;margin-bottom:16px">✓ ORDER CONFIRMED</div>
            <h1 style="font-size:26px;font-weight:900;color:#0D0D12;margin:0 0 8px;line-height:1.2">Thanks for your order, ${esc(data.name)}! 🎉</h1>
            <p style="font-size:15px;color:#5B5B6B;margin:0;line-height:1.6">Your gift is being packed right now and will ship soon.<br/>Keep an eye on your inbox — tracking lands there first.</p>
          </td>
        </tr>

        <!-- Order details card -->
        <tr>
          <td style="padding:28px 36px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid rgba(13,13,18,0.08);border-radius:16px;overflow:hidden">
              <tr>
                <td style="background:#0D0D12;padding:14px 20px">
                  <span style="font-size:12px;font-weight:800;color:#B7A6FF;letter-spacing:0.1em">ORDER NUMBER</span>
                  <span style="float:right;font-size:16px;font-weight:900;color:#D6FF3E;font-family:'JetBrains Mono',monospace">${esc(data.orderNumber)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:20px">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>${itemRows}</tr>
                    <tr style="border-top:2px solid #0D0D12">
                      <td colspan="3" style="padding:16px 0">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr><td style="font-size:13px;color:#5B5B6B;padding-bottom:6px">Subtotal</td><td style="text-align:right;font-size:13px;font-weight:700;color:#5B5B6B;padding-bottom:6px">${formatMoney(data.items.reduce((s,i)=>s+i.lineTotal,0),sym)}</td></tr>
                          <tr><td style="font-size:13px;color:#5B5B6B;padding-bottom:6px">Shipping (${deliveryLabel})</td><td style="text-align:right;font-size:13px;font-weight:700;color:#5B5B6B;padding-bottom:6px">${formatMoney(0,sym)}</td></tr>
                          <tr style="border-top:2px dashed rgba(13,13,18,0.12)"><td style="font-size:16px;font-weight:900;color:#0D0D12;padding-top:10px">Total</td><td style="text-align:right;font-size:18px;font-weight:900;color:#7C5CFF;padding-top:10px">${formatMoney(data.totalCents,sym)}</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Delivery address & next steps -->
        <tr>
          <td style="padding:0 36px 28px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden">
              <tr>
                <td style="width:50%;padding:20px;background:#F4F1E8;vertical-align:top">
                  <div style="font-size:11px;font-weight:900;color:#8A8A99;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px">Shipping To</div>
                  <div style="font-size:14px;font-weight:700;color:#0D0D12">${esc(data.name)}</div>
                  <div style="font-size:13px;color:#5B5B6B;margin-top:4px;line-height:1.5">
                    ${esc(data.address.address1)}${data.address.address2 ? `<br/>${esc(data.address.address2)}` : ""}<br/>
                    ${esc(data.address.city)}, ${esc(data.address.state)} ${esc(data.address.postal)}<br/>
                    ${esc(data.address.country)}
                  </div>
                </td>
                <td style="width:50%;padding:20px;background:#F4F1E8;vertical-align:top;border-left:1px solid rgba(13,13,18,0.08)">
                  <div style="font-size:11px;font-weight:900;color:#8A8A99;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px">What's Next</div>
                  <div style="font-size:13px;color:#0D0D12;line-height:1.8">
                    ✅ Your order is saved<br/>
                    📦 We'll pack &amp; ship within 1 day<br/>
                    📧 You'll get a tracking link soon
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA button -->
        <tr>
          <td align="center" style="padding:0 36px 36px">
            <a href="${trackUrl}" target="_blank" style="display:inline-block;background:#7C5CFF;color:#FFFDF7;font-weight:900;font-size:15px;padding:14px 32px;border-radius:99px;text-decoration:none;letter-spacing:0.02em">Track My Order →</a>
            <div style="font-size:12px;color:#8A8A99;margin-top:12px">Need help? Contact us at hello@confetticlub.shop</div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0D0D12;padding:28px 36px;text-align:center">
            <div style="font-size:13px;color:#B7A6FF;font-weight:700;margin-bottom:6px">Made with confetti ✨ by Confetti Club</div>
            <div style="font-size:11px;color:#8A8A99;line-height:1.6">This is an automated message.<br/>Questions? Reach us at <a href="mailto:hello@confetticlub.shop" style="color:#D6FF3E;text-decoration:none">hello@confetticlub.shop</a></div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject: `Your Confetti Club order ${data.orderNumber} is confirmed! 🎉`, html };
}

export async function sendOrderConfirmation(data: OrderEmailData): Promise<{ ok: boolean; error?: string }> {
  console.log("[email] Checking env vars:");
  console.log("  SMTP_HOST:", process.env.SMTP_HOST || "(not set)");
  console.log("  SMTP_PORT:", process.env.SMTP_PORT || "(not set)");
  console.log("  SMTP_USER:", process.env.SMTP_USER ? "set (" + process.env.SMTP_USER.substring(0,8) + "..." + ")" : "(not set)");
  console.log("  SMTP_PASS:", process.env.SMTP_PASS ? "set (" + process.env.SMTP_PASS.substring(0,8) + "..." + ")" : "(not set)");
  console.log("  EMAIL_FROM:", process.env.EMAIL_FROM || "(not set)");

  // Check if credentials exist
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("[email] ERROR: SMTP credentials missing!");
    return { ok: false, error: "SMTP_USER and SMTP_PASS are not configured in environment variables" };
  }

  let transporter;
  try {
    transporter = createTransporter();
  } catch (transportError) {
    console.error("[email] Failed to create transport:", transportError);
    return { ok: false, error: "Failed to create email transport: " + String(transportError) };
  }

  try {
    console.log("[email] Verifying connection...");
    await transporter.verify();
    console.log("[email] Connection verified OK");
  } catch (verifyErr) {
    console.error("[email] Verify failed:", verifyErr);
    return { ok: false, error: "Connection verification failed: " + String(verifyErr) };
  }

  try {
    const { subject, html } = buildOrderEmail(data);
    console.log(`[email] Sending to ${data.to}...`);
    
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: [data.to],
      subject,
      html,
    });
    
    console.log(`[email] SUCCESS! messageId: ${info.messageId}`);
    return { ok: true };
  } catch (sendErr) {
    console.error("[email] Send failed:", sendErr);
    return { ok: false, error: "Send failed: " + (sendErr instanceof Error ? sendErr.message : String(sendErr)) };
  }
}