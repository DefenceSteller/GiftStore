import { createClient } from "./client";

/**
 * Setup Supabase Realtime channels for live dashboard updates.
 *
 * Uses the browser client — realtime subscriptions run client-side.
 *
 * Channels:
 * - orders: broadcasts status changes for admin dashboard
 * - traffic: tracks visitor counts and page views
 * - analytics: funnel events conversion tracking
 *
 * Usage (in a client component):
 *   const channels = setupRealtimeChannels();
 *   useEffect(() => () => cleanupRealtimeChannels(channels), []);
 */
type ChangePayload = { new: Record<string, unknown> };

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
      },
      (payload: ChangePayload) => {
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
      (payload: ChangePayload) => {
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
      (payload: ChangePayload) => {
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
      (payload: ChangePayload) => {
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
export function cleanupRealtimeChannels(
  channels: ReturnType<typeof setupRealtimeChannels>
) {
  channels.orders.unsubscribe();
  channels.traffic.unsubscribe();
  channels.analytics.unsubscribe();
}
