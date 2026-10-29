'use strict';
/** Request-hardening middleware: same-origin enforcement + JSON-only mutations. */
const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];

function sameOriginOnly(req, res, next) {
  if (!MUTATING.includes(req.method)) return next();
  const host = req.headers.host;
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: 'Cross-origin request blocked.', code: 'csrf' });
      }
      return next();
    } catch (_) {
      return res.status(403).json({ error: 'Cross-origin request blocked.', code: 'csrf' });
    }
  }
  const referer = req.headers.referer;
  if (referer) {
    try {
      if (new URL(referer).host !== host) {
        return res.status(403).json({ error: 'Cross-origin request blocked.', code: 'csrf' });
      }
    } catch (_) { /* fall through */ }
  }
  next();
}

function jsonOnlyMutations(req, res, next) {
  if (!MUTATING.includes(req.method)) return next();
  const hasBody = Number(req.headers['content-length'] || 0) > 0;
  if (hasBody && !req.is('application/json')) {
    return res.status(415).json({ error: 'Expected application/json.', code: 'unsupported_media_type' });
  }
  next();
}

/** APIs must never be cached by proxies or the browser (they contain account data). */
function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

module.exports = { sameOriginOnly, jsonOnlyMutations, noStore };
