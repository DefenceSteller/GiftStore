'use strict';
/** Small, dependency-free helpers shared across the server. */
const crypto = require('node:crypto');

const now = () => Date.now();

/* --------------- tiny TTL cache (keeps hot endpoints cheap) --------------- */
class TtlCache {
  constructor(ttlMs = 5000, max = 500) {
    this.ttl = ttlMs;
    this.max = max;
    this.map = new Map();
  }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) { this.map.delete(key); return undefined; }
    return entry.value;
  }
  set(key, value) {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + this.ttl });
  }
  async wrap(key, fn) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await fn();
    this.set(key, value);
    return value;
  }
  clear() { this.map.clear(); }
}

/* --------------------------------- ids ---------------------------------- */
const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function orderNumber() {
  const bytes = crypto.randomBytes(7);
  let out = '';
  for (let i = 0; i < 7; i++) out += ORDER_ALPHABET[bytes[i] % ORDER_ALPHABET.length];
  return `CC-${out}`;
}

function randomToken(bytes = 16) { return crypto.randomBytes(bytes).toString('hex'); }

/* ------------------------------- validation ------------------------------ */
function sanitize(value, max = 200) {
  let v = value == null ? '' : String(value);
  v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  v = v.trim().replace(/\s+/g, ' ');
  return v.slice(0, max);
}

function sanitizeMultiline(value, max = 2000) {
  let v = value == null ? '' : String(value);
  v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  v = v.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return v.slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isEmail = (v) => typeof v === 'string' && v.length <= 120 && EMAIL_RE.test(v.trim());
const normalizeEmail = (v) => sanitize(String(v).toLowerCase(), 120);
const digitsOf = (v) => String(v == null ? '' : v).replace(/\D/g, '');

function clampInt(value, min, max, fallback = null) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (m) => `\\${m}`);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/* --------------------------------- money --------------------------------- */
const formatMoney = (cents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100);

/* ------------------------------ card helpers ----------------------------- */
function luhn(numberString) {
  const digits = digitsOf(numberString);
  if (digits.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function cardBrand(numberString) {
  const d = digitsOf(numberString);
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^6(?:011|5)/.test(d)) return 'discover';
  return 'card';
}

function validExpiry(exp) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(exp || ''));
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const end = new Date(year, month, 1).getTime(); // first day after expiry
  return end > Date.now();
}

/* ------------------------------- randomness ------------------------------ */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

/* ------------------------------ traffic source --------------------------- */
function sourceFromReferrer(referrer, utmSource) {
  if (utmSource) {
    const s = sanitize(utmSource, 40).toLowerCase();
    if (s) return s;
  }
  if (!referrer) return 'direct';
  let host = '';
  try { host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, ''); } catch (_) { return 'direct'; }
  if (!host) return 'direct';
  if (/instagram|ig\.me/.test(host)) return 'instagram';
  if (/tiktok/.test(host)) return 'tiktok';
  if (/google|bing|duckduckgo|yahoo|ecosia/.test(host)) return 'search';
  if (/reddit/.test(host)) return 'reddit';
  if (/youtube|youtu\.be/.test(host)) return 'youtube';
  if (/facebook|fb\.me/.test(host)) return 'facebook';
  if (/twitter|x\.com/.test(host)) return 'x';
  if (/mail|newsletter/.test(host)) return 'email';
  return host;
}

module.exports = {
  now, TtlCache, orderNumber, randomToken,
  sanitize, sanitizeMultiline, isEmail, normalizeEmail, digitsOf, clampInt, escapeLike, escapeXml,
  formatMoney, luhn, cardBrand, validExpiry, mulberry32, pick, sourceFromReferrer
};
