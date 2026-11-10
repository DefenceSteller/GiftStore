import { NextResponse } from "next/server";

export async function GET() {
  // Log everything to console
  console.log("=== ENVIRONMENT CHECK ===");
  console.log("SMTP_HOST:", process.env.SMTP_HOST || "(NOT SET)");
  console.log("SMTP_PORT:", process.env.SMTP_PORT || "(NOT SET)");
  console.log("SMTP_USER length:", (process.env.SMTP_USER || "").length);
  console.log("SMTP_PASS length:", (process.env.SMTP_PASS || "").length);
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM || "(NOT SET)");
  console.log("SITE_URL:", process.env.SITE_URL || "(NOT SET)");
  console.log("=========================");
  
  return NextResponse.json({
    smtp_host_set: !!process.env.SMTP_HOST,
    smtp_port_set: !!process.env.SMTP_PORT,
    smtp_user_set: !!process.env.SMTP_USER,
    smtp_pass_set: !!process.env.SMTP_PASS,
    email_from_set: !!process.env.EMAIL_FROM,
    site_url_set: !!process.env.SITE_URL,
    smtp_user_length: (process.env.SMTP_USER || "").length,
    smtp_pass_length: (process.env.SMTP_PASS || "").length,
  });
}
