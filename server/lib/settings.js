'use strict';
/** Store-wide settings with a short TTL so checkout and admin stay in sync. */
const { q } = require('../db');
const { TtlCache } = require('./helpers');

const DEFAULTS = {
  store_name: 'Confetti Club',
  announcement: 'FREE SHIPPING OVER Rs 50  ✦  NEW DROPS EVERY FRIDAY  ✦  30-DAY EASY RETURNS',
  currency: 'USD',
  free_shipping_threshold_cents: 5000,
  standard_shipping_cents: 599,
  express_shipping_cents: 1299,
  tax_rate_bps: 800,
  delivery_days_standard: '5-7',
  delivery_days_express: '2-3',
  support_email: 'hey@confetticlub.shop'
};

const cache = new TtlCache(8000);

function getSettings() {
  const cached = cache.get('settings');
  if (cached) return cached;
  const rows = q.all('SELECT key, value FROM settings');
  const out = { ...DEFAULTS };
  for (const row of rows) {
    if (!(row.key in out) && !['store_name', 'currency', 'announcement'].includes(row.key)) continue;
    try { out[row.key] = JSON.parse(row.value); } catch (_) { out[row.key] = row.value; }
  }
  cache.set('settings', out);
  return out;
}

function setSettings(values) {
  for (const [key, raw] of Object.entries(values)) {
    if (!(key in DEFAULTS)) continue;
    const value = JSON.stringify(raw);
    q.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key, value
    );
  }
  cache.clear();
  return getSettings();
}

const NUMERIC_KEYS = ['free_shipping_threshold_cents', 'standard_shipping_cents', 'express_shipping_cents', 'tax_rate_bps'];
const TEXT_KEYS = ['store_name', 'announcement', 'currency', 'delivery_days_standard', 'delivery_days_express', 'support_email'];

function numericSettings() {
  const s = getSettings();
  const out = {};
  for (const k of NUMERIC_KEYS) out[k] = Number(s[k]) || 0;
  for (const k of TEXT_KEYS) out[k] = s[k];
  return out;
}

module.exports = { getSettings, setSettings, numericSettings, DEFAULTS };
