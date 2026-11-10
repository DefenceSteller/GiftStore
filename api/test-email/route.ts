import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/order-email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, orderNumber } = body;

    if (!to) {
      return NextResponse.json({ error: "Email address required" }, { status: 400 });
    }

    console.log("[test-email] Received test request for:", to);

    const result = await sendOrderConfirmation({
      to,
      name: "Test User",
      orderNumber: orderNumber || "TEST-12345",
      totalCents: 1000,
      currency: "USD",
      items: [
        { name: "Test Gift", emoji: "🎁", qty: 1, unitPrice: 1000, lineTotal: 1000 },
      ],
      address: {
        address1: "123 Test Street",
        address2: null,
        city: "Test City",
        state: "TX",
        postal: "12345",
        country: "US",
      },
      deliveryMethod: "standard",
    });

    if (result.ok) {
      return NextResponse.json({ success: true, messageId: "tested" });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (err) {
    console.error("[test-email] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}