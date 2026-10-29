import { api, esc, money, debounce } from '../api.js';
import { getCart, cartSubtotal, checkoutPayload, clientToken, rotateClientToken, clearCart } from '../cart.js';
import { config, toast } from '../store.js';
import { track, startHeartbeat } from '../track.js';

startHeartbeat();
track('pageview');

const cart = getCart();
if (!cart.length) {
  setTimeout(() => { location.replace('/cart'); }, 60);
}

const els = {
  steps: [...document.querySelectorAll('[data-step-pill]')],
  sections: [...document.querySelectorAll('[data-step]')],
  items: document.getElementById('checkout-items'),
  subtotal: document.getElementById('ck-subtotal'),
  discountRow: document.getElementById('ck-discount-row'),
  discount: document.getElementById('ck-discount'),
  shipping: document.getElementById('ck-shipping'),
  tax: document.getElementById('ck-tax'),
  taxRate: document.getElementById('ck-tax-rate'),
  total: document.getElementById('ck-total'),
  promoNote: document.getElementById('ck-promo-note'),
  cardFields: document.getElementById('card-fields'),
  cardBrand: document.getElementById('card-brand'),
  placeBtn: document.getElementById('place-order'),
  reviewItems: document.getElementById('review-items'),
  reviewName: document.getElementById('review-name'),
  reviewAddress: document.getElementById('review-address'),
  reviewContact: document.getElementById('review-contact'),
  reviewPayment: document.getElementById('review-payment'),
  reviewDelivery: document.getElementById('review-delivery'),
  reviewTotal: document.getElementById('review-total'),
  shipStd: document.getElementById('ship-standard-label'),
  shipExp: document.getElementById('ship-express-label')
};

let step = 1;
let promo = null;
try { promo = JSON.parse(sessionStorage.getItem('cc_promo')); } catch (_) { promo = null; }

const field = (id) => document.getElementById(id);
const val = (id) => (field(id) ? field(id).value.trim() : '');

function setError(id, message) {
  const input = field(id);
  const holder = document.querySelector(`[data-error-for="${id}"]`);
  if (holder) {
    holder.textContent = message || '';
    holder.classList.toggle('show', !!message);
  }
  if (input) input.classList.toggle('input-error', !!message);
}
function clearErrors() {
  document.querySelectorAll('.field-error.show').forEach((el) => { el.classList.remove('show'); el.textContent = ''; });
  document.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
}

const luhn = (num) => {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

function brandOf(number) {
  const d = number.replace(/\D/g, '');
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^6(?:011|5)/.test(d)) return 'discover';
  return '';
}

function validateStep1() {
  clearErrors();
  let ok = true;
  if (val('c-first').length < 1) { setError('c-first', 'Required'); ok = false; }
  if (val('c-last').length < 1) { setError('c-last', 'Required'); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('c-email'))) { setError('c-email', 'Enter a valid email'); ok = false; }
  if (val('c-phone').replace(/\D/g, '').length < 7) { setError('c-phone', 'Enter a valid phone'); ok = false; }
  if (val('a-address1').length < 3) { setError('a-address1', 'Street address required'); ok = false; }
  if (val('a-city').length < 2) { setError('a-city', 'City required'); ok = false; }
  if (val('a-state').length < 2) { setError('a-state', 'State required'); ok = false; }
  if (val('a-zip').length < 3) { setError('a-zip', 'ZIP required'); ok = false; }
  if (!ok) toast('Check the highlighted fields', '⚠️');
  return ok;
}

function validateStep2() {
  clearErrors();
  if (paymentMethod() === 'cod') return true;
  let ok = true;
  const number = val('card-number');
  if (!luhn(number)) { setError('card-number', 'That card number is not valid'); ok = false; }
  if (val('card-name').length < 2) { setError('card-name', 'Name required'); ok = false; }
  const expMatch = /^(\d{2})\s*\/\s*(\d{2})$/.exec(val('card-exp'));
  if (!expMatch) { setError('card-exp', 'Use MM/YY'); ok = false; }
  else {
    const end = new Date(2000 + Number(expMatch[2]), Number(expMatch[1]), 1);
    if (Number(expMatch[1]) < 1 || Number(expMatch[1]) > 12 || end < new Date()) { setError('card-exp', 'Card expired'); ok = false; }
  }
  if (!/^\d{3,4}$/.test(val('card-cvc'))) { setError('card-cvc', '3–4 digits'); ok = false; }
  if (!ok) toast('Check your card details', '⚠️');
  return ok;
}

const paymentMethod = () => (document.querySelector('input[name="payment"]:checked') || {}).value || 'card';
const deliveryMethod = () => (document.querySelector('input[name="delivery"]:checked') || {}).value || 'standard';

function showStep(next) {
  step = next;
  els.sections.forEach((section) => section.classList.toggle('hidden', Number(section.dataset.step) !== next));
  els.steps.forEach((pill) => {
    const active = Number(pill.dataset.stepPill) <= next;
    pill.className = `flex items-center gap-2 rounded-full border-2 px-4 py-2 ${active ? 'border-ink bg-ink text-white shadow-sticker-sm' : 'border-ink/15 bg-white text-ink/50'}`;
    const badge = pill.querySelector('span');
    badge.className = `grid h-5 w-5 place-items-center rounded-full text-[11px] ${active ? 'bg-acid text-ink' : 'bg-ink/10'}`;
  });
  if (next === 3) fillReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------- pricing --------------------------------- */
function pricing() {
  const cfg = config();
  const subtotal = cartSubtotal();
  const discount = !promo ? 0
    : promo.type === 'percent' ? Math.round((subtotal * promo.value) / 100)
      : promo.type === 'fixed' ? Math.min(promo.value, subtotal)
        : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeShip = promo && promo.type === 'free_shipping';
  const shipping = freeShip
    ? 0
    : deliveryMethod() === 'express'
      ? cfg.express_shipping_cents
      : (afterDiscount >= cfg.free_shipping_threshold_cents ? 0 : cfg.standard_shipping_cents);
  const tax = Math.round((afterDiscount * cfg.tax_rate_bps) / 10000);
  return { subtotal, discount, shipping, tax, total: afterDiscount + shipping + tax, cfg };
}

function renderSummary() {
  const { subtotal, discount, shipping, tax, total, cfg } = pricing();
  els.items.innerHTML = cart.map((item) => `
    <div class="flex items-center gap-3">
      <span class="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl text-lg" style="background:linear-gradient(135deg, ${esc((item.gradient || '').split(',')[0])}, ${esc((item.gradient || '').split(',')[1] || '#000')})">
        <img src="${esc(item.image)}" alt="" class="h-full w-full object-cover" loading="lazy" />
        <span class="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-black text-white">${item.qty}</span>
      </span>
      <span class="min-w-0 flex-1 truncate text-[13px] font-extrabold">${esc(item.name)}</span>
      <span class="text-[13px] font-extrabold tabular">${money(item.priceCents * item.qty)}</span>
    </div>`).join('') || '<p class="text-sm font-bold text-ink/45">No items</p>';

  els.subtotal.textContent = money(subtotal);
  els.discountRow.classList.toggle('hidden', discount <= 0);
  els.discount.textContent = `-${money(discount)}`;
  els.shipping.textContent = shipping === 0 ? 'FREE' : money(shipping);
  els.tax.textContent = money(tax);
  els.taxRate.textContent = `(${(cfg.tax_rate_bps / 100).toFixed(2)}%)`;
  els.total.textContent = money(total);
  els.promoNote.classList.toggle('hidden', !promo);
  if (promo) els.promoNote.textContent = `🏷️ ${promo.code} — ${promo.description || 'applied'}`;
  els.shipStd.textContent = `Free over Rs ${(cfg.free_shipping_threshold_cents / 100).toFixed(0)} · else ${money(cfg.standard_shipping_cents)}`;
  els.shipExp.textContent = money(cfg.express_shipping_cents);
  document.querySelectorAll('[data-days-standard]').forEach((el) => { el.textContent = cfg.delivery_days_standard.replace('-', '–'); });
  document.querySelectorAll('[data-days-express]').forEach((el) => { el.textContent = cfg.delivery_days_express.replace('-', '–'); });
}

/* -------------------------------- review --------------------------------- */
function fillReview() {
  const { total } = pricing();
  els.reviewName.textContent = `${val('c-first')} ${val('c-last')}`;
  els.reviewAddress.textContent = [val('a-address1'), val('a-address2'), val('a-city'), val('a-state'), val('a-zip'), val('a-country')].filter(Boolean).join(', ');
  els.reviewContact.textContent = `${val('c-email')} · ${val('c-phone')}`;

  const method = paymentMethod();
  const brand = brandOf(val('card-number')) || 'card';
  els.reviewPayment.textContent = method === 'cod'
    ? '💵 Pay on delivery'
    : `💳 ${brand.toUpperCase()} •••• ${val('card-number').replace(/\D/g, '').slice(-4)}`;
  els.reviewDelivery.textContent = deliveryMethod() === 'express'
    ? `⚡ Express — arrives in ${config().delivery_days_express} days`
    : `🚚 Standard — arrives in ${config().delivery_days_standard} days`;

  els.reviewItems.innerHTML = cart.map((item) => `
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <span class="min-w-0 truncate text-sm font-extrabold">${item.qty} × ${esc(item.name)}</span>
      <span class="text-sm font-extrabold tabular">${money(item.priceCents * item.qty)}</span>
    </div>`).join('');
  els.reviewTotal.textContent = money(total);
}

/* ------------------------------ navigation -------------------------------- */
document.querySelectorAll('[data-next]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = Number(btn.dataset.next);
    if (target === 2 && !validateStep1()) return;
    if (target === 3 && !validateStep2()) return;
    showStep(target);
  });
});
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => showStep(Number(btn.dataset.back)));
});

document.querySelectorAll('input[name="delivery"]').forEach((input) => input.addEventListener('change', renderSummary));

document.querySelectorAll('input[name="payment"]').forEach((input) => {
  input.addEventListener('change', () => {
    const isCard = paymentMethod() === 'card';
    els.cardFields.classList.toggle('hidden', !isCard);
    els.cardFields.querySelectorAll('input').forEach((i) => { i.required = isCard; });
  });
});

/* --------------------------- card input polish ---------------------------- */
const cardNumber = field('card-number');
cardNumber.addEventListener('input', () => {
  const digits = cardNumber.value.replace(/\D/g, '').slice(0, 19);
  cardNumber.value = digits.replace(/(.{4})/g, '$1 ').trim();
  els.cardBrand.textContent = brandOf(digits);
});
const cardExp = field('card-exp');
cardExp.addEventListener('input', () => {
  let digits = cardExp.value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) digits = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  else if (digits.length === 2) digits = `${digits}/`;
  cardExp.value = digits;
});
field('card-cvc').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});

/* ------------------------------ prefilling -------------------------------- */
function prefill() {
  try {
    const saved = JSON.parse(localStorage.getItem('cc_contact') || '{}');
    const map = {
      'c-first': saved.firstName, 'c-last': saved.lastName, 'c-email': saved.email,
      'c-phone': saved.phone, 'a-address1': saved.address1, 'a-address2': saved.address2,
      'a-city': saved.city, 'a-state': saved.state, 'a-zip': saved.postal, 'a-country': saved.country
    };
    for (const [id, value] of Object.entries(map)) if (value && field(id)) field(id).value = value;
  } catch (_) { /* no saved details */ }
}
prefill();

/* ----------------------------- place order -------------------------------- */
const SERVER_TO_FIELD = {
  firstName: 'c-first', lastName: 'c-last', email: 'c-email', phone: 'c-phone',
  address1: 'a-address1', city: 'a-city', state: 'a-state', postal: 'a-zip',
  'card-number': 'card-number', promo: 'promo-input'
};

function applyServerErrors(err) {
  if (!err.fields) return;
  const stepOneKeys = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'postal'];
  for (const [key, message] of Object.entries(err.fields)) {
    const target = SERVER_TO_FIELD[key];
    if (target) setError(target, message);
  }
  if (Object.keys(err.fields).some((k) => stepOneKeys.includes(k))) showStep(1);
}

let submitting = false;
async function placeOrder() {
  if (submitting) return;
  if (!validateStep1()) return showStep(1);
  if (paymentMethod() === 'card' && !validateStep2()) return showStep(2);
  if (!cart.length) return location.replace('/cart');

  submitting = true;
  const original = els.placeBtn.innerHTML;
  els.placeBtn.disabled = true;
  els.placeBtn.innerHTML = 'Processing… 🫧';

  const contact = {
    firstName: val('c-first'), lastName: val('c-last'),
    email: val('c-email'), phone: val('c-phone')
  };
  const shipping = {
    address1: val('a-address1'), address2: val('a-address2'),
    city: val('a-city'), state: val('a-state'),
    postal: val('a-zip'), country: val('a-country') || 'US'
  };
  const payload = {
    contact,
    shipping,
    delivery: { method: deliveryMethod() },
    items: checkoutPayload(),
    promo: promo ? promo.code : undefined,
    payment: paymentMethod() === 'card'
      ? {
        method: 'card',
        card: {
          number: val('card-number'),
          name: val('card-name'),
          exp: val('card-exp'),
          cvc: val('card-cvc')
        }
      }
      : { method: 'cod' },
    clientToken: clientToken()
  };

  try {
    const order = await api('/checkout', { method: 'POST', body: payload });
    localStorage.setItem('cc_contact', JSON.stringify({ ...contact, ...shipping }));
    sessionStorage.removeItem('cc_promo');
    clearCart();
    rotateClientToken();
    const params = new URLSearchParams({ order: order.orderNumber, email: contact.email, placed: '1' });
    location.href = `/track?${params.toString()}`;
  } catch (err) {
    applyServerErrors(err);
    if (err.fields) {
      const inStep2 = Object.keys(err.fields).some((k) => k.startsWith('card'));
      if (inStep2) showStep(2);
    }
    if (err.code === 'out_of_stock') {
      toast(err.message, '📦');
      setTimeout(() => { location.href = '/cart'; }, 1800);
    } else {
      toast(err.message, '⚠️');
    }
  } finally {
    submitting = false;
    els.placeBtn.disabled = false;
    els.placeBtn.innerHTML = original;
  }
}
els.placeBtn.addEventListener('click', placeOrder);
void debounce;

renderSummary();
showStep(1);
