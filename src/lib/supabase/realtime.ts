import { createClient } from "./server";
import type { Database } from "./types";

/**
 * Setup Supabase Realtime channels for live dashboard updates.
 * 
 * Channels:
 * - orders: broadcasts status changes for admin dashboard
 * - traffic: tracks visitor counts and page views
 * - analytics: funnel events conversion tracking
 * 
 * Usage:
 *   const { orders } = setupRealtimeChannels();
 *   const { data: newOrder } = orders.on("*", (payload) => { ... });
 */

export function setupRealtimeChannels() {
  const supabase = createClient();

  // Orders channel - broadcasts status changes
  const ordersChannel = supabase
    .channel("admin-orders")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `status=eq.pending`, // Can filter by specific status or listen to all
      },
      (payload) => {
        // Broadcast order status change to admin dashboard
        // In a real app, this would update the UI state
        console.log("Order status changed:", payload.new);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "orders",
      },
      (payload) => {
        // New order created, could trigger notification
        console.log("New order created:", payload.new);
      }
    )
    .subscribe();

  // Traffic channel - visitor counts
  const trafficChannel = supabase
    .channel("admin-traffic")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "traffic_events",
      },
      (payload) => {
        // New traffic event, could update real-time visitor counters
        console.log("Traffic event:", payload.new);
      }
    )
    .subscribe();

  // Analytics channel - funnel events
  const analyticsChannel = supabase
    .channel("admin-analytics")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "order_events",
      },
      (payload) => {
        // Funnel event (product_view, add_to_cart, purchase, etc.)
        console.log("Funnel event:", payload.new);
      }
    )
    .subscribe();

  return {
    orders: ordersChannel,
    traffic: trafficChannel,
    analytics: analyticsChannel,
  };
}

/**
 * Cleanup Realtime channels on unmount
 */
export function cleanupRealtimeChannels(channels: ReturnType<typeof setupRealtimeChannels>) {
  channels.orders.unsubscribe();
  channels.traffic.unsubscribe();
  channels.analytics.unsubscribe();
}