import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/order-email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");
  
  console.log("[test-email] Received test request for:", to);

  try {
    if (!to) {
      return NextResponse.json(
        { success: false, error: "Email address required via ?to=your@email.com" },
        { status: 400 }
      );
    }

    const result = await sendOrderConfirmation({
      to,
      name: "Test User",
      orderNumber: "TEST-" + Math.floor(100000 + Math.random() * 900000),
      totalCents: 1000,
      currency: "PKR",
      items: [
        { name: "Test Gift", emoji: "🎁", qty: 1, unitPrice: 1000, lineTotal: 1000 },
      ],
      address: {
        address1: "123 Test Street",
        address2: null,
        city: "Karachi",
        state: "Sindh",
        postal: "75500",
        country: "PK",
      },
      deliveryMethod: "standard",
    });

    if (result.ok) {
      return NextResponse.json({ success: true, message: `Test email sent to ${to}` });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[test-email] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
