import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const timer = Date.now();
  
  try {
    const body = await request.json();
    const { to } = body;
    
    console.log("[DIAG] Test received for:", to);
    
    if (!to) {
      return NextResponse.json(
        { success: false, error: "Email address required" },
        { status: 400 }
      );
    }
    
    console.log("[DIAG] Checking credentials...");
    console.log("[DIAG] SMTP_USER exists:", !!process.env.SMTP_USER);
    console.log("[DIAG] SMTP_PASS exists:", !!process.env.SMTP_PASS);
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Credentials not found",
          details: {
            has_user: !!process.env.SMTP_USER,
            has_pass: !!process.env.SMTP_PASS,
            user_length: (process.env.SMTP_USER || "").length,
            pass_length: (process.env.SMTP_PASS || "").length,
          }
        },
        { status: 500 }
      );
    }
    
    console.log("[DIAG] Creating transporter...");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.brevo.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    console.log("[DIAG] Verifying connection...");
    await transporter.verify();
    console.log("[DIAG] Connection verified OK!");
    
    console.log("[DIAG] Sending email...");
    const info = await transporter.sendMail({
      from: `"Confetti Club" <${process.env.EMAIL_FROM?.split("<")[1]?.replace(">", "") || "noreply@example.com"}>`,
      to: [to],
      subject: "Test email from Confetti Club",
      html: "<p>This is a test email!</p>",
    });
    
    const duration = Date.now() - timer;
    console.log(`[DIAG] Email sent successfully! (${duration}ms)`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Test email sent to ${to}`,
      messageId: info.messageId,
      duration_ms: duration
    });
    
  } catch (err) {
    const duration = Date.now() - timer;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorType = err instanceof Error ? err.constructor.name : typeof err;
    
    console.error("[DIAG] FAILED after", duration + "ms:", errorMessage);
    console.error("[DIAG] Full error:", err);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        type: errorType,
        duration_ms: duration,
        hint: getErrorHint(errorMessage)
      },
      { status: 500 }
    );
  }
}

function getErrorHint(message: string): string {
  if (message.includes("Authentication") || message.includes("Access denied")) {
    return "❌ Your Brevo API key is wrong or revoked. Go to Brevo → Settings → API Keys and generate a new one.";
  }
  if (message.includes("connect") || message.includes("timeout")) {
    return "❌ Cannot connect to SMTP server. Check your internet connection or firewall settings.";
  }
  if (message.includes("ECONNREFUSED")) {
    return "❌ Connection refused. Check if smtp.brevo.com is blocked by your network.";
  }
  if (message.includes("ENOTFOUND")) {
    return "❌ DNS lookup failed. Check if you can resolve smtp.brevo.com.";
  }
  return "Check Vercel Functions logs for full details.";
}
