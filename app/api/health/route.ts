import { NextResponse } from "next/server";

export async function GET() {
  console.log("[health-check] Endpoint hit!");
  
  const env = {
    SMTP_HOST: process.env.SMTP_HOST || "(not set)",
    SMTP_PORT: process.env.SMTP_PORT || "(not set)",
    SMTP_USER: process.env.SMTP_USER ? "set" : "(not set)",
    SMTP_PASS: process.env.SMTP_PASS ? "set" : "(not set)",
    EMAIL_FROM: process.env.EMAIL_FROM || "(not set)",
    SITE_URL: process.env.SITE_URL || "(not set)",
    RESEND_API_KEY: process.env.RESEND_API_KEY ? "set" : "(not set)",
  };
  
  return NextResponse.json({ 
    ok: true,
    message: "Health check passed",
    environment: env
  });
}