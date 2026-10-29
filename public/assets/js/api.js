/** Tiny API + formatting helpers shared by every storefront page. */
export const API_BASE = '/api';

export async function api(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    signal
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data && data.code;
    err.fields = data && data.fields;
    throw err;
  }
  return data;
}

export const money = (cents, currency = 'PKR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100).replace('$', 'Rs');

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function timeAgo(ts) {
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

export function formatDate(ts, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return new Date(ts).toLocaleDateString('en-US', opts);
}

export function formatDateTime(ts) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
