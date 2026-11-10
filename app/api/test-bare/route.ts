import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

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
    
    // Check credentials first
    const hasUser = !!process.env.SMTP_USER;
    const hasPass = !!process.env.SMTP_PASS;
    const hasHost = !!process.env.SMTP_HOST;
    const hasPort = !!process.env.SMTP_PORT;
    
    console.log("[DIAG] Credentials check:");
    console.log("[DIAG]   SMTP_USER:", hasUser ? `present (${(process.env.SMTP_USER || "").length} chars)` : "MISSING");
    console.log("[DIAG]   SMTP_PASS:", hasPass ? `present (${(process.env.SMTP_PASS || "").length} chars)` : "MISSING");
    console.log("[DIAG]   SMTP_HOST:", process.env.SMTP_HOST || "NOT SET (will use default smtp.brevo.com)");
    console.log("[DIAG]   SMTP_PORT:", process.env.SMTP_PORT || "NOT SET (will use default 587)");
    
    if (!hasUser || !hasPass) {
      console.error("[DIAG] FAIL: Missing credentials");
      return NextResponse.json(
        { 
          success: false, 
          error: "SMTP credentials not configured",
          missing: {
            user: !hasUser,
            pass: !hasPass,
          }
        },
        { status: 500 }
      );
    }
    
    // Create transporter
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
    
    // Verify connection
    console.log("[DIAG] Verifying connection...");
    await transporter.verify();
    console.log("[DIAG] Connection verified successfully!");
    
    // Send email
    console.log("[DIAG] Sending email...");
    const info = await transporter.sendMail({
      from: `"Confetti Club" <${process.env.EMAIL_FROM?.split("<")[1]?.replace(">", "") || "noreply@example.com"}>`,
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
      config: {
        host: process.env.SMTP_HOST || "smtp.brevo.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        from: process.env.EMAIL_FROM || "noreply@confetticlub.shop",
      }
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
