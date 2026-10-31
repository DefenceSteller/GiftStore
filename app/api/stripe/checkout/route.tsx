import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30",
  typescript: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, currency = "usd", card } = body;

    if (!amount) {
      return new Response(
        JSON.stringify({ error: "Amount is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if using demo mode
    if (process.env.PAYMENT_PROVIDER === "demo") {
      // Use demo payment provider
      // For demo, we just return a mock session
      const mockUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/order-success?mock=true`;

      return new Response(
        JSON.stringify({ url: mockUrl }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Real Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: "Confetti Club Order",
            },
          },
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin")}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/cart`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}