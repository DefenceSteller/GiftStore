'use strict';
/**
 * Confetti Club — central configuration.
 * Reads .env if present (Node 20.12+ built-in loader, no dependency needed)
 * and guarantees a persistent JWT secret so admin sessions survive restarts.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
try {
  const envFile = path.join(root, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
} catch (_) { /* .env is optional */ }

const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

function ensureSecret() {
  const fromEnv = process.env.SECRET_KEY;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  const file = path.join(root, '.secret');
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch (_) { /* generate below */ }
  const generated = crypto.randomBytes(48).toString('hex');
  try { fs.writeFileSync(file, generated, { mode: 0o600 }); } catch (_) { fs.writeFileSync(file, generated); }
  return generated;
}

module.exports = {
  root,
  isProd,
  port,
  siteName: process.env.SITE_NAME || 'Confetti Club',
  secret: ensureSecret(),
  jwtTtl: process.env.ADMIN_SESSION_TTL || '12h',
  paymentProvider: (process.env.PAYMENT_PROVIDER || 'demo').toLowerCase(),
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@confetticlub.shop').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'ChangeMe!2026'
  },
  trustProxy: !!process.env.TRUST_PROXY,
  /**
   * Rate-limit multiplier — only ever raised for load testing
   * (e.g. RATE_MULTIPLIER=50 with `npm run loadtest`). Brute-force
   * protection for /admin/login is intentionally never scaled.
   */
  rateMultiplier: Math.min(1000, Math.max(1, Number(process.env.RATE_MULTIPLIER) || 1)),
  dirs: {
    public: path.join(root, 'public'),
    data: path.join(root, 'data'),
    images: path.join(root, 'public', 'assets', 'img', 'products')
  },
  dbFile: path.join(root, 'data', 'confetti.db')
};
