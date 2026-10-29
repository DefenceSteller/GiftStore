import { api } from '../api.js';

/* --------------------------------- state ---------------------------------- */
export const store = {
  admin: null,
  view: 'overview',
  stats: null,
  live: null,
  analytics: null,
  orders: { page: 1, status: 'all', q: '', pages: 1, total: 0, items: [] },
  products: { page: 1, status: 'all', q: '', pages: 1, items: [], counts: {} },
  customers: { page: 1, q: '', pages: 1, items: [] },
  settings: null
};

export const STATUS_META = {
  pending: { label: 'Awaiting payment', pill: 'bg-butter text-ink' },
  paid: { label: 'Paid', pill: 'bg-aqua text-ink' },
  packed: { label: 'Packed', pill: 'bg-iris text-white' },
  shipped: { label: 'Shipped', pill: 'bg-indigo-500 text-white' },
  delivered: { label: 'Delivered', pill: 'bg-acid text-ink' },
  cancelled: { label: 'Cancelled', pill: 'bg-ink/10 text-ink/55' },
  refunded: { label: 'Refunded', pill: 'bg-coral text-white' }
};

export const STATUS_ORDER = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];

export function statusPill(status) {
  const meta = STATUS_META[status] || { label: status, pill: 'bg-ink/10 text-ink/60' };
  return `<span class="status-pill ${meta.pill}">${meta.label}</span>`;
}

/* -------------------------------- helpers --------------------------------- */
export const $ = (sel, scope = document) => scope.querySelector(sel);
export const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

export function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const money = (cents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100);

export function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const fmtDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
export const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export function initials(name) {
  return String(name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

/** Animated number transition for KPI values. */
export function countUp(el, to, { format = (v) => Math.round(v).toLocaleString(), duration = 700 } = {}) {
  const from = Number(el.dataset.value || 0);
  el.dataset.value = String(to);
  if (from === to) { el.textContent = format(to); return; }
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = format(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export const deltaBadge = (value) => {
  const v = Number(value || 0);
  const up = v >= 0;
  return `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${up ? 'bg-acid/60 text-ink' : 'bg-coral/20 text-coral'}">
    ${up ? '▲' : '▼'} ${Math.abs(v)}%</span>`;
};

/* --------------------------------- toast ---------------------------------- */
let toastRoot;
export function toast(message, emoji = '✅', variant = 'ok') {
  if (!toastRoot) {
    toastRoot = document.createElement('div');
    toastRoot.className = 'pointer-events-none fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 flex-col items-center gap-2';
    document.body.appendChild(toastRoot);
  }
  const el = document.createElement('div');
  el.className = `pointer-events-auto flex max-w-[92vw] items-center gap-2.5 rounded-full border-2 px-5 py-3 text-sm font-extrabold shadow-sticker ${variant === 'error' ? 'border-coral bg-coral text-white' : 'border-ink bg-white'}`;
  el.innerHTML = `<span>${emoji}</span><span></span>`;
  el.lastElementChild.textContent = message;
  el.style.animation = 'slideUp .35s cubic-bezier(.2,.8,.3,1) both';
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all .3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

/* ------------------------------ drawer / modal ----------------------------- */
export function openDrawer(html) {
  const root = $('#admin-drawer');
  const body = $('#admin-drawer-body');
  body.innerHTML = html;
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    $('#admin-drawer-backdrop', root).classList.remove('opacity-0');
    $('#admin-drawer-panel', root).classList.remove('translate-x-full');
  });
}

export function closeDrawer() {
  const root = $('#admin-drawer');
  if (!root || root.classList.contains('hidden')) return;
  root.setAttribute('aria-hidden', 'true');
  $('#admin-drawer-backdrop', root).classList.add('opacity-0');
  $('#admin-drawer-panel', root).classList.add('translate-x-full');
  document.body.style.overflow = '';
  setTimeout(() => root.classList.add('hidden'), 300);
}

export function openModal(html) {
  const root = $('#admin-modal');
  $('#admin-modal-body').innerHTML = html;
  root.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => $('#admin-modal-card', root).classList.add('scale-100'));
}
export function closeModal() {
  const root = $('#admin-modal');
  if (!root || root.classList.contains('hidden')) return;
  $('#admin-modal-card', root).classList.remove('scale-100');
  document.body.style.overflow = '';
  setTimeout(() => root.classList.add('hidden'), 180);
}

export function bindOverlayDismiss() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-drawer]')) closeDrawer();
    if (e.target.closest('[data-close-modal]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeDrawer(); closeModal(); }
  });
}

/* ----------------------------- confirm dialog ----------------------------- */
export function confirmBox(message, { confirmLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    const holder = document.createElement('div');
    holder.className = 'fixed inset-0 z-[130] grid place-items-center bg-ink/60 p-6 backdrop-blur-sm';
    holder.innerHTML = `
      <div class="w-full max-w-sm rounded-[26px] border-2 border-ink bg-white p-6 shadow-sticker" style="animation:pop .3s cubic-bezier(.2,.8,.3,1.2) both">
        <p class="text-sm font-bold leading-relaxed text-ink/75">${esc(message)}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button data-cancel class="btn-outline btn-sm">Cancel</button>
          <button data-ok class="btn-sm ${danger ? 'bg-coral text-white' : 'btn-primary'}">${esc(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(holder);
    holder.addEventListener('click', (e) => {
      if (e.target.closest('[data-ok]')) { holder.remove(); resolve(true); }
      else if (e.target.closest('[data-cancel]') || e.target === holder) { holder.remove(); resolve(false); }
    });
  });
}

/* -------------------------------- charts ---------------------------------- */
export const CHART_COLORS = {
  iris: '#7C5CFF',
  acid: '#D6FF3E',
  coral: '#FF6B5E',
  aqua: '#7CE7FF',
  butter: '#FFD84D',
  bubble: '#FF9BE1',
  ink: '#0D0D12',
  slate: '#94A3B8'
};

export const STATUS_COLORS = {
  pending: CHART_COLORS.butter,
  paid: CHART_COLORS.aqua,
  packed: CHART_COLORS.iris,
  shipped: '#6366F1',
  delivered: CHART_COLORS.acid,
  cancelled: '#CBD5E1',
  refunded: CHART_COLORS.coral
};

export function initChartDefaults() {
  if (!window.Chart) return;
  window.Chart.defaults.font.family = "'Manrope', system-ui, sans-serif";
  window.Chart.defaults.font.size = 11.5;
  window.Chart.defaults.font.weight = '600';
  window.Chart.defaults.color = 'rgba(13,13,18,0.55)';
  window.Chart.defaults.animation.duration = 600;
  window.Chart.defaults.plugins.tooltip.backgroundColor = '#0D0D12';
  window.Chart.defaults.plugins.tooltip.padding = 10;
  window.Chart.defaults.plugins.tooltip.cornerRadius = 12;
  window.Chart.defaults.plugins.tooltip.titleFont = { weight: '800', size: 12 };
  window.Chart.defaults.plugins.tooltip.displayColors = false;
}

export function verticalGradient(context, { top = 'rgba(124,92,255,0.35)', bottom = 'rgba(124,92,255,0)' } = {}) {
  const chart = context.chart;
  const { ctx, chartArea } = chart;
  if (!chartArea) return 'rgba(124,92,255,0.1)';
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

/** Destroy + recreate helper so polling updates never stack listeners. */
export const chartRegistry = new Map();
export function upsertChart(key, canvasId, config) {
  const existing = chartRegistry.get(key);
  if (existing) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { existing.destroy(); chartRegistry.delete(key); return null; }
    existing.data = config.data;
    if (config.options) existing.options = { ...existing.options, ...config.options };
    existing.update('none');
    return existing;
  }
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return null;
  const chart = new window.Chart(canvas.getContext('2d'), config);
  chartRegistry.set(key, chart);
  return chart;
}

/** Host element for a live "pulse" indicator. */
export function pulse(text) {
  return `<span class="inline-flex items-center gap-2 rounded-full bg-acid/25 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-ink">
    <span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-iris opacity-75"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-iris"></span></span>
    ${esc(text)}</span>`;
}

export { api };
