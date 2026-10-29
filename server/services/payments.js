'use strict';
/**
 * Payment provider abstraction.
 *
 * The checkout flow only talks to `process()` / `refund()` / `void()`.
 * Today it runs the built-in `demo` provider (no keys, no real charges,
 * full card validation incl. Luhn + expiry + standard decline test cards).
 *
 * To integrate a real gateway later (Stripe, Razorpay, PayPal, ...):
 *   1. add a provider object exposing the same three methods,
 *   2. set PAYMENT_PROVIDER=stripe in .env.
 * Nothing else in the codebase needs to change.
 */
const config = require('../config');
const { luhn, cardBrand, validExpiry, digitsOf, randomToken, sanitize } = require('../lib/helpers');

class PaymentError extends Error {
  constructor(message, code = 'card_error', status = 402) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Standard test cards (mirrors Stripe's test numbers) for the demo provider. */
const DECLINE_CARDS = {
  '4000000000000002': 'Your card was declined.',
  '4000000000009995': 'Insufficient funds.',
  '4000000000000069': 'Your card has expired.'
};

const demoProvider = {
  id: 'demo',
  enabled: true,
  /** Authorise a payment. Never stores the PAN — only brand + last4. */
  async process({ amountCents, currency, card, orderNumber }) {
    const number = digitsOf(card.number);
    if (number.length < 12 || number.length > 19) throw new PaymentError('Card number looks wrong.');
    if (!luhn(number)) throw new PaymentError('That card number is not valid.');
    if (!validExpiry(card.exp)) throw new PaymentError('That card has expired.');
    const cvc = digitsOf(card.cvc);
    if (cvc.length < 3 || cvc.length > 4) throw new PaymentError('Security code is invalid.');
    if (DECLINE_CARDS[number]) throw new PaymentError(DECLINE_CARDS[number]);
    // Small async delay so the UI's processing state is realistic (and abuse is throttled).
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
    return {
      reference: `pay_demo_${randomToken(9)}`,
      status: 'succeeded',
      brand: cardBrand(number),
      last4: number.slice(-4),
      orderNumber,
      amountCents,
      currency
    };
  },
  async refund({ reference, amountCents }) {
    return { reference: `re_${randomToken(8)}`, status: 'succeeded', refundedCents: amountCents, original: reference };
  },
  async void({ reference }) {
    return { reference: `void_${randomToken(8)}`, status: 'voided', original: reference };
  }
};

/** Placeholder — throws a clear error until real credentials are wired up. */
const stripeProvider = {
  id: 'stripe',
  enabled: false,
  async process() {
    throw new PaymentError(
      'Stripe provider is not configured yet. Add your keys and implement services/payments.js — the checkout contract is already in place.',
      'not_configured',
      501
    );
  },
  async refund() { throw new PaymentError('Stripe provider is not configured.', 'not_configured', 501); },
  async void() { throw new PaymentError('Stripe provider is not configured.', 'not_configured', 501); }
};

const providers = { demo: demoProvider, stripe: stripeProvider };

function currentProvider() {
  const provider = providers[config.paymentProvider] || providers.demo;
  return provider;
}

function assertCardPayload(card) {
  if (!card || typeof card !== 'object') throw new PaymentError('Card details are required.');
  card.number = sanitize(String(card.number || ''), 32);
  card.exp = sanitize(String(card.exp || ''), 8);
  card.cvc = sanitize(String(card.cvc || ''), 8);
  card.name = sanitize(String(card.name || ''), 80);
  if (!card.name) throw new PaymentError('Cardholder name is required.');
}

module.exports = {
  PaymentError,
  get provider() { return currentProvider(); },
  process: (args) => currentProvider().process(args),
  refund: (args) => currentProvider().refund(args),
  voidPayment: (args) => currentProvider().void(args),
  assertCardPayload
};
