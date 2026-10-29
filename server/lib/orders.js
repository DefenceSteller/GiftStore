'use strict';
/** Order lifecycle: allowed status transitions, labels and customer-facing timelines. */

const STATUSES = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];

const STATUS_META = {
  pending:   { label: 'Awaiting payment', tone: 'amber' },
  paid:      { label: 'Paid',             tone: 'sky' },
  packed:    { label: 'Packed',           tone: 'violet' },
  shipped:   { label: 'Shipped',          tone: 'indigo' },
  delivered: { label: 'Delivered',        tone: 'lime' },
  cancelled: { label: 'Cancelled',        tone: 'slate' },
  refunded:  { label: 'Refunded',         tone: 'rose' }
};

const STATUS_FLOW = {
  pending:   ['paid', 'packed', 'cancelled'],
  paid:      ['packed', 'cancelled', 'refunded'],
  packed:    ['shipped', 'cancelled'],
  shipped:   ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded:  []
};

function canTransition(from, to) {
  if (!STATUSES.includes(to)) return false;
  return (STATUS_FLOW[from] || []).includes(to);
}

/**
 * Build the progress timeline shown on the storefront tracking page.
 * Each step gets done / current flags based on the stored timestamps.
 */
function orderTimeline(order) {
  const steps = [
    { key: 'placed',   label: 'Order placed',                          at: order.placed_at,   done: true },
    { key: 'paid',     label: order.payment_method === 'cod' ? 'Payment confirmed' : 'Payment confirmed', at: order.paid_at,     done: !!order.paid_at },
    { key: 'packed',   label: 'Packed with love',                      at: order.packed_at,   done: !!order.packed_at },
    { key: 'shipped',  label: 'On the way',                            at: order.shipped_at,  done: !!order.shipped_at },
    { key: 'delivered', label: 'Delivered',                            at: order.delivered_at, done: !!order.delivered_at }
  ];

  const terminal = order.status === 'cancelled' || order.status === 'refunded'
    ? { key: order.status, label: order.status === 'cancelled' ? 'Order cancelled' : 'Refund issued', at: order.cancelled_at, done: true, failed: true }
    : null;

  const active = terminal || steps;
  const firstUndone = steps.findIndex((s) => !s.done);
  const currentKey = terminal
    ? terminal.key
    : (firstUndone === -1 ? steps[steps.length - 1].key : steps[firstUndone].key);

  const out = (terminal ? [...steps, terminal] : steps).map((s) => ({
    ...s,
    current: s.key === currentKey,
    done: terminal ? (s.done || s.key === terminal.key) : s.done
  }));
  return out;
}

function estimatedDelivery(order) {
  const days = order.delivery_method === 'express' ? 3 : 6;
  const start = new Date(order.placed_at);
  const end = new Date(order.placed_at + days * 86400000);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

module.exports = { STATUSES, STATUS_META, STATUS_FLOW, canTransition, orderTimeline, estimatedDelivery };
