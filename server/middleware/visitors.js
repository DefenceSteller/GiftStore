'use strict';
/**
 * Anonymous visitor identity (httpOnly cookie) + traffic bookkeeping.
 * Used for the admin dashboard's live-visitor counter and analytics.
 */
const traffic = require('../lib/traffic');
const { randomToken, sanitize } = require('../lib/helpers');

const DAY = 24 * 60 * 60 * 1000;

function visitorContext(req, res, next) {
  traffic.bumpRequest();

  const vcid = req.cookies && req.cookies.vcid;
  const isAsset = req.path.startsWith('/assets/') || req.path.startsWith('/api/');
  if (vcid) {
    traffic.touchVisitor(vcid, isAsset ? null : req.path);
  } else if (!req.path.startsWith('/assets/')) {
    res.cookie('vcid', randomToken(8), { httpOnly: true, sameSite: 'lax', maxAge: 365 * DAY, path: '/' });
  }

  // first-touch attribution: ?src=instagram or ?utm_source=...
  const src = req.query && (req.query.src || req.query.utm_source);
  if (typeof src === 'string' && src.trim() && !(req.cookies && req.cookies.cc_src) && !req.path.startsWith('/assets/')) {
    res.cookie('cc_src', sanitize(src, 40).toLowerCase(), { httpOnly: true, sameSite: 'lax', maxAge: 90 * DAY, path: '/' });
  }

  next();
}

/** Tracks real request latency so the admin "system health" card is truthful. */
const latencies = [];
function latencyTracker(req, res, next) {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    latencies.push(ms);
    if (latencies.length > 300) latencies.shift();
  });
  next();
}

function avgLatencyMs() {
  if (!latencies.length) return 0;
  const sum = latencies.reduce((a, b) => a + b, 0);
  return Math.round((sum / latencies.length) * 10) / 10;
}

function p95LatencyMs() {
  if (!latencies.length) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10;
}

module.exports = { visitorContext, latencyTracker, avgLatencyMs, p95LatencyMs };
