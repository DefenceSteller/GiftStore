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

    const apiKey = process.env.SMTP_USER;
    console.log("[DIAG] Checking credentials...");
    console.log("[DIAG] SMTP_USER (API Key) exists:", !!apiKey);

    if (!apiKey) {
      console.error("[DIAG] FAIL: Missing Brevo API key");
      return NextResponse.json(
        { success: false, error: "Brevo API key not configured (SMTP_USER env var)" },
        { status: 500 }
      );
    }

    console.log("[DIAG] Sending email via Brevo HTTP API...");
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Confetti Club",
          email: "noreply@confetticlub.shop",
        },
        to: [{ email: to, name: "Test User" }],
        subject: "Test email from Confetti Club",
        textContent: "This is a test email! If you received this, your Brevo HTTP API configuration is working.",
        htmlContent: "<p>This is a test email! If you received this, your Brevo HTTP API configuration is working.</p>",
      }),
    });

    const responseText = await response.text();
    console.log(`[DIAG] Brevo API response: ${response.status}`, responseText);

    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error("[DIAG] Brevo API error:", responseText);
      return NextResponse.json(
        {
          success: false,
          error: `Brevo API error (${response.status}): ${responseText}`,
          duration_ms: duration,
        },
        { status: 500 }
      );
    }

    const result = JSON.parse(responseText);
    console.log(`[DIAG] Email sent successfully! (took ${duration}ms)`);
    console.log("[DIAG] Message ID:", result.messageId);

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      messageId: result.messageId,
      duration_ms: duration,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorType = err instanceof Error ? err.constructor.name : typeof err;

    console.error("[DIAG] FAILED after", duration + "ms:", errorMessage);

    let hint = "";
    if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("Unauthorized") || errorMessage.includes("Forbidden")) {
      hint = "❌ Authentication failed. Your Brevo API key might be wrong or revoked. Go to Brevo → Settings → API Keys and verify.";
    } else if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("timeout")) {
      hint = "❌ Network error. Cannot reach Brevo API. Check your internet connection.";
    } else if (errorMessage.includes("ENOTFOUND")) {
      hint = "❌ DNS lookup failed for api.brevo.com. Check your internet/DNS settings.";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        type: errorType,
        duration_ms: duration,
        hint: hint || "Check Vercel Function logs for full details.",
      },
      { status: 500 }
    );
  }
}