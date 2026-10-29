'use strict';
/**
 * Confetti Club — application entry point.
 * Express app: hardened headers, compressed payloads, cached static assets,
 * SQLite (WAL) data layer, public storefront API + guarded admin API.
 */
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { close, countProducts } = require('./db');
const { seedAll } = require('./seed');
const { HttpError } = require('./lib/errors');
const { apiLimiter } = require('./middleware/rateLimits');
const { sameOriginOnly, jsonOnlyMutations } = require('./middleware/security');
const { visitorContext, latencyTracker } = require('./middleware/visitors');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

/* ------------------------------ first boot ------------------------------- */
try {
  seedAll({ demo: process.env.SEED_DEMO !== '0' });
} catch (err) {
  console.error('[seed] failed:', err);
}

/* --------------------------------- app ----------------------------------- */
const app = express();
app.disable('x-powered-by');
app.set('etag', 'strong');
if (config.trustProxy) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'manifest-src': ["'self'"],
      ...(config.isProd ? { 'upgrade-insecure-requests': [] } : {})
    }
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: config.isProd ? undefined : false
}));

app.use(compression({ threshold: 1024, level: 6 }));
app.use(latencyTracker);

/* static assets — short max-age + strong etags = fast repeats, never stale for long */
app.use(express.static(config.dirs.public, {
  index: false,
  etag: true,
  lastModified: true,
  maxAge: '5m',
  fallthrough: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

app.use(cookieParser());
app.use(visitorContext);
app.use(sameOriginOnly);
app.use(jsonOnlyMutations);
app.use(express.json({ limit: '64kb' }));

/* --------------------------------- APIs ---------------------------------- */
app.use('/api/admin', adminRoutes);
app.use('/api', apiLimiter, publicRoutes);

/* --------------------------------- pages --------------------------------- */
const PAGE_FILES = {
  '/': 'index.html',
  '/shop': 'shop.html',
  '/cart': 'cart.html',
  '/checkout': 'checkout.html',
  '/track': 'track.html',
  '/admin': 'admin/index.html',
  '/admin/login': 'admin/login.html'
};
for (const [route, file] of Object.entries(PAGE_FILES)) {
  app.get(route, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(config.dirs.public, file));
  });
}
app.get('/product/:slug', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(config.dirs.public, 'product.html'));
});

/* -------------------------------- errors --------------------------------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.', code: 'not_found' }));

app.use((req, res) => {
  res.status(404);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(config.dirs.public, '404.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code, fields: err.fields || undefined });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large.', code: 'payload_too_large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.', code: 'bad_json' });
  if (err.type === 'charset.unsupported' || err.type === 'encoding.unsupported') {
    return res.status(415).json({ error: 'Unsupported encoding.', code: 'bad_encoding' });
  }
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    error: config.isProd ? 'Something went wrong on our end.' : err.message,
    code: 'server_error'
  });
});

/* ------------------------------- lifecycle -------------------------------- */
const server = app.listen(config.port, () => {
  console.log('');
  console.log('  🎁  CONFETTI CLUB  —  gift shop is open');
  console.log(`  ➜  Storefront : http://localhost:${config.port}`);
  console.log(`  ➜  Admin      : http://localhost:${config.port}/admin`);
  console.log(`  ➜  Sign in    : ${config.admin.email}  /  ${config.admin.password}`);
  if (!process.env.SECRET_KEY) console.log('  ➜  Session secret stored in .secret (set SECRET_KEY in .env to override)');
  if (process.env.ADMIN_PASSWORD) console.log('  ⚠️  ADMIN_PASSWORD is set in the environment — change it there.');
  console.log(`  ➜  Products   : ${countProducts()} catalog items`);
  console.log('');
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function shutdown(signal) {
  console.log(`\n[${signal}] shutting down gracefully…`);
  server.close(() => {
    close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 4000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

module.exports = app;
