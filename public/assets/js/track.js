/** Lightweight analytics + liveness beacons for the admin dashboard. */
async function send(path, payload) {
  try {
    await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'same-origin',
      keepalive: true
    });
  } catch (_) { /* analytics must never break the page */ }
}

export function track(type, path = location.pathname + location.search) {
  return send('/api/track/event', { type, path, referrer: document.referrer || '' });
}

export function trackPurchase(orderNumber, path = '/checkout') {
  return send('/api/track/event', { type: 'pageview', path, referrer: document.referrer || '' })
    .then(() => orderNumber);
}

function beat() {
  return send('/api/track/heartbeat', { path: location.pathname });
}

/** Keeps the "active visitors" counter in the admin dashboard truthful. */
export function startHeartbeat(intervalMs = 25000) {
  beat();
  const timer = setInterval(() => { if (!document.hidden) beat(); }, intervalMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
  window.addEventListener('pagehide', () => clearInterval(timer));
  return timer;
}
