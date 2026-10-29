import { api, esc, money, formatDateTime, qs } from '../api.js';
import { config, toast } from '../store.js';
import { track, startHeartbeat } from '../track.js';

startHeartbeat();
track('pageview');

const els = {
  form: document.getElementById('track-form'),
  number: document.getElementById('track-number'),
  email: document.getElementById('track-email'),
  submit: document.getElementById('track-submit'),
  error: document.getElementById('track-error'),
  result: document.getElementById('track-result')
};

const STATUS_STYLE = {
  pending: 'bg-butter text-ink', paid: 'bg-aqua text-ink', packed: 'bg-iris text-white',
  shipped: 'bg-iris text-white', delivered: 'bg-acid text-ink',
  cancelled: 'bg-ink/10 text-ink/60', refunded: 'bg-coral text-white'
};

function showError(message) {
  els.error.textContent = message;
  els.error.classList.remove('hidden');
}
function clearError() {
  els.error.classList.add('hidden');
}

function timelineHtml(timeline) {
  return `
  <ol class="relative ml-3 space-y-6 border-l-2 border-dashed border-ink/15 pl-7">
    ${timeline.map((step) => `
      <li class="relative">
        <span class="absolute -left-[38px] grid h-6 w-6 place-items-center rounded-full border-2 text-[11px] font-black
          ${step.failed ? 'border-coral bg-coral text-white'
            : step.done ? 'border-ink bg-ink text-acid'
              : 'border-ink/20 bg-white text-ink/30'}">${step.done && !step.failed ? '✓' : step.failed ? '✕' : '•'}</span>
        <p class="text-sm font-extrabold ${step.done ? 'text-ink' : 'text-ink/40'}">${esc(step.label)}</p>
        <p class="text-xs font-bold text-ink/45">${step.at ? formatDateTime(step.at) : step.done ? '' : 'Waiting…'}</p>
      </li>`).join('')}
  </ol>`;
}

function render(data) {
  const { order, items, timeline, eta } = data;
  const cfg = config();
  els.result.innerHTML = `
  <div class="overflow-hidden rounded-[32px] border-2 border-ink bg-white shadow-sticker">
    <div class="flex flex-wrap items-center justify-between gap-4 bg-mist px-6 py-5">
      <div>
        <p class="text-[11px] font-black uppercase tracking-[0.16em] text-ink/45">Order</p>
        <p class="font-display text-2xl font-extrabold">${esc(order.orderNumber)}</p>
        <p class="text-xs font-bold text-ink/50">Placed ${formatDateTime(order.placedAt)} · ${esc(order.email)}</p>
      </div>
      <span class="status-pill ${STATUS_STYLE[order.status] || 'bg-ink/10'}">${esc(order.statusLabel || order.status)}</span>
    </div>

    <div class="grid gap-8 p-6 sm:p-8 lg:grid-cols-2">
      <div>
        <h2 class="font-display text-lg font-extrabold">Progress</h2>
        <div class="mt-4">${timelineHtml(timeline)}</div>

        ${order.trackingNumber ? `
        <div class="mt-6 rounded-2xl border-2 border-ink/10 bg-mist p-4">
          <p class="text-[11px] font-black uppercase tracking-wide text-ink/45">Tracking</p>
          <p class="mt-1 text-sm font-extrabold">${esc(order.carrier)} · <span class="font-mono">${esc(order.trackingNumber)}</span></p>
        </div>` : ''}

        <div class="mt-4 rounded-2xl bg-iris/10 p-4 text-sm font-bold text-ink/70">
          📦 Estimated arrival: <strong>${esc(eta)}</strong>
          <span class="block text-xs font-semibold text-ink/50">${order.deliveryMethod === 'express' ? `Express (${cfg.delivery_days_express} days)` : `Standard (${cfg.delivery_days_standard} days)`} · Shipping to ${esc(order.address)}</span>
        </div>
      </div>

      <div>
        <h2 class="font-display text-lg font-extrabold">What's inside</h2>
        <div class="mt-4 space-y-3">
          ${items.map((item) => `
            <div class="flex items-center gap-3 rounded-2xl border border-ink/8 p-3">
              <span class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl" style="background:linear-gradient(135deg, ${esc((item.gradient || '').split(',')[0])}, ${esc((item.gradient || '').split(',')[1] || '#000')})">
                <span class="text-xl font-black">${esc(item.emoji || '🎁')}</span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-extrabold">${esc(item.name)}</span>
                <span class="block text-xs font-bold text-ink/45">${item.qty} × ${money(item.unitPriceCents)}</span>
              </span>
              <span class="text-sm font-extrabold tabular">${money(item.lineTotalCents)}</span>
            </div>`).join('')}
        </div>

        <dl class="mt-5 space-y-2 text-sm font-bold">
          <div class="flex justify-between"><dt class="text-ink/55">Subtotal</dt><dd class="tabular">${money(order.subtotalCents)}</dd></div>
          ${order.discountCents ? `<div class="flex justify-between text-iris"><dt>Discount ${esc(order.promoCode || '')}</dt><dd class="tabular">-${money(order.discountCents)}</dd></div>` : ''}
          <div class="flex justify-between"><dt class="text-ink/55">Shipping</dt><dd class="tabular">${order.shippingCents ? money(order.shippingCents) : 'FREE'}</dd></div>
          <div class="flex justify-between"><dt class="text-ink/55">Tax</dt><dd class="tabular">${money(order.taxCents)}</dd></div>
          <div class="mt-2 flex justify-between border-t border-ink/10 pt-3"><dt class="text-base font-extrabold">Total</dt><dd class="font-display text-xl font-extrabold tabular">${money(order.totalCents)}</dd></div>
          <p class="text-xs font-bold text-ink/45">${order.paymentMethod === 'cod' ? '💵 Paying on delivery' : `💳 ${String(order.paymentBrand || 'card').toUpperCase()} ending ${esc(order.paymentLast4 || '••••')}`}</p>
        </dl>

        <div class="mt-5 flex flex-wrap gap-2">
          <a href="/shop" class="btn-lime btn-sm">Shop again</a>
          <button class="btn-outline btn-sm" data-track-another>Track another order</button>
        </div>
      </div>
    </div>
  </div>`;
  els.result.classList.remove('hidden');
  els.result.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' });
}

async function lookup(number, email, { silent = false } = {}) {
  clearError();
  if (!number || !email) return;
  els.submit.disabled = true;
  els.submit.textContent = 'Tracking…';
  try {
    const data = await api(`/orders/${encodeURIComponent(number.toUpperCase())}?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    render(data);
    return data;
  } catch (err) {
    if (!silent) showError(err.message);
    els.result.classList.add('hidden');
    return null;
  } finally {
    els.submit.disabled = false;
    els.submit.textContent = 'Track it';
  }
}

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  lookup(els.number.value.trim(), els.email.value.trim());
});

els.result.addEventListener('click', (e) => {
  if (e.target.closest('[data-track-another]')) {
    els.result.classList.add('hidden');
    els.number.value = '';
    els.number.focus();
  }
});

/* ------------------------------- confetti --------------------------------- */
function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.classList.remove('hidden');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#7C5CFF', '#D6FF3E', '#FF6B5E', '#FFD84D', '#7CE7FF', '#FF9BE1', '#0D0D12'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: 2.5 + Math.random() * 3.5,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.15 + Math.random() * 0.3
  }));
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.x += p.vx + Math.sin((elapsed / 400) + p.y / 60) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (elapsed < 2600) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.classList.add('hidden'); }
  }
  requestAnimationFrame(frame);
}

/* -------------------------------- startup --------------------------------- */
const preNumber = qs('order');
const preEmail = qs('email');
if (preNumber && preEmail) {
  els.number.value = preNumber.toUpperCase();
  els.email.value = preEmail;
  lookup(preNumber, preEmail, { silent: true }).then((data) => {
    if (data && qs('placed') === '1') {
      fireConfetti();
      toast(`Order ${data.order.orderNumber} confirmed 🎉`, '🎊');
    } else if (data) {
      toast('Order found', '📦');
    }
  });
} else if (qs('placed') === '1') {
  showError('Your order was placed — check your email for the order number.');
}
