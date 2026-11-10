import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to } = body;
    
    console.log("[test-bare] Test received for:", to);
    console.log("[test-bare] SMTP_USER present:", !!process.env.SMTP_USER);
    console.log("[test-bare] SMTP_PASS present:", !!process.env.SMTP_PASS);
    
    if (!to) {
      return NextResponse.json(
        { success: false, error: "Email address required" },
        { status: 400 }
      );
    }
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("[test-bare] FAIL: SMTP credentials not set");
      return NextResponse.json(
        { success: false, error: "SMTP_USER and SMTP_PASS not configured in environment variables" },
        { status: 500 }
      );
    }
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.brevo.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    console.log("[test-bare] Transport created, attempting verify...");
    
    await transporter.verify();
    console.log("[test-bare] Verify succeeded!");
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@confetticlub.shop",
      to: [to],
      subject: "Test email from Confetti Club",
      html: "<p>This is a test email!</p>",
    });
    
    console.log("[test-bare] Email sent! messageId:", info.messageId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Test email sent to ${to}`,
      messageId: info.messageId 
    });
    
  } catch (err) {
    console.error("[test-bare] FAILED:", err);
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : String(err),
        type: err instanceof Error ? err.constructor.name : typeof err
      },
      { status: 500 }
    );
  }
}