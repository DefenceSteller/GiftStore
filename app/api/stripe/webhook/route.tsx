import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30",
  typescript: true,
});

export async function POST(request: Request) {
  try {
    const sig = request.headers.get("stripe-signature");
    const body = await request.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook signature verification failed: ${err.message}`, {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Fulfill order: create order in DB, send email, etc.
      const supabase = await createClient();

      // Get order details from the session's client_reference_id if set
      // or we can look up by the order number pattern
      if (session.client_reference_id) {
        const orderNumber = session.client_reference_id;

        // Update order status and payment info
        const { error } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_status: "succeeded",
            payment_method: "card",
            payment_ref: session.payment_intent ? session.payment_intent.toString() : null,
            payment_brand: session.payment_method_details?.card?.brand || null,
            payment_last4: session.payment_method_details?.card?.last4 || null,
            paid_at: new Date().toISOString(),
          })
          .eq("order_number", orderNumber);

        if (error) {
          console.error("Failed to update order:", error);
        }
      }

      // Redirect to order success page
      const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      return new Response(null, {
        status: 302,
        headers: { Location: `${origin}/order-success?session_id=${session.id}` },
      });
    }

    // Handle other events successfully
    return new Response(null, { status: 200 });
  } catch (err: any) {
    console.error("Stripe webhook error:", err);
    return new Response(`Webhook error: ${err.message}`, {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}