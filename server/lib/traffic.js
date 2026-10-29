'use strict';
/**
 * In-memory live traffic registry + analytics event writer.
 * Everything here is O(1) bookkeeping — no per-request DB reads.
 */
const { q } = require('../db');

const visitors = new Map();          // visitorId -> { last, path, source }
const minuteBuckets = new Map();     // minuteStamp -> { pageview, other, revenue }
const recentEvents = [];             // newest-first ring for the admin live feed
let requestWindow = { minute: Math.floor(Date.now() / 60000), count: 0, lastPerMinute: 0 };
let lastProcessedMinute = requestWindow.minute;

function prune(ttlMs = 300000) {
  const cutoff = Date.now() - ttlMs;
  for (const [id, v] of visitors) if (v.last < cutoff) visitors.delete(id);
  const cutMinute = Math.floor(cutoff / 60000);
  for (const minute of minuteBuckets.keys()) if (minute < cutMinute) minuteBuckets.delete(minute);
}

function touchVisitor(id, path, source) {
  if (!id) return;
  if (visitors.size > 20000) prune();
  const existing = visitors.get(id);
  if (existing) {
    existing.last = Date.now();
    if (path) existing.path = path;
    if (source && !existing.source) existing.source = source;
  } else {
    visitors.set(id, { last: Date.now(), path: path || '/', source: source || null });
  }
}

function activeVisitors(ttlMs = 180000) {
  const cutoff = Date.now() - ttlMs;
  let n = 0;
  for (const v of visitors.values()) if (v.last >= cutoff) n++;
  return n;
}

function bumpRequest() {
  const minute = Math.floor(Date.now() / 60000);
  if (minute !== requestWindow.minute) {
    requestWindow.lastPerMinute = requestWindow.count;
    requestWindow.minute = minute;
    requestWindow.count = 0;
  }
  requestWindow.count++;
}

function requestsPerMinute() {
  const minute = Math.floor(Date.now() / 60000);
  if (minute > requestWindow.minute) return requestWindow.lastPerMinute;
  return requestWindow.count;
}

function bucketFor(type) {
  const minute = Math.floor(Date.now() / 60000);
  if (minute !== lastProcessedMinute) {
    prune();
    lastProcessedMinute = minute;
  }
  let b = minuteBuckets.get(minute);
  if (!b) { b = { pageview: 0, other: 0, revenue: 0 }; minuteBuckets.set(minute, b); }
  if (type === 'pageview') b.pageview++;
  else b.other++;
  return b;
}

function pageviewsLast(minutes = 5) {
  const cutoff = Math.floor((Date.now() - minutes * 60000) / 60000);
  let n = 0;
  for (const [minute, b] of minuteBuckets) if (minute >= cutoff) n += b.pageview;
  return n;
}

function pushEvent(type, path, revenueCents = 0) {
  recentEvents.unshift({ type, path, revenue: revenueCents, at: Date.now() });
  if (recentEvents.length > 80) recentEvents.pop();
}

/**
 * Persist an analytics event and update the live counters.
 * Kept synchronous (prepared statement) — writes are microseconds under WAL.
 */
function recordEvent({ type, path = '/', referrer = null, source = null, visitorId = null, revenueCents = 0 }) {
  try {
    q.run(
      'INSERT INTO analytics_events (type, path, referrer, source, visitor_id, revenue_cents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      type, String(path).slice(0, 200), referrer ? String(referrer).slice(0, 300) : null,
      source ? String(source).slice(0, 40) : null, visitorId ? String(visitorId).slice(0, 40) : null,
      revenueCents || 0, Date.now()
    );
  } catch (err) {
    console.error('[traffic] failed to record event:', err.message);
  }
  bucketFor(type);
  pushEvent(type, path, revenueCents);
}

function activity(kind, message, meta = null, actor = null) {
  try {
    q.run(
      'INSERT INTO activity_log (kind, message, meta, actor, created_at) VALUES (?, ?, ?, ?, ?)',
      kind, String(message).slice(0, 300), meta ? JSON.stringify(meta).slice(0, 1000) : null, actor, Date.now()
    );
  } catch (err) {
    console.error('[activity] failed to write log:', err.message);
  }
  recentEvents.unshift({ type: kind, path: message, revenue: 0, at: Date.now(), activity: true });
  if (recentEvents.length > 80) recentEvents.pop();
}

function liveSnapshot() {
  prune();
  return {
    activeVisitors: activeVisitors(),
    requestsPerMinute: requestsPerMinute(),
    pageviews5m: pageviewsLast(5),
    pageviews60m: pageviewsLast(60),
    recent: recentEvents.slice(0, 30)
  };
}

module.exports = {
  touchVisitor, activeVisitors, bumpRequest, requestsPerMinute,
  recordEvent, activity, liveSnapshot, pageviewsLast, prune
};
