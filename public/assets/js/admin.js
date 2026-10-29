// ============================================================================
// Confetti Club — admin shell: auth, hash router, live polling, overview view.
// ============================================================================
import { money, esc, timeAgo } from './api.js';
import {
  store, $, $$, statusPill, STATUS_COLORS,
  toast, bindOverlayDismiss, confirmBox, upsertChart, initChartDefaults,
  verticalGradient, countUp, deltaBadge, pulse, initials, api,
} from './admin-ui.js';
import {
  renderOrders, renderProducts, renderCustomers, renderAnalytics, renderSettings,
  clearViewTimers, openOrder,
} from './admin-views.js';

const VIEW_META = {
  overview: { title: 'Overview', sub: 'Live store performance' },
  orders: { title: 'Orders', sub: 'Fulfillment pipeline & logistics' },
  products: { title: 'Products', sub: 'Catalog, pricing & inventory' },
  customers: { title: 'Customers', sub: 'Everyone who has shopped with us' },
  analytics: { title: 'Analytics', sub: 'Traffic, sources & conversion' },
  settings: { title: 'Settings', sub: 'Store configuration & security' },
};

let statsTimer = null;
let liveTimer = null;

/* --------------------------------- boot ---------------------------------- */
async function boot() {
  try {
    const me = await api('/admin/me');
    store.admin = me.admin;
  } catch (_) {
    window.location.replace('/admin/login');
    return;
  }

  $('#admin-name').textContent = store.admin.name || 'Store Owner';
  $('#admin-email').textContent = store.admin.email || '';
  $('#admin-avatar').textContent = initials(store.admin.name);

  initChartDefaults();
  bindOverlayDismiss();
  bindShell();
  window.addEventListener('hashchange', route);
  route();
  startPolling();
}

/* -------------------------------- router --------------------------------- */
function route() {
  const key = (window.location.hash.replace(/^#\/?/, '') || 'overview');
  const view = VIEW_META[key] ? key : 'overview';
  const first = store.view !== view;
  store.view = view;
  clearViewTimers();

  $$('[data-view]').forEach((el) => { el.hidden = el.dataset.view !== view; });
  $$('#admin-nav [data-nav]').forEach((el) => {
    const active = el.dataset.nav === view;
    el.classList.toggle('bg-white/[0.07]', active);
    el.classList.toggle('text-white', active);
    el.classList.toggle('text-white/60', !active);
  });

  $('#page-title').textContent = VIEW_META[view].title;
  $('#page-sub').textContent = VIEW_META[view].sub;
  document.title = `${VIEW_META[view].title} · Confetti Club Admin`;
  closeMobileSidebar();

  const render = ROUTES[view];
  Promise.resolve()
    .then(() => render())
    .catch((err) => {
      console.error(err);
      toast(err.message || 'Could not load view', '⚠️', 'error');
    });
  if (first) window.scrollTo({ top: 0 });
}

const ROUTES = {
  overview: renderOverview,
  orders: renderOrders,
  products: renderProducts,
  customers: renderCustomers,
  analytics: renderAnalytics,
  settings: renderSettings,
};

/* ------------------------------ shell bindings --------------------------- */
function closeMobileSidebar() {
  $('#sidebar').classList.add('-translate-x-full');
  $('#sidebar-backdrop').classList.add('hidden');
}

function bindShell() {
  $('#menu-btn').addEventListener('click', () => {
    $('#sidebar').classList.toggle('-translate-x-full');
    $('#sidebar-backdrop').classList.toggle('hidden');
  });
  $('#sidebar-backdrop').addEventListener('click', closeMobileSidebar);

  $('#logout-btn').addEventListener('click', async () => {
    const ok = await confirmBox('Sign out of the admin panel?', { confirmLabel: 'Sign out' });
    if (!ok) return;
    try { await api('/admin/logout', { method: 'POST', body: {} }); } catch (_) { /* already out */ }
    window.location.href = '/admin/login';
  });

  $('#refresh-btn').addEventListener('click', async () => {
    const btn = $('#refresh-btn');
    btn.disabled = true;
    btn.textContent = '⟳ Syncing…';
    try {
      await Promise.all([refreshStats({ force: true }), refreshLive()]);
      const view = ROUTES[store.view];
      if (store.view !== 'overview') await view();
      toast('Dashboard synced', '🔄');
    } catch (err) {
      toast(err.message, '⚠️', 'error');
    }
    btn.disabled = false;
    btn.textContent = '⟳ Refresh';
  });
}

/* -------------------------------- polling -------------------------------- */
function startPolling() {
  clearInterval(statsTimer);
  clearInterval(liveTimer);
  statsTimer = setInterval(() => refreshStats(), 5000);
  liveTimer = setInterval(() => refreshLive(), 3000);
  refreshStats({ force: true });
  refreshLive();
}

async function refreshStats({ force = false } = {}) {
  if (!force && document.hidden) return;
  try {
    const s = await api('/admin/stats');
    store.stats = s;
    paintStats(s);
    $('#updated-at').textContent = `Updated ${new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })}`;
    if (store.onStats) store.onStats(s);
  } catch (err) {
    if (err.status === 401) window.location.replace('/admin/login');
  }
}

async function refreshLive() {
  try {
    const l = await api('/admin/stats/live');
    store.live = l;
    paintLive(l);
  } catch (err) {
    if (err.status === 401) window.location.replace('/admin/login');
  }
}

/* ------------------------------ live painting ---------------------------- */
function paintLive(l) {
  const openBadge = $('#nav-orders-badge');
  $('#side-visitors').textContent = l.activeVisitors ?? 0;
  $('#side-rpm').textContent = l.requestsPerMinute ?? 0;
  $('#side-views').textContent = l.pageviews5m ?? 0;
  $('#top-live').innerHTML = (l.activeVisitors ?? 0) > 0
    ? pulse(`${l.activeVisitors} shopping now`)
    : '<span class="status-pill bg-ink/8 text-ink/50">quiet right now</span>';

  const openCount = store.stats ? store.stats.kpi.openOrders : null;
  if (openCount != null) {
    openBadge.classList.toggle('hidden', !openCount);
    openBadge.textContent = openCount;
  }

  if (store.view === 'overview') paintRightNow(l);
}

function paintRightNow(l) {
  const host = $('#live-panel');
  if (!host) return;
  const cells = [
    ['Active visitors', l.activeVisitors ?? 0],
    ['Requests / min', l.requestsPerMinute ?? 0],
    ['Views · 5m', l.pageviews5m ?? 0],
    ['Orders today', l.ordersToday ?? 0],
    ['Revenue today', money(l.revenueTodayCents || 0)],
    ['p95 latency', `${l.system ? l.system.p95LatencyMs : 0} ms`],
  ];
  const feed = (l.recent || []).slice(0, 5);
  host.innerHTML = `
    <div class="grid grid-cols-2 gap-2.5">
      ${cells.map(([label, value]) => `
        <div class="rounded-2xl border border-ink/8 bg-mist/60 px-3.5 py-3">
          <p class="text-[10px] font-black uppercase tracking-wider text-ink/45">${label}</p>
          <p class="mt-1 font-display text-xl font-extrabold tabular">${value}</p>
        </div>`).join('')}
    </div>
    <div class="mt-4 border-t border-ink/8 pt-3">
      <p class="text-[10px] font-black uppercase tracking-wider text-ink/45">Activity stream</p>
      <ul class="mt-2 space-y-1.5">
        ${feed.length ? feed.map((e) => `
          <li class="flex items-start gap-2 text-[12px] font-bold leading-snug text-ink/70">
            <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${e.activity ? 'bg-iris' : 'bg-acid'}"></span>
            <span class="min-w-0 flex-1 truncate">${esc(e.activity ? e.path : `${e.type} · ${e.path}`)}</span>
            <span class="shrink-0 text-ink/35">${timeAgo(e.at)}</span>
          </li>`).join('') : '<li class="text-xs font-bold text-ink/40">No events yet.</li>'}
      </ul>
    </div>`;
}

/* ------------------------------ stats painting --------------------------- */
const KPI_DEFS = (kpi) => [
  {
    id: 'kpi-revenue', label: 'Revenue today', icon: '💸',
    value: kpi.revenueToday, format: (v) => money(Math.round(v)),
    delta: kpi.revenueDelta, note: `${money(kpi.revenue30d)} last 30 days`,
  },
  {
    id: 'kpi-orders', label: 'Orders today', icon: '📦',
    value: kpi.ordersToday, format: (v) => Math.round(v).toLocaleString(),
    delta: kpi.ordersDelta, note: `${kpi.openOrders} still open`,
  },
  {
    id: 'kpi-aov', label: 'Avg order value', icon: '🧾',
    value: kpi.aovToday, format: (v) => money(Math.round(v)),
    delta: kpi.aovDelta, note: `${kpi.orders30d} orders in 30 days`,
  },
  {
    id: 'kpi-conv', label: 'Conversion', icon: '✨',
    value: kpi.conversionRate, format: (v) => `${v.toFixed(1)}%`,
    delta: kpi.conversionDelta, note: `${Number(kpi.visitsToday).toLocaleString()} visits today`,
  },
];

function paintStats(s) {
  if (!s || !s.kpi) return;
  const kpi = s.kpi;
  const grid = $('#kpi-grid');

  if (!grid.dataset.built) {
    grid.innerHTML = KPI_DEFS(kpi).map((d) => `
      <div class="card p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] font-black uppercase tracking-wider text-ink/45">${d.label}</p>
            <p class="mt-2 font-display text-3xl font-extrabold tabular" id="${d.id}" data-value="0">—</p>
          </div>
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">${d.icon}</span>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/45">
          <span id="${d.id}-delta"></span>
          <span id="${d.id}-note"></span>
        </div>
      </div>`).join('');
    grid.dataset.built = '1';
  }

  KPI_DEFS(kpi).forEach((d) => {
    countUp(document.getElementById(d.id), d.value, { format: d.format });
    document.getElementById(`${d.id}-delta`).innerHTML = deltaBadge(d.delta);
    document.getElementById(`${d.id}-note`).textContent = d.note;
  });

  paintOverviewCharts(s);
  paintRecentOrders(s);
  paintTopProducts(s);
  paintLowStock(s);
}

function paintOverviewCharts(s) {
  if (store.view !== 'overview') return;
  const revenue = s.charts.revenue || [];

  upsertChart('ov-revenue', 'chart-revenue', {
    type: 'line',
    data: {
      labels: revenue.map((d) => d.label),
      datasets: [
        {
          label: 'Revenue', data: revenue.map((d) => d.revenue),
          borderColor: STATUS_COLORS.packed, borderWidth: 2.5, tension: 0.35,
          pointRadius: 0, pointHoverRadius: 5, fill: true,
          backgroundColor: (ctx) => verticalGradient(ctx.chart, {
            top: 'rgba(124,92,255,0.32)', bottom: 'rgba(124,92,255,0)',
          }),
        },
        {
          label: 'Orders', data: revenue.map((d) => d.orders), yAxisID: 'y1',
          borderColor: '#8ACD2A', backgroundColor: 'transparent', borderWidth: 2,
          borderDash: [5, 5], tension: 0.35, pointRadius: 0,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => (c.datasetIndex === 0
              ? ` Revenue ${money(c.parsed.y)}`
              : ` ${c.parsed.y} orders`),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8A8A99', maxTicksLimit: 7, font: { size: 10.5 } } },
        y: { grid: { color: 'rgba(13,13,18,0.06)' }, ticks: { color: '#8A8A99', callback: (v) => `$${v}` } },
        y1: { display: false, position: 'right', grid: { display: false }, beginAtZero: true },
      },
    },
  });

  const status = s.charts.status || [];
  const total = status.reduce((sum, r) => sum + r.count, 0);
  $('#status-total').textContent = total.toLocaleString();

  upsertChart('ov-status', 'chart-status', {
    type: 'doughnut',
    data: {
      labels: status.map((r) => r.label),
      datasets: [{
        data: status.map((r) => r.count),
        backgroundColor: status.map((r) => STATUS_COLORS[r.status] || '#CBD5E1'),
        borderColor: '#FFFFFF', borderWidth: 3, hoverOffset: 6,
      }],
    },
    options: {
      maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } },
    },
  });

  $('#status-list').innerHTML = status.map((r) => `
    <div class="flex items-center gap-2.5 text-sm">
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:${STATUS_COLORS[r.status] || '#CBD5E1'}"></span>
      <span class="flex-1 font-bold text-ink/70">${r.label}</span>
      <span class="font-black tabular">${r.count}</span>
      <span class="w-20 text-right text-xs font-bold text-ink/45 tabular">${money(r.revenue)}</span>
    </div>`).join('');
}

function paintRecentOrders(s) {
  const host = $('#recent-orders');
  if (!host) return;
  const rows = s.recentOrders || [];
  host.innerHTML = rows.length ? rows.map((o) => `
    <button type="button" data-order="${o.id}" class="flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 text-left transition hover:border-ink/8 hover:bg-mist/60">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist text-lg">${o.emoji || '🎁'}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-extrabold text-ink">${esc(o.name)}</span>
        <span class="block font-mono text-[11px] font-bold text-ink/45">#${esc(o.orderNumber)} · ${o.itemCount} item${o.itemCount === 1 ? '' : 's'}</span>
      </span>
      <span class="hidden text-right sm:block">
        <span class="block text-sm font-black tabular">${money(o.totalCents)}</span>
        <span class="block text-[11px] font-bold text-ink/40">${timeAgo(o.placedAt)}</span>
      </span>
      ${statusPill(o.status)}
    </button>`).join('')
    : '<p class="py-4 text-sm font-bold text-ink/45">No orders yet — the confetti is waiting.</p>';

  host.querySelectorAll('[data-order]').forEach((btn) => {
    btn.addEventListener('click', () => openOrder(Number(btn.dataset.order)));
  });
}

function paintTopProducts(s) {
  const host = $('#top-products');
  if (!host) return;
  const items = s.charts.topProducts || [];
  const max = Math.max(1, ...items.map((p) => p.revenue));
  host.innerHTML = items.length ? items.map((p) => `
    <div>
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <span class="min-w-0 truncate font-extrabold text-ink">${esc(p.name)}</span>
        <span class="shrink-0 font-black tabular">${money(p.revenue)}</span>
      </div>
      <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/8">
        <div class="h-full rounded-full bg-gradient-to-r from-iris to-bubble transition-all duration-700" style="width:${Math.round((p.revenue / max) * 100)}%"></div>
      </div>
      <p class="mt-1 text-[11px] font-bold text-ink/45">${p.qty} sold</p>
    </div>`).join('')
    : '<p class="text-sm font-bold text-ink/45">No sales in the last 30 days.</p>';
}

function paintLowStock(s) {
  const host = $('#low-stock');
  if (!host) return;
  const items = s.lowStockList || [];
  host.innerHTML = items.length ? items.map((p) => `
    <div class="flex items-center gap-3 rounded-2xl border border-ink/8 px-3 py-2.5">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist text-lg">${p.emoji || '🎁'}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-extrabold text-ink">${esc(p.name)}</span>
        <span class="block text-[11px] font-bold text-ink/45">${money(p.priceCents)} · SKU ${esc(p.slug)}</span>
      </span>
      <span class="status-pill ${p.stock <= 3 ? 'bg-coral text-white' : 'bg-butter text-ink'}">${p.stock} left</span>
    </div>`).join('')
    : '<p class="text-sm font-bold text-ink/45">Every shelf is happy. Nothing below 7 units.</p>';
}

/* ------------------------------- overview view --------------------------- */
async function renderOverview() {
  await Promise.all([refreshStats({ force: true }), refreshLive()]);
  paintStats(store.stats);
  paintLive(store.live);
}

/* --------------------------------- start --------------------------------- */
boot();
