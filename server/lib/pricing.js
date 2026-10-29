'use strict';
/** Order pricing — the server always re-prices from the database, never from the client. */
const { numericSettings } = require('./settings');

function priceCart({ products, quantities, deliveryMethod, promo, settings }) {
  const s = settings || numericSettings();
  let subtotal = 0;
  for (const p of products) {
    const qty = quantities.get(p.id) || 0;
    subtotal += p.price_cents * qty;
  }

  let discount = 0;
  let freeShipping = false;
  let promoCode = null;

  if (promo && promo.active) {
    const notExpired = !promo.expires_at || promo.expires_at > Date.now();
    const meetsMin = subtotal >= (promo.min_subtotal_cents || 0);
    if (notExpired && meetsMin) {
      promoCode = promo.code;
      if (promo.type === 'percent') discount = Math.round((subtotal * promo.value) / 100);
      else if (promo.type === 'fixed') discount = Math.min(promo.value, subtotal);
      else if (promo.type === 'free_shipping') freeShipping = true;
    }
  }

  const discounted = Math.max(0, subtotal - discount);
  const express = deliveryMethod === 'express';
  let shipping = freeShipping
    ? 0
    : express
      ? s.express_shipping_cents
      : (discounted >= s.free_shipping_threshold_cents ? 0 : s.standard_shipping_cents);

  const tax = Math.round((discounted * s.tax_rate_bps) / 10000);
  const total = discounted + shipping + tax;

  return {
    subtotalCents: subtotal,
    discountCents: discount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: total,
    promoCode,
    freeShippingPromo: freeShipping,
    currency: s.currency || 'USD'
  };
}

module.exports = { priceCart };
