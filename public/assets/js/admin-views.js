// ============================================================================
// Confetti Club — admin views: orders, products, customers, analytics, settings.
// ============================================================================
import {
  store, $, $$, esc, money, timeAgo, fmtDateTime, fmtDate, initials, debounce,
  statusPill, STATUS_META, CHART_COLORS,
  toast, openDrawer, openModal, closeModal, confirmBox, upsertChart, api,
} from './admin-ui.js';

/* ------------------------------- view timers ------------------------------ */
let viewTimers = [];
export function clearViewTimers() {
  viewTimers.forEach((id) => clearInterval(id));
  viewTimers = [];
}
const every = (ms, fn) => viewTimers.push(setInterval(fn, ms));

/** Bind a listener exactly once per element (views re-render their innards). */
function once(el, evt, fn) {
  if (!el) return;
  const key = `bound_${evt}`;
  if (el.dataset[key]) return;
  el.dataset[key] = '1';
  el.addEventListener(evt, fn);
}

function fieldError(scope, fields) {
  scope.querySelectorAll('.field-error.show').forEach((el) => {
    el.classList.remove('show');
    el.textContent = '';
  });
  scope.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
  if (!fields) return;
  for (const [name, message] of Object.entries(fields)) {
    const input = scope.querySelector(`[name="${name}"]`);
    const err = scope.querySelector(`[data-err-for="${name}"]`);
    if (input) input.classList.add('input-error');
    if (err) { err.textContent = message; err.classList.add('show'); }
  }
}

function pagerHtml({ page, pages, total }, showingFrom, showingTo, noun) {
  const prev = page <= 1 ? 'disabled' : '';
  const next = page >= pages ? 'disabled' : '';
  return `
    <span>Showing ${total ? showingFrom : 0}–${showingTo} of ${total.toLocaleString()} ${noun}</span>
    <span class="flex items-center gap-2">
      <button data-page="${page - 1}" ${prev} class="btn-outline btn-sm !px-3 !py-1.5">← Prev</button>
      <span class="px-1 font-black text-ink/70">Page ${page} / ${pages}</span>
      <button data-page="${page + 1}" ${next} class="btn-outline btn-sm !px-3 !py-1.5">Next →</button>
    </span>`;
}

function showAuthError(err) {
  if (err && err.status === 401) window.location.replace('/admin/login');
  else toast((err && err.message) || 'Something went wrong', '⚠️', 'error');
}

/* ========================================================================== *
 * ORDERS
 * ========================================================================== */
const ORDER_TABS = [
  ['all', 'All'], ['open', 'Open'], ['pending', 'Awaiting'], ['paid', 'Paid'],
  ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'], ['refunded', 'Refunded'],
];

const ACTION_LABEL = {
  paid: 'Confirm payment', packed: 'Mark as packed', shipped: 'Ship order',
  delivered: 'Mark delivered', cancelled: 'Cancel order', refunded: 'Issue refund',
};
const DANGER_ACTIONS = new Set(['cancelled', 'refunded']);

export async function renderOrders() {
  once($('#order-tabs'), 'click', (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    store.orders.status = btn.dataset.status;
    store.orders.page = 1;
    loadOrders();
  });

  once($('#order-search'), 'input', debounce((e) => {
    store.orders.q = e.target.value.trim();
    store.orders.page = 1;
    loadOrders();
  }, 300));

  once($('#orders-tbody'), 'click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (row) openOrder(Number(row.dataset.id));
  });

  once($('#orders-pagination'), 'click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    store.orders.page = Number(btn.dataset.page);
    loadOrders();
  });

  $('#order-search').value = store.orders.q;
  await loadOrders();
  every(20000, () => loadOrders({ silent: true }));
}

async function loadOrders({ silent = false } = {}) {
  const o = store.orders;
  try {
    const params = new URLSearchParams({
      status: o.status, q: o.q, page: String(o.page), limit: '20',
    });
    const data = await api(`/admin/orders?${params}`);
    o.items = data.items;
    o.pages = data.pages;
    o.total = data.total;
    o.page = data.page;
    o.statusCounts = data.statusCounts || {};
    paintOrders();
  } catch (err) {
    if (!silent) showAuthError(err);
  }
}

function paintOrders() {
  const o = store.orders;
  const counts = o.statusCounts || {};

  $('#order-tabs').innerHTML = ORDER_TABS.map(([key, label]) => {
    let n = 0;
    if (key === 'all') n = Object.values(counts).reduce((s, v) => s + v, 0);
    else if (key === 'open') n = ['pending', 'paid', 'packed', 'shipped'].reduce((s, k) => s + (counts[k] || 0), 0);
    else n = counts[key] || 0;
    const active = o.status === key;
    return `<button type="button" data-status="${key}" class="chip ${active ? 'chip-active' : ''}">
      ${label}<span class="ml-1 text-[11px] font-black ${active ? 'text-acid' : 'text-ink/40'}">${n}</span>
    </button>`;
  }).join('');

  $('#orders-tbody').innerHTML = o.items.length ? o.items.map((ord) => `
    <tr data-id="${ord.id}" class="cursor-pointer transition hover:bg-mist/60">
      <td class="px-4 py-3">
        <span class="flex items-center gap-2">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-mist text-sm">${ord.emoji || '🎁'}</span>
          <span class="font-mono text-xs font-bold text-ink/70">#${esc(ord.orderNumber)}</span>
        </span>
      </td>
      <td class="px-4 py-3">
        <span class="block font-extrabold text-ink">${esc(ord.name)}</span>
        <span class="block text-[11px] font-bold text-ink/45">${esc(ord.email)}</span>
      </td>
      <td class="px-4 py-3 text-xs font-bold text-ink/55">${ord.itemCount}</td>
      <td class="px-4 py-3 font-black tabular">${money(ord.totalCents)}</td>
      <td class="px-4 py-3">${statusPill(ord.status)}</td>
      <td class="px-4 py-3">
        <span class="block text-xs font-extrabold uppercase text-ink/60">${esc(ord.paymentMethod || 'card')}</span>
        <span class="block text-[11px] font-bold ${ord.paymentStatus === 'succeeded' ? 'text-ink/45' : 'text-coral'}">${esc(ord.paymentStatus || '')}</span>
      </td>
      <td class="px-4 py-3 text-xs font-bold text-ink/55">${timeAgo(ord.placedAt)}</td>
      <td class="px-4 py-3 text-right"><span class="text-xs font-black text-iris">Open →</span></td>
    </tr>`).join('')
    : `<tr><td colspan="8" class="px-4 py-10 text-center text-sm font-bold text-ink/45">
        No orders match “${esc(o.q)}”. Try another filter.</td></tr>`;

  const from = (o.page - 1) * 20 + 1;
  const to = Math.min(o.total, o.page * 20);
  $('#orders-pagination').innerHTML = pagerHtml(o, from, to, 'orders');
}

/* ------------------------------ order drawer ----------------------------- */
export async function openOrder(id) {
  let data;
  try {
    data = await api(`/admin/orders/${id}`);
  } catch (err) {
    showAuthError(err);
    return;
  }
  const ord = data.order;
  const nextOptions = ord.allowedNext || [];

  const actions = nextOptions.length ? `
    <div class="rounded-[22px] border-2 border-ink bg-white p-4 shadow-sticker-sm">
      <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">Move this order forward</p>
      ${nextOptions.includes('shipped') ? `
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="label">Carrier</span>
            <select id="d-carrier" name="carrier" class="input">
              ${['UPS', 'FedEx', 'USPS', 'DHL', 'Royal Mail', 'Other'].map((c) => `
                <option value="${c}" ${ord.fulfillment.carrier === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <span class="field-error" data-err-for="carrier"></span>
          </label>
          <label class="block">
            <span class="label">Tracking number</span>
            <input id="d-tracking" name="tracking" class="input" placeholder="1Z999AA10123456784"
              value="${esc(ord.fulfillment.trackingNumber || '')}" />
            <span class="field-error" data-err-for="tracking"></span>
          </label>
        </div>` : ''}
      <label class="mt-3 block">
        <span class="label">Internal note (optional)</span>
        <textarea id="d-note" rows="2" class="input resize-none" placeholder="Packed with the iridescent ribbon…"></textarea>
      </label>
      <div class="mt-4 flex flex-wrap gap-2">
        ${nextOptions.map((s) => `
          <button type="button" data-advance="${s}" class="btn-sm ${DANGER_ACTIONS.has(s) ? 'border-2 border-coral bg-white text-coral hover:bg-coral hover:text-white' : 'btn-primary'}">
            ${ACTION_LABEL[s]}
          </button>`).join('')}
      </div>
    </div>` : `
    <div class="rounded-[22px] border border-ink/10 bg-mist/70 p-4 text-sm font-bold text-ink/55">
      This order is ${esc(ord.statusLabel.toLowerCase())} — no further moves available.
    </div>`;

  const timeline = data.customerView.map((step) => `
    <li class="flex items-start gap-3">
      <span class="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${step.done ? 'border-ink bg-ink' : 'border-ink/20 bg-white'}">
        ${step.done ? '<span class="h-1.5 w-1.5 rounded-full bg-acid"></span>' : ''}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-extrabold ${step.current ? 'text-ink' : 'text-ink/60'}">${esc(step.label)}</span>
        ${step.at ? `<span class="block text-[11px] font-bold text-ink/40">${fmtDateTime(step.at)}</span>` : ''}
      </span>
    </li>`).join('');

  const items = data.items.map((i) => `
    <div class="flex items-center gap-3 rounded-2xl border border-ink/8 px-3 py-2.5">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
        style="background:linear-gradient(135deg, ${esc((i.gradient || '#7C5CFF,#D3FF52').split(',')[0])}, ${esc((i.gradient || '#7C5CFF,#D3FF52').split(',')[1] || '#D3FF52')})">${i.emoji || '🎁'}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-extrabold">${esc(i.name)}</span>
        <span class="block text-[11px] font-bold text-ink/45">${money(i.unitPriceCents)} × ${i.qty}</span>
      </span>
      <span class="text-sm font-black tabular">${money(i.lineTotalCents)}</span>
    </div>`).join('');

  const p = ord.pricing;
  const priceRow = (label, value, strong = false) => `
    <div class="flex items-center justify-between py-1 text-sm ${strong ? 'font-black' : 'font-bold text-ink/60'}">
      <span>${label}</span><span class="tabular">${value}</span>
    </div>`;

  const activity = data.customerTimeline.slice(0, 8).map((t) => `
    <li class="flex items-start gap-2 text-xs leading-snug">
      <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-iris"></span>
      <span class="min-w-0 flex-1 font-bold text-ink/70">${esc(t.message)}</span>
      <span class="shrink-0 font-bold text-ink/35">${timeAgo(t.at)}</span>
    </li>`).join('');

  openDrawer(`
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="font-mono text-xs font-bold text-ink/45">#${esc(ord.orderNumber)}</p>
        <h2 class="font-display text-2xl font-extrabold">${esc(ord.customer.name)}</h2>
        <p class="mt-1 text-xs font-bold text-ink/45">${fmtDate(ord.placedAt)} · ${esc(ord.source || 'web')} · ${ord.customer.previousOrders} lifetime order${ord.customer.previousOrders === 1 ? '' : 's'}</p>
      </div>
      <div class="text-right">
        ${statusPill(ord.status)}
        <p class="mt-2 font-display text-2xl font-extrabold tabular">${money(p.totalCents)}</p>
      </div>
    </div>

    <div class="mt-5">${actions}</div>

    <div class="mt-5 grid gap-4 sm:grid-cols-2">
      <div class="rounded-[22px] border border-ink/10 bg-white p-4">
        <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">Items</p>
        <div class="mt-3 space-y-2">${items}</div>
        <div class="mt-3 border-t border-ink/8 pt-2">
          ${priceRow('Subtotal', money(p.subtotalCents))}
          ${p.discountCents ? priceRow(`Discount (${esc(p.promoCode || '')})`, `−${money(p.discountCents)}`) : ''}
          ${priceRow('Shipping', p.shippingCents ? money(p.shippingCents) : 'Free')}
          ${priceRow('Tax', money(p.taxCents))}
          <div class="divider my-2"></div>
          ${priceRow('Total', money(p.totalCents), true)}
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-[22px] border border-ink/10 bg-white p-4">
          <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">Customer</p>
          <p class="mt-2 text-sm font-extrabold">${esc(ord.customer.name)}</p>
          <p class="text-xs font-bold text-ink/60">${esc(ord.customer.email)}</p>
          ${ord.customer.phone ? `<p class="text-xs font-bold text-ink/60">${esc(ord.customer.phone)}</p>` : ''}
          <p class="mt-2 text-xs font-bold leading-relaxed text-ink/55">${esc(ord.customer.address)}</p>
        </div>
        <div class="rounded-[22px] border border-ink/10 bg-white p-4">
          <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">Payment</p>
          <p class="mt-2 text-sm font-extrabold uppercase">${esc(ord.payment.method)} · ${esc(ord.payment.status)}</p>
          <p class="text-xs font-bold text-ink/55">${ord.payment.brand ? `${esc(ord.payment.brand)} •••• ${esc(ord.payment.last4)}` : 'No card on file'}</p>
          <p class="text-[11px] font-bold text-ink/40">Ref ${esc(ord.payment.ref || '—')}</p>
        </div>
        <div class="rounded-[22px] border border-ink/10 bg-white p-4">
          <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">Logistics</p>
          <p class="mt-2 text-sm font-bold">Carrier: <span class="font-extrabold">${esc(ord.fulfillment.carrier || 'not set')}</span></p>
          <p class="text-sm font-bold">Tracking: <span class="font-mono text-xs font-extrabold">${esc(ord.fulfillment.trackingNumber || '—')}</span></p>
          <p class="text-sm font-bold">Method: <span class="font-extrabold capitalize">${esc(ord.fulfillment.deliveryMethod || 'standard')}</span></p>
          <p class="text-sm font-bold">ETA: <span class="font-extrabold">${esc(ord.eta)}</span></p>
        </div>
      </div>
    </div>

    <div class="mt-5 grid gap-4 sm:grid-cols-2">
      <div class="rounded-[22px] border border-ink/10 bg-white p-4">
        <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">Progress</p>
        <ul class="mt-3 space-y-3">${timeline}</ul>
      </div>
      <div class="rounded-[22px] border border-ink/10 bg-white p-4">
        <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">Audit trail</p>
        <ul class="mt-3 space-y-2">${activity || '<li class="text-xs font-bold text-ink/40">No recorded events.</li>'}</ul>
      </div>
    </div>
  `);

  const body = $('#admin-drawer-body');
  body.querySelectorAll('[data-advance]').forEach((btn) => {
    btn.addEventListener('click', () => applyStatus(ord, btn.dataset.advance, btn));
  });
}

async function applyStatus(ord, next, btn) {
  const body = { status: next };
  const carrier = $('#d-carrier');
  const tracking = $('#d-tracking');
  const note = $('#d-note');
  if (next === 'shipped') {
    body.carrier = carrier ? carrier.value : '';
    body.tracking = tracking ? tracking.value.trim() : '';
  }
  if (note && note.value.trim()) body.note = note.value.trim();

  if (next === 'cancelled') {
    const ok = await confirmBox('Cancel this order? Stock returns to the shelf and any captured payment is refunded.', { confirmLabel: 'Cancel order', danger: true });
    if (!ok) return;
  }
  if (next === 'refunded') {
    const ok = await confirmBox('Issue a full refund through the payment provider?', { confirmLabel: 'Refund payment', danger: true });
    if (!ok) return;
  }

  btn.disabled = true;
  try {
    await api(`/admin/orders/${ord.id}/status`, { method: 'PATCH', body });
    toast(`${ord.orderNumber} → ${STATUS_META[next].label}`, '🎉');
    openOrder(ord.id);
    loadOrders({ silent: true });
  } catch (err) {
    btn.disabled = false;
    if (err.fields) fieldError($('#admin-drawer-body'), err.fields);
    else toast(err.message, '⚠️', 'error');
  }
}

/* ========================================================================== *
 * PRODUCTS
 * ========================================================================== */
const PRODUCT_TABS = [
  ['all', 'All'], ['active', 'Active'], ['low', 'Low stock'], ['archived', 'Archived'],
];

export async function renderProducts() {
  once($('#product-tabs'), 'click', (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    store.products.status = btn.dataset.status;
    store.products.page = 1;
    loadProducts();
  });
  once($('#product-search'), 'input', debounce((e) => {
    store.products.q = e.target.value.trim();
    store.products.page = 1;
    loadProducts();
  }, 300));
  once($('#products-tbody'), 'click', async (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    const id = Number(row.dataset.id);
    const product = store.products.items.find((p) => p.id === id);
    if (e.target.closest('[data-edit]')) openProductModal(product);
    else if (e.target.closest('[data-stock]')) openStockModal(product);
    else if (e.target.closest('[data-archive]')) toggleArchive(product);
  });
  once($('#products-pagination'), 'click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    store.products.page = Number(btn.dataset.page);
    loadProducts();
  });
  once($('#new-product-btn'), 'click', () => openProductModal(null));

  $('#product-search').value = store.products.q;
  await loadProducts();
}

async function loadProducts() {
  const s = store.products;
  try {
    const params = new URLSearchParams({
      status: s.status, q: s.q, page: String(s.page), limit: '25',
    });
    const data = await api(`/admin/products?${params}`);
    s.items = data.items;
    s.pages = data.pages;
    s.total = data.total;
    s.page = data.page;
    s.counts = data.counts;
    paintProducts();
  } catch (err) {
    showAuthError(err);
  }
}

function paintProducts() {
  const s = store.products;
  const counts = s.counts || {};

  $('#product-tabs').innerHTML = PRODUCT_TABS.map(([key, label]) => {
    const n = key === 'all' ? (counts.all || 0) : (counts[key] || 0);
    const active = s.status === key;
    return `<button type="button" data-status="${key}" class="chip ${active ? 'chip-active' : ''}">
      ${label}<span class="ml-1 text-[11px] font-black ${active ? 'text-acid' : 'text-ink/40'}">${n}</span>
    </button>`;
  }).join('');

  $('#products-tbody').innerHTML = s.items.length ? s.items.map((p) => {
    const [c1, c2] = (p.gradient || '#7C5CFF,#D3FF52').split(',');
    return `
    <tr data-id="${p.id}" class="transition hover:bg-mist/60">
      <td class="px-4 py-3">
        <span class="flex items-center gap-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg" style="background:linear-gradient(135deg, ${esc(c1)}, ${esc(c2 || '#D3FF52')})">${p.emoji || '🎁'}</span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-extrabold text-ink">${esc(p.name)}</span>
            <span class="block truncate text-[11px] font-bold text-ink/45">${esc(p.tagline || p.slug)}</span>
          </span>
        </span>
      </td>
      <td class="px-4 py-3"><span class="status-pill bg-mist text-ink/60">${esc(p.category)}</span></td>
      <td class="px-4 py-3">
        <span class="block font-black tabular">${money(p.priceCents)}</span>
        ${p.compareAtCents ? `<span class="block text-[11px] font-bold text-ink/35 line-through">${money(p.compareAtCents)}</span>` : ''}
      </td>
      <td class="px-4 py-3">
        <span class="status-pill ${p.stock <= 0 ? 'bg-coral text-white' : p.stock <= 5 ? 'bg-butter text-ink' : 'bg-acid/40 text-ink'}">${p.stock}</span>
      </td>
      <td class="px-4 py-3 text-xs font-bold text-ink/60 tabular">★ ${p.rating.toFixed(1)} <span class="text-ink/35">(${p.reviewCount})</span></td>
      <td class="px-4 py-3">
        ${p.active ? '<span class="status-pill bg-aqua text-ink">Active</span>' : '<span class="status-pill bg-ink/10 text-ink/55">Archived</span>'}
        ${p.featured ? '<span class="ml-1 status-pill bg-iris text-white">★</span>' : ''}
      </td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button type="button" data-stock class="mr-1 rounded-full border-2 border-ink/10 px-2.5 py-1 text-[11px] font-black hover:border-ink">Stock</button>
        <button type="button" data-edit class="mr-1 rounded-full border-2 border-ink/10 px-2.5 py-1 text-[11px] font-black hover:border-ink">Edit</button>
        <button type="button" data-archive class="rounded-full border-2 border-ink/10 px-2.5 py-1 text-[11px] font-black hover:border-coral hover:text-coral">${p.active ? 'Archive' : 'Restore'}</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="px-4 py-10 text-center text-sm font-bold text-ink/45">No products here yet.</td></tr>`;

  const from = (s.page - 1) * 25 + 1;
  const to = Math.min(s.total, s.page * 25);
  $('#products-pagination').innerHTML = pagerHtml(s, from, to, 'products');
}

function productForm(p) {
  const isNew = !p;
  const v = (val) => esc(val == null ? '' : val);
  return `
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-display text-2xl font-extrabold">${isNew ? 'New product' : 'Edit product'}</h2>
        <p class="text-xs font-bold text-ink/45">${isNew ? 'It appears in the shop the moment you save.' : `Editing ${esc(p.name)}`}</p>
      </div>
      <button type="button" data-close-modal class="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/10 hover:border-ink">✕</button>
    </div>

    <form id="product-form" class="mt-5 grid gap-4 sm:grid-cols-2">
      <label class="block">
        <span class="label">Name *</span>
        <input name="name" class="input" value="${v(p && p.name)}" maxlength="100" required />
        <span class="field-error" data-err-for="name"></span>
      </label>
      <label class="block">
        <span class="label">Category *</span>
        <input name="category" class="input" value="${v(p && p.category)}" list="category-list" maxlength="40" required />
        <datalist id="category-list">
          <option>For Her</option><option>For Him</option><option>Home & Cozy</option>
          <option>Tech & Gadgets</option><option>Personalized</option><option>Self-Care</option>
          <option>Experiences</option><option>Under Rs 25</option>
        </datalist>
        <span class="field-error" data-err-for="category"></span>
      </label>
      <label class="block sm:col-span-2">
        <span class="label">Tagline</span>
        <input name="tagline" class="input" value="${v(p && p.tagline)}" maxlength="140" placeholder="One line of charm…" />
        <span class="field-error" data-err-for="tagline"></span>
      </label>
      <label class="block">
        <span class="label">Price (USD) *</span>
        <input name="priceCents" type="number" step="0.01" min="0.01" class="input" value="${p ? (p.priceCents / 100).toFixed(2) : ''}" required />
        <span class="field-error" data-err-for="priceCents"></span>
      </label>
      <label class="block">
        <span class="label">Compare-at price (was)</span>
        <input name="compareAtCents" type="number" step="0.01" min="0" class="input" value="${p && p.compareAtCents ? (p.compareAtCents / 100).toFixed(2) : ''}" placeholder="Optional" />
        <span class="field-error" data-err-for="compareAtCents"></span>
      </label>
      <label class="block">
        <span class="label">Stock *</span>
        <input name="stock" type="number" step="1" min="0" class="input" value="${p ? p.stock : 0}" required />
        <span class="field-error" data-err-for="stock"></span>
      </label>
      <label class="block">
        <span class="label">Rating (0–5)</span>
        <input name="rating" type="number" step="0.1" min="0" max="5" class="input" value="${p ? p.rating : 4.5}" />
        <span class="field-error" data-err-for="rating"></span>
      </label>
      <label class="block">
        <span class="label">Emoji</span>
        <input name="emoji" class="input" value="${v(p && p.emoji)}" maxlength="8" placeholder="🎁" />
        <span class="field-error" data-err-for="emoji"></span>
      </label>
      <label class="block">
        <span class="label">Gradient (2 hex colors)</span>
        <input name="gradient" class="input font-mono text-xs" value="${v(p && p.gradient)}" placeholder="#7C5CFF,#D3FF52" />
        <span class="field-error" data-err-for="gradient"></span>
      </label>
      <label class="block sm:col-span-2">
        <span class="label">Description</span>
        <textarea name="description" rows="4" class="input resize-none" maxlength="4000">${v(p && p.description)}</textarea>
        <span class="field-error" data-err-for="description"></span>
      </label>
      <div class="flex flex-wrap gap-4 sm:col-span-2">
        <label class="flex items-center gap-2 text-sm font-extrabold">
          <input type="checkbox" name="is_active" class="h-4 w-4 accent-ink" ${(!p || p.active) ? 'checked' : ''} /> Active in shop
        </label>
        <label class="flex items-center gap-2 text-sm font-extrabold">
          <input type="checkbox" name="is_featured" class="h-4 w-4 accent-iris" ${p && p.featured ? 'checked' : ''} /> Featured
        </label>
      </div>
      <div class="flex justify-end gap-2 sm:col-span-2">
        <button type="button" data-close-modal class="btn-outline btn-sm">Cancel</button>
        <button type="submit" class="btn-primary btn-sm">${isNew ? 'Create product' : 'Save changes'}</button>
      </div>
    </form>`;
}

export function openProductModal(p) {
  openModal(productForm(p));
  const form = $('#product-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const num = (name, fallback = null) => {
      const raw = fd.get(name);
      if (raw === '' || raw == null) return fallback;
      return Number(raw);
    };
    const price = num('priceCents');
    const compare = num('compareAtCents');
    const payload = {
      name: String(fd.get('name') || '').trim(),
      tagline: String(fd.get('tagline') || '').trim(),
      category: String(fd.get('category') || '').trim(),
      emoji: String(fd.get('emoji') || '').trim(),
      gradient: String(fd.get('gradient') || '').trim(),
      description: String(fd.get('description') || '').trim(),
      priceCents: price == null ? null : Math.round(price * 100),
      compareAtCents: compare == null ? null : Math.round(compare * 100),
      stock: num('stock', 0),
      rating: num('rating', 4.5),
      is_active: fd.get('is_active') === 'on',
      is_featured: fd.get('is_featured') === 'on',
    };

    try {
      if (p) await api(`/admin/products/${p.id}`, { method: 'PATCH', body: payload });
      else await api('/admin/products', { method: 'POST', body: payload });
      closeModal();
      toast(p ? `${payload.name} updated` : `${payload.name} created`, '🎁');
      loadProducts();
    } catch (err) {
      if (err.fields) fieldError(form, err.fields);
      else toast(err.message, '⚠️', 'error');
    }
  });
}

function openStockModal(p) {
  if (!p) return;
  openModal(`
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-display text-2xl font-extrabold">Adjust stock</h2>
        <p class="text-xs font-bold text-ink/45">${esc(p.name)} · currently <span class="font-black text-ink">${p.stock}</span> in stock</p>
      </div>
      <button type="button" data-close-modal class="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/10 hover:border-ink">✕</button>
    </div>
    <form id="stock-form" class="mt-5 grid gap-4 sm:grid-cols-2">
      <label class="block">
        <span class="label">Change (use − for reductions)</span>
        <input name="delta" type="number" step="1" class="input" value="1" required />
        <span class="field-error" data-err-for="delta"></span>
      </label>
      <label class="block">
        <span class="label">Reason</span>
        <select name="reason" class="input">
          <option value="manual_adjust">Manual adjustment</option>
          <option value="restock">Supplier restock</option>
          <option value="correction">Cycle-count correction</option>
          <option value="damaged">Damaged / written off</option>
        </select>
      </label>
      <div class="flex justify-end gap-2 sm:col-span-2">
        <button type="button" data-close-modal class="btn-outline btn-sm">Cancel</button>
        <button type="submit" class="btn-primary btn-sm">Apply change</button>
      </div>
    </form>`);

  $('#stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await api(`/admin/products/${p.id}/stock`, {
        method: 'POST',
        body: { delta: Number(fd.get('delta')), reason: String(fd.get('reason')) },
      });
      closeModal();
      toast(`${p.name}: ${res.stock} in stock`, '📦');
      loadProducts();
    } catch (err) {
      if (err.fields) fieldError(e.target, err.fields);
      else toast(err.message, '⚠️', 'error');
    }
  });
}

async function toggleArchive(p) {
  if (!p) return;
  if (p.active) {
    const ok = await confirmBox(`Archive “${p.name}”? It disappears from the shop but keeps its order history.`, { confirmLabel: 'Archive', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/products/${p.id}`, { method: 'DELETE' });
      toast(`${p.name} archived`, '🗂️');
      loadProducts();
    } catch (err) { showAuthError(err); }
  } else {
    try {
      await api(`/admin/products/${p.id}`, { method: 'PATCH', body: { is_active: true } });
      toast(`${p.name} is back in the shop`, '🎉');
      loadProducts();
    } catch (err) { showAuthError(err); }
  }
}

/* ========================================================================== *
 * CUSTOMERS
 * ========================================================================== */
export async function renderCustomers() {
  once($('#customer-search'), 'input', debounce((e) => {
    store.customers.q = e.target.value.trim();
    store.customers.page = 1;
    loadCustomers();
  }, 300));
  once($('#customers-tbody'), 'click', (e) => {
    const btn = e.target.closest('[data-orders]');
    if (!btn) return;
    store.orders.q = btn.dataset.orders;
    store.orders.status = 'all';
    store.orders.page = 1;
    window.location.hash = '#/orders';
  });
  once($('#customers-pagination'), 'click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    store.customers.page = Number(btn.dataset.page);
    loadCustomers();
  });

  $('#customer-search').value = store.customers.q;
  await loadCustomers();
}

async function loadCustomers() {
  const c = store.customers;
  try {
    const params = new URLSearchParams({ q: c.q, page: String(c.page), limit: '25' });
    const data = await api(`/admin/customers?${params}`);
    c.items = data.items;
    c.pages = data.pages;
    c.total = data.total;
    c.page = data.page;
    c.totals = data.totals;
    paintCustomers();
  } catch (err) {
    showAuthError(err);
  }
}

function paintCustomers() {
  const c = store.customers;
  const kpi = store.stats ? store.stats.kpi : null;
  const cards = [
    { label: 'Customers', value: (kpi ? kpi.customersTotal : c.total).toLocaleString(), note: 'all time', icon: '👥' },
    { label: 'New today', value: (kpi ? kpi.newCustomersToday : 0).toLocaleString(), note: 'joined in the last 24h', icon: '🆕' },
    { label: 'Store revenue', value: money(c.totals ? c.totals.revenue : 0), note: 'excluding cancellations', icon: '💰' },
  ];
  $('#customer-cards').innerHTML = cards.map((d) => `
    <div class="card p-5">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">${d.label}</p>
          <p class="mt-2 font-display text-3xl font-extrabold tabular">${d.value}</p>
          <p class="mt-1 text-[11px] font-bold text-ink/45">${d.note}</p>
        </div>
        <span class="grid h-10 w-10 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">${d.icon}</span>
      </div>
    </div>`).join('');

  $('#customers-tbody').innerHTML = c.items.length ? c.items.map((cust) => `
    <tr class="transition hover:bg-mist/60">
      <td class="px-4 py-3">
        <span class="flex items-center gap-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-iris text-[11px] font-black text-white">${initials(cust.name)}</span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-extrabold text-ink">${esc(cust.name)}</span>
            <span class="block truncate text-[11px] font-bold text-ink/45">${esc(cust.email)}</span>
          </span>
        </span>
      </td>
      <td class="px-4 py-3 text-xs font-bold text-ink/60">${esc(cust.city || '—')}</td>
      <td class="px-4 py-3 text-sm font-black tabular">${cust.orders}</td>
      <td class="px-4 py-3 text-sm font-black tabular">${money(cust.ltvCents)}</td>
      <td class="px-4 py-3 text-xs font-bold text-ink/55">${cust.lastOrderAt ? timeAgo(cust.lastOrderAt) : '—'}</td>
      <td class="px-4 py-3 text-right">
        <button type="button" data-orders="${esc(cust.email)}" class="text-xs font-black text-iris transition hover:text-ink">Orders →</button>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="6" class="px-4 py-10 text-center text-sm font-bold text-ink/45">No customers match that search.</td></tr>`;

  const from = (c.page - 1) * 25 + 1;
  const to = Math.min(c.total, c.page * 25);
  $('#customers-pagination').innerHTML = pagerHtml(c, from, to, 'customers');
}

/* ========================================================================== *
 * ANALYTICS
 * ========================================================================== */
export async function renderAnalytics() {
  let a;
  try {
    a = await api('/admin/analytics');
  } catch (err) {
    showAuthError(err);
    return;
  }
  store.analytics = a;

  const kpis = [
    { label: 'Visits · 7d', value: a.kpis.visits7d.toLocaleString(), icon: '👣' },
    { label: 'Unique visitors', value: a.kpis.uniques7d.toLocaleString(), icon: '🧑‍💻' },
    { label: 'Add-to-bag rate', value: `${a.kpis.addToCartRate}%`, icon: '🛍️' },
    { label: 'Checkout rate', value: `${a.kpis.checkoutRate}%`, icon: '💳' },
    { label: 'Purchase rate', value: `${a.kpis.purchaseRate}%`, icon: '🎉' },
  ];
  $('#analytics-kpis').innerHTML = kpis.map((d) => `
    <div class="card p-4">
      <div class="flex items-center justify-between">
        <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">${d.label}</p>
        <span class="text-base">${d.icon}</span>
      </div>
      <p class="mt-1.5 font-display text-2xl font-extrabold tabular">${d.value}</p>
    </div>`).join('');

  // Traffic by hour
  upsertChart('an-hourly', 'chart-hourly', {
    type: 'bar',
    data: {
      labels: a.hourly.map((h) => `${h.hour}`),
      datasets: [{
        data: a.hourly.map((h) => h.visits),
        backgroundColor: (ctx) => (ctx.dataIndex % 2 ? 'rgba(124,92,255,0.55)' : '#7C5CFF'),
        borderRadius: 6, borderSkipped: false,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items) => `${items[0].label}:00`, label: (c) => ` ${c.parsed.y} visits` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8A8A99', maxTicksLimit: 12, font: { size: 10 } } },
        y: { grid: { color: 'rgba(13,13,18,0.06)' }, ticks: { color: '#8A8A99', precision: 0 } },
      },
    },
  });

  // Sources doughnut
  const palette = [CHART_COLORS.iris, CHART_COLORS.acid, CHART_COLORS.coral, CHART_COLORS.aqua, CHART_COLORS.butter, CHART_COLORS.bubble, '#6366F1', '#94A3B8'];
  upsertChart('an-sources', 'chart-sources', {
    type: 'doughnut',
    data: {
      labels: a.sources.map((s) => s.source),
      datasets: [{
        data: a.sources.map((s) => s.visits),
        backgroundColor: a.sources.map((_, i) => palette[i % palette.length]),
        borderColor: '#FFFFFF', borderWidth: 3, hoverOffset: 6,
      }],
    },
    options: { maintainAspectRatio: false, cutout: '64%', plugins: { legend: { display: false } } },
  });
  $('#sources-list').innerHTML = a.sources.map((s, i) => `
    <div class="flex items-center gap-2 text-sm">
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:${palette[i % palette.length]}"></span>
      <span class="flex-1 font-bold capitalize text-ink/70">${esc(s.source)}</span>
      <span class="font-black tabular">${s.visits.toLocaleString()}</span>
      <span class="w-16 text-right text-[11px] font-bold text-ink/40 tabular">${s.uniques.toLocaleString()} uniq</span>
    </div>`).join('');

  // Funnel
  const sessions = Math.max(1, a.funnel[0].count);
  const FUNNEL_COLORS = ['#7C5CFF', '#A78BFA', '#F472B6', '#38BDF8', '#8ACD2A'];
  $('#funnel').innerHTML = a.funnel.map((step, i) => {
    const pct = Math.round((step.count / sessions) * 1000) / 10;
    return `
      <div>
        <div class="flex items-baseline justify-between text-sm">
          <span class="font-extrabold text-ink/75">${esc(step.stage)}</span>
          <span class="font-black tabular">${step.count.toLocaleString()} <span class="text-[11px] font-bold text-ink/40">${pct}%</span></span>
        </div>
        <div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/8">
          <div class="h-full rounded-full transition-all duration-700" style="width:${Math.max(2, pct)}%;background:${FUNNEL_COLORS[i % FUNNEL_COLORS.length]}"></div>
        </div>
      </div>`;
  }).join('');

  // Visits line
  upsertChart('an-visits', 'chart-visits', {
    type: 'line',
    data: {
      labels: a.daily.map((d) => d.label),
      datasets: [{
        data: a.daily.map((d) => d.visits),
        borderColor: CHART_COLORS.coral, borderWidth: 2.5, tension: 0.35,
        pointRadius: 3, pointBackgroundColor: '#FFFFFF', pointBorderWidth: 2,
        fill: true,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(255,107,94,0.15)';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(255,107,94,0.3)');
          g.addColorStop(1, 'rgba(255,107,94,0)');
          return g;
        },
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8A8A99', font: { size: 10 } } },
        y: { grid: { color: 'rgba(13,13,18,0.06)' }, ticks: { color: '#8A8A99', precision: 0 } },
      },
    },
  });

  // Orders by channel
  const maxRev = Math.max(1, ...a.ordersBySource.map((s) => s.revenue));
  $('#orders-by-source').innerHTML = a.ordersBySource.length ? a.ordersBySource.map((s) => `
    <div>
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-extrabold capitalize text-ink/75">${esc(s.source)}</span>
        <span class="font-black tabular">${money(s.revenue)}</span>
      </div>
      <div class="mt-1 h-2 overflow-hidden rounded-full bg-ink/8">
        <div class="h-full rounded-full bg-iris" style="width:${Math.round((s.revenue / maxRev) * 100)}%"></div>
      </div>
      <p class="mt-0.5 text-[11px] font-bold text-ink/45">${s.orders} order${s.orders === 1 ? '' : 's'}</p>
    </div>`).join('') : '<p class="text-sm font-bold text-ink/45">No orders in the last 30 days.</p>';

  // Top pages
  const maxPage = Math.max(1, ...a.pages.map((p) => p.visits));
  $('#top-pages').innerHTML = a.pages.map((p) => `
    <div class="flex items-center gap-3">
      <span class="w-56 shrink-0 truncate font-mono text-xs font-bold text-ink/70">${esc(p.path)}</span>
      <span class="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/8">
        <span class="block h-full rounded-full bg-gradient-to-r from-iris to-aqua" style="width:${Math.round((p.visits / maxPage) * 100)}%"></span>
      </span>
      <span class="w-16 shrink-0 text-right text-xs font-black tabular">${p.visits.toLocaleString()}</span>
    </div>`).join('') || '<p class="text-sm font-bold text-ink/45">No pageviews recorded yet.</p>';
}

/* ========================================================================== *
 * SETTINGS
 * ========================================================================== */
const moneyField = (cents) => (cents == null ? '' : (cents / 100).toFixed(2));

export async function renderSettings() {
  bindSettingsControls();
  await Promise.all([loadSettings(), loadPromos(), loadSystemInfo()]);
}

function bindSettingsControls() {
  once($('#settings-form'), 'submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      store_name: String(fd.get('store_name') || '').trim(),
      currency: String(fd.get('currency') || '').trim().toUpperCase(),
      announcement: String(fd.get('announcement') || '').trim(),
      support_email: String(fd.get('support_email') || '').trim(),
      delivery_days_standard: String(fd.get('delivery_days_standard') || '').trim(),
      delivery_days_express: String(fd.get('delivery_days_express') || '').trim(),
      free_shipping_threshold_cents: Math.round(Number(fd.get('free_shipping_threshold')) * 100 || 0),
      standard_shipping_cents: Math.round(Number(fd.get('standard_shipping')) * 100 || 0),
      express_shipping_cents: Math.round(Number(fd.get('express_shipping')) * 100 || 0),
      tax_rate_bps: Math.round(Number(fd.get('tax_rate')) * 100 || 0),
    };
    try {
      await api('/admin/settings', { method: 'PATCH', body: payload });
      toast('Settings saved — storefront updated', '✅');
      fieldError(e.target, null);
    } catch (err) {
      if (err.fields) fieldError(e.target, err.fields);
      else toast(err.message, '⚠️', 'error');
    }
  });

  once($('#password-form'), 'submit', async (e) => {
    e.preventDefault();
    const current = $('#current-password').value;
    const next = $('#new-password').value;
    try {
      await api('/admin/password', { method: 'POST', body: { current, next } });
      e.target.reset();
      toast('Password updated', '🔐');
    } catch (err) {
      toast(err.message, '⚠️', 'error');
    }
  });

  once($('#new-promo-btn'), 'click', () => openPromoModal(null));
}

async function loadSettings() {
  try {
    const data = await api('/admin/settings');
    store.settings = data;
    const s = data.settings;
    $('#settings-form').innerHTML = `
      <label class="block">
        <span class="label">Store name</span>
        <input name="store_name" class="input" value="${esc(s.store_name)}" />
        <span class="field-error" data-err-for="store_name"></span>
      </label>
      <label class="block">
        <span class="label">Currency</span>
        <input name="currency" class="input font-mono" value="${esc(s.currency)}" maxlength="3" />
        <span class="field-error" data-err-for="currency"></span>
      </label>
      <label class="block sm:col-span-2">
        <span class="label">Announcement bar</span>
        <input name="announcement" class="input" value="${esc(s.announcement)}" maxlength="300" />
        <span class="field-error" data-err-for="announcement"></span>
      </label>
      <label class="block">
        <span class="label">Support email</span>
        <input name="support_email" type="email" class="input" value="${esc(s.support_email)}" />
        <span class="field-error" data-err-for="support_email"></span>
      </label>
      <label class="block">
        <span class="label">Tax rate (%)</span>
        <input name="tax_rate" type="number" step="0.01" min="0" class="input" value="${(Number(s.tax_rate_bps) / 100).toFixed(2)}" />
        <span class="field-error" data-err-for="tax_rate_bps"></span>
      </label>
      <label class="block">
        <span class="label">Free shipping over ($)</span>
        <input name="free_shipping_threshold" type="number" step="0.01" min="0" class="input" value="${moneyField(s.free_shipping_threshold_cents)}" />
        <span class="field-error" data-err-for="free_shipping_threshold_cents"></span>
      </label>
      <label class="block">
        <span class="label">Standard shipping ($)</span>
        <input name="standard_shipping" type="number" step="0.01" min="0" class="input" value="${moneyField(s.standard_shipping_cents)}" />
        <span class="field-error" data-err-for="standard_shipping_cents"></span>
      </label>
      <label class="block">
        <span class="label">Express shipping ($)</span>
        <input name="express_shipping" type="number" step="0.01" min="0" class="input" value="${moneyField(s.express_shipping_cents)}" />
        <span class="field-error" data-err-for="express_shipping_cents"></span>
      </label>
      <label class="block">
        <span class="label">Standard delivery (days)</span>
        <input name="delivery_days_standard" class="input" value="${esc(s.delivery_days_standard)}" />
        <span class="field-error" data-err-for="delivery_days_standard"></span>
      </label>
      <label class="block">
        <span class="label">Express delivery (days)</span>
        <input name="delivery_days_express" class="input" value="${esc(s.delivery_days_express)}" />
        <span class="field-error" data-err-for="delivery_days_express"></span>
      </label>
      <div class="flex justify-end gap-2 sm:col-span-2">
        <button type="submit" class="btn-primary btn-sm">Save settings</button>
      </div>`;
  } catch (err) {
    showAuthError(err);
  }
}

async function loadSystemInfo() {
  try {
    const live = await api('/admin/stats/live');
    const sys = live.system || {};
    const rows = [
      ['Runtime', `Node ${esc(sys.node || '—')}`],
      ['Uptime', formatUptime(sys.uptimeSec || 0)],
      ['Avg latency', `${sys.avgLatencyMs ?? 0} ms`],
      ['p95 latency', `${sys.p95LatencyMs ?? 0} ms`],
      ['Database', `${sys.dbSizeMb ?? 0} MB (SQLite · WAL)`],
      ['Live now', `${live.activeVisitors ?? 0} visitors`],
      ['Orders today', `${live.ordersToday ?? 0} · ${money(live.revenueTodayCents || 0)}`],
    ];
    $('#system-info').innerHTML = rows.map(([k, v]) => `
      <div class="flex items-center justify-between gap-3 border-b border-ink/6 pb-2 last:border-0">
        <dt class="text-ink/45">${k}</dt>
        <dd class="text-right font-extrabold tabular">${v}</dd>
      </div>`).join('');
  } catch (_) { /* non-fatal */ }
}

function formatUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  return `${m}m ${sec % 60}s`;
}

/* --------------------------------- promos -------------------------------- */
async function loadPromos() {
  try {
    const data = await api('/admin/promos');
    paintPromos(data.items || []);
  } catch (err) {
    showAuthError(err);
  }
}

function promoValueLabel(p) {
  if (p.type === 'percent') return `${p.value}% off`;
  if (p.type === 'free_shipping') return 'Free shipping';
  return `${money(p.value)} off`;
}

function paintPromos(items) {
  const host = $('#promo-list');
  host.innerHTML = items.length ? items.map((p) => `
    <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 px-4 py-3">
      <span class="rounded-xl border-2 border-dashed border-ink/25 bg-mist px-3 py-1.5 font-mono text-sm font-black tracking-wider">${esc(p.code)}</span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-extrabold">${promoValueLabel(p)}</span>
        <span class="block text-[11px] font-bold text-ink/45">
          ${p.minSubtotalCents ? `Min ${money(p.minSubtotalCents)} · ` : ''}${p.uses} use${p.uses === 1 ? '' : 's'}
          ${p.expiresAt ? ` · expires ${fmtDate(p.expiresAt)}` : ''}${p.description ? ` · ${esc(p.description)}` : ''}
        </span>
      </span>
      <span class="${p.active ? 'status-pill bg-acid text-ink' : 'status-pill bg-ink/10 text-ink/55'}">${p.active ? 'Active' : 'Off'}</span>
      <span class="flex gap-2">
        <button type="button" data-promo-toggle="${p.id}" data-active="${p.active ? '1' : '0'}" class="rounded-full border-2 border-ink/10 px-3 py-1 text-[11px] font-black hover:border-ink">${p.active ? 'Disable' : 'Enable'}</button>
        <button type="button" data-promo-delete="${p.id}" data-code="${esc(p.code)}" class="rounded-full border-2 border-ink/10 px-3 py-1 text-[11px] font-black hover:border-coral hover:text-coral">Delete</button>
      </span>
    </div>`).join('')
    : '<p class="text-sm font-bold text-ink/45">No promo codes yet — create your first one.</p>';

  host.querySelectorAll('[data-promo-toggle]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/admin/promos/${btn.dataset.promoToggle}`, {
          method: 'PATCH',
          body: { active: btn.dataset.active !== '1' },
        });
        toast('Promo updated', '🏷️');
        loadPromos();
      } catch (err) { showAuthError(err); }
    });
  });
  host.querySelectorAll('[data-promo-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await confirmBox(`Delete promo ${btn.dataset.code}? Existing orders keep their discount.`, { confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      try {
        await api(`/admin/promos/${btn.dataset.promoDelete}`, { method: 'DELETE' });
        toast('Promo deleted', '🗑️');
        loadPromos();
      } catch (err) { showAuthError(err); }
    });
  });
}

function openPromoModal() {
  openModal(`
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-display text-2xl font-extrabold">New promo code</h2>
        <p class="text-xs font-bold text-ink/45">Codes apply instantly at checkout.</p>
      </div>
      <button type="button" data-close-modal class="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/10 hover:border-ink">✕</button>
    </div>
    <form id="promo-form" class="mt-5 grid gap-4 sm:grid-cols-2">
      <label class="block">
        <span class="label">Code *</span>
        <input name="code" class="input font-mono uppercase" placeholder="CONFETTI10" maxlength="24" required />
        <span class="field-error" data-err-for="code"></span>
      </label>
      <label class="block">
        <span class="label">Type</span>
        <select name="type" id="promo-type" class="input">
          <option value="percent">Percentage off</option>
          <option value="fixed">Fixed amount off</option>
          <option value="free_shipping">Free shipping</option>
        </select>
      </label>
      <label class="block" id="promo-value-field">
        <span class="label">Value</span>
        <input name="value" id="promo-value" type="number" step="1" min="0" class="input" value="10" />
        <span class="field-error" data-err-for="value"></span>
      </label>
      <label class="block">
        <span class="label">Min subtotal ($)</span>
        <input name="minSubtotalCents" type="number" step="0.01" min="0" class="input" placeholder="0.00" />
      </label>
      <label class="block">
        <span class="label">Expires (optional)</span>
        <input name="expiresAt" type="date" class="input" />
        <span class="field-error" data-err-for="expiresAt"></span>
      </label>
      <label class="block">
        <span class="label">Description</span>
        <input name="description" class="input" maxlength="140" placeholder="Spring drop" />
      </label>
      <div class="flex justify-end gap-2 sm:col-span-2">
        <button type="button" data-close-modal class="btn-outline btn-sm">Cancel</button>
        <button type="submit" class="btn-primary btn-sm">Create code</button>
      </div>
    </form>`);

  const type = $('#promo-type');
  const valueField = $('#promo-value-field');
  type.addEventListener('change', () => {
    const t = type.value;
    valueField.classList.toggle('hidden', t === 'free_shipping');
    const input = $('#promo-value');
    if (t === 'percent') { input.step = '1'; input.min = '1'; input.max = '90'; input.value = input.value || '10'; }
    if (t === 'fixed') { input.step = '0.01'; input.min = '0.01'; input.max = ''; }
  });

  $('#promo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const t = String(fd.get('type'));
    const rawValue = Number(fd.get('value') || 0);
    const payload = {
      code: String(fd.get('code') || '').trim().toUpperCase(),
      type: t,
      value: t === 'fixed' ? Math.round(rawValue * 100) : Math.round(rawValue),
      minSubtotalCents: Math.round(Number(fd.get('minSubtotalCents') || 0) * 100),
      description: String(fd.get('description') || '').trim(),
      expiresAt: fd.get('expiresAt') ? String(fd.get('expiresAt')) : null,
    };
    try {
      await api('/admin/promos', { method: 'POST', body: payload });
      closeModal();
      toast(`${payload.code} is live`, '🏷️');
      loadPromos();
    } catch (err) {
      if (err.fields) fieldError(e.target, err.fields);
      else toast(err.message, '⚠️', 'error');
    }
  });
}
