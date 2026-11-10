import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { to } = body;
    
    console.log("[DIAG] Test email requested for:", to);
    
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
          error: "SMTP credentials not configured",
          missing: {
            user: !process.env.SMTP_USER,
            pass: !process.env.SMTP_PASS,
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
    console.log("[DIAG] Connection verified successfully!");
    
    console.log("[DIAG] Sending email...");
    const info = await transporter.sendMail({
      from: `"Confetti Club" <noreply@confetticlub.shop>`,
      to: [to],
      subject: "Test email from Confetti Club",
      text: "This is a test email! If you received this, your SMTP configuration is working.",
      html: "<p>This is a test email! If you received this, your SMTP configuration is working.</p>",
    });
    
    const duration = Date.now() - startTime;
    console.log(`[DIAG] Email sent successfully! (took ${duration}ms)`);
    console.log("[DIAG] Message ID:", info.messageId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Test email sent to ${to}`,
      messageId: info.messageId,
      duration_ms: duration,
    });
    
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorType = err instanceof Error ? err.constructor.name : typeof err;
    
    console.error("[DIAG] FAILED after", duration + "ms:", errorMessage);
    console.error("[DIAG] Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    
    // Provide helpful hints based on error type
    let hint = "";
    if (errorMessage.includes("Authentication") || errorMessage.includes("Access denied")) {
      hint = "❌ Authentication failed. Your Brevo API key might be wrong or revoked. Go to Brevo → Settings → API Keys and verify.";
    } else if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("timeout")) {
      hint = "❌ Cannot connect to server. Check if smtp.brevo.com:587 is accessible from your network.";
    } else if (errorMessage.includes("ENOTFOUND")) {
      hint = "❌ DNS lookup failed for smtp.brevo.com. Check your internet/DNS settings.";
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        type: errorType,
        duration_ms: duration,
        hint: hint || "Check Vercel Function logs for full details."
      },
      { status: 500 }
    );
  }
}