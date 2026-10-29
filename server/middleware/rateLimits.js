'use strict';
/** Rate limits tuned for a busy storefront: generous for shoppers, brutal for abuse. */
const rateLimit = require('express-rate-limit');

const config = require('../config');

const jsonMessage = (message, code = 'rate_limited') => ({ error: message, code });

const k = config.rateMultiplier;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000 * k,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: jsonMessage('Too many requests — please slow down.')
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: jsonMessage('Too many sign-in attempts. Try again in 15 minutes.', 'too_many_attempts')
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: jsonMessage('Too many checkout attempts — please wait a moment.', 'checkout_limited')
});

const trackLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: jsonMessage('rate limited', 'rate_limited')
});

module.exports = { apiLimiter, loginLimiter, checkoutLimiter, trackLimiter };
