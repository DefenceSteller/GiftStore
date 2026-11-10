import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/order-email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");
  return handleTestEmail(to);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to } = body;
    return handleTestEmail(to);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid JSON" },
      { status: 400 }
    );
  }
}

async function handleTestEmail(to: string | null) {
  if (!to) {
    return NextResponse.json({ error: "Email address required via ?to=your@email.com" }, { status: 400 });
  }

  console.log("[test-email] Received test request for:", to);

  const result = await sendOrderConfirmation({
    to,
    name: "Test User",
    orderNumber: "TEST-" + Math.floor(100000 + Math.random() * 900000),
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
    return NextResponse.json({ success: true, message: `Test email sent to ${to}` });
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}
