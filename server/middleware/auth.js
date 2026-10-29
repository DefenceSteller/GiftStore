'use strict';
/** Admin session handling: short-lived JWT in an httpOnly, SameSite=Strict cookie. */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { q } = require('../db');

const COOKIE_NAME = 'cc_admin';
const ISSUER = 'confetti-club';

function issueToken(admin) {
  return jwt.sign(
    { sub: admin.id, type: 'admin', role: admin.role, name: admin.name, email: admin.email },
    config.secret,
    { expiresIn: config.jwtTtl, issuer: ISSUER, audience: 'admin-panel' }
  );
}

function setAdminCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000
  });
}

function clearAdminCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', secure: config.isProd, path: '/' });
}

function verifyToken(token) {
  return jwt.verify(token, config.secret, { issuer: ISSUER, audience: 'admin-panel' });
}

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Sign in required.', code: 'unauthorized' });
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'admin') throw new Error('wrong token type');
    const admin = q.get('SELECT id, email, name, role FROM admins WHERE id = ?', Number(payload.sub));
    if (!admin) return res.status(401).json({ error: 'Session no longer valid.', code: 'unauthorized' });
    req.admin = admin;
    next();
  } catch (_) {
    clearAdminCookie(res);
    return res.status(401).json({ error: 'Session expired — please sign in again.', code: 'session_expired' });
  }
}

module.exports = { COOKIE_NAME, issueToken, setAdminCookie, clearAdminCookie, requireAdmin, verifyToken };
