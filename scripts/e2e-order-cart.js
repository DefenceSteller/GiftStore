/**
 * E2E: placing an order empties the bag.
 *
 * Signs in a throwaway customer, adds a product on /shop, checks out through
 * all three steps (pay on delivery), lands on /order-success, and asserts the
 * per-user cart key in localStorage was cleared and the header badge reads 0.
 * Also verifies the order row exists, then restores stock and cleans up.
 *
 *   node scripts/e2e-order-cart.js
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "e2e.ordercart@confetticlub.shop";
const PASSWORD = "TestPass!2026";

function loadEnv() {
  const out = {};
  const raw = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = loadEnv();
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function supa(pathname, init = {}) {
  const res = await fetch(`${SUPA_URL}${pathname}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitFor(fn, label, timeoutMs = 30000, interval = 250) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (last) return last;
    await sleep(interval);
  }
  throw new Error(`timeout: ${label} (last=${JSON.stringify(last)})`);
}

function startChrome() {
  const userData = path.join(process.env.TEMP, "cc-e2e-ordercart");
  fs.rmSync(userData, { recursive: true, force: true });
  return spawn(CHROME, [
    "--headless=new", "--remote-debugging-port=9369", `--user-data-dir=${userData}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu",
    "--window-size=1280,900", "--no-sandbox", "about:blank",
  ], { stdio: "ignore" });
}

async function cdpTargets() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9369/json/list");
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* chrome not up yet */ }
    await sleep(500);
  }
  throw new Error("chrome CDP endpoint never came up");
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.onopen = () => {
      const send = (method, params = {}) =>
        new Promise((res, rej) => {
          const i = ++id;
          pending.set(i, { res, rej });
          ws.send(JSON.stringify({ id: i, method, params }));
        });
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) {
          const { res, rej } = pending.get(m.id);
          pending.delete(m.id);
          m.error ? rej(new Error(m.error.message)) : res(m.result);
        }
      };
      resolve({ send, close: () => ws.close() });
    };
    ws.onerror = () => reject(new Error("CDP websocket failed"));
  });
}

async function cleanup(uid, productId, originalStock) {
  // Report any non-2xx so a failed delete can never pass silently again.
  const del = async (label, pathname) => {
    const r = await supa(pathname, { method: "DELETE" });
    if (r.status < 200 || r.status >= 300) {
      console.log(`  cleanup warn: ${label} -> HTTP ${r.status} ${String(JSON.stringify(r.body)).slice(0, 160)}`);
    }
    return r;
  };
  if (productId && originalStock != null) {
    const r = await supa(`/rest/v1/products?id=eq.${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ stock: originalStock }),
    });
    if (r.status < 200 || r.status >= 300) console.log(`  cleanup warn: restore stock -> HTTP ${r.status}`);
  }
  if (uid) {
    const orders = await supa(`/rest/v1/orders?customer_id=eq.${uid}&select=id`);
    if (orders.status < 200 || orders.status >= 300) {
      console.log(`  cleanup warn: list orders -> HTTP ${orders.status} ${String(JSON.stringify(orders.body)).slice(0, 160)}`);
    }
    const ids = Array.isArray(orders.body) ? orders.body.map((o) => o.id) : [];
    if (ids.length) {
      const list = ids.join(",");
      await del("order_items", `/rest/v1/order_items?order_id=in.(${list})`);
      await del("order_events", `/rest/v1/order_events?order_id=in.(${list})`);
      await del("orders", `/rest/v1/orders?customer_id=eq.${uid}`);
    }
    await del("customers", `/rest/v1/customers?profiles_id=eq.${uid}`);
    await del("profiles", `/rest/v1/profiles?id=eq.${uid}`);
    await del("auth user", `/auth/v1/admin/users/${uid}`);
  }
}

async function main() {
  const results = [];
  const ok = (name, cond, detail = "") => {
    results.push({ name, pass: !!cond, detail });
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  };

  let uid = null;
  let productId = null;
  let originalStock = null;

  try {
    // --- 1. throwaway customer (signup trigger creates the profile row) ---
    // GoTrue ignores `?email=eq.` on this endpoint and returns EVERY user, so
    // list them all and match the email client-side — never touch another user.
    const existing = await supa(`/auth/v1/admin/users`);
    const existingId = (existing.body?.users || []).find(
      (u) => (u.email || "").toLowerCase() === EMAIL.toLowerCase()
    )?.id;
    if (existingId) {
      await cleanup(existingId);
      await sleep(800);
    }
    const created = await supa("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: EMAIL, password: PASSWORD, email_confirm: true,
        user_metadata: { name: "E2E Order Cart" },
      }),
    });
    uid = created.body?.id || created.body?.user?.id;
    ok("test customer created", !!uid, `id=${uid}`);
    if (!uid) throw new Error("could not create test user: " + JSON.stringify(created.body));
    await sleep(1300);

    // --- 2. drive Chrome ---
    const chrome = startChrome();
    let cdp;
    try {
      const wsUrl = await cdpTargets();
      cdp = await connect(wsUrl);
      await cdp.send("Page.enable");
      await cdp.send("Runtime.enable");

      const evalJs = async (expression) => {
        const r = await cdp.send("Runtime.evaluate", {
          expression, returnByValue: true,
        });
        if (r.exceptionDetails) {
          throw new Error("page exception: " + JSON.stringify(
            r.exceptionDetails.exception || r.exceptionDetails
          ));
        }
        return r.result.value;
      };

      // Sign in.
      await cdp.send("Page.navigate", { url: `${BASE}/auth/signin` });
      await waitFor(
        () => evalJs(`document.readyState === "complete" && !!document.querySelector('input[name="email"]')`),
        "sign-in page"
      );
      await evalJs(`(() => {
        const set = (sel, val) => {
          const el = document.querySelector(sel);
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        set('input[name="email"]', ${JSON.stringify(EMAIL)});
        set('input[name="password"]', ${JSON.stringify(PASSWORD)});
        document.querySelector('form button[type="submit"]').click();
        return true;
      })()`);
      await waitFor(
        () => evalJs(`location.pathname !== "/auth/signin"`),
        "redirect after sign in", 25000
      );
      await waitFor(
        async () => (await evalJs(`(window.__AUTH_USER && window.__AUTH_USER.id) || null`)) === uid,
        "client auth state", 30000
      );
      ok("signed in", true);

      // Add a product on /shop.
      await cdp.send("Page.navigate", { url: `${BASE}/shop` });
      await waitFor(
        () => evalJs(`window.__AUTH_USER !== undefined && !!document.querySelector('button')`),
        "shop page hydrated", 25000
      );
      const clicked = await evalJs(`(() => {
        const add = [...document.querySelectorAll('button')]
          .find(b => /Add/i.test(b.textContent) && !/Sold out/i.test(b.textContent));
        if (!add) return "no-add-button";
        add.click();
        return "clicked";
      })()`);
      ok("clicked Add on shop page", clicked === "clicked", clicked);
      await sleep(800);

      const before = await evalJs(`(() => {
        const key = (window.__CART_DEBUG && window.__CART_DEBUG.storageKey)
          || 'cc_cart_v2:' + ${JSON.stringify(uid)};
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        return { key, count: items.length, productId: items[0] ? items[0].id : null,
                 name: items[0] ? items[0].name : null };
      })()`);
      ok("item in the signed-in bag before checkout", before.count >= 1,
        `${before.count} item(s), key=${before.key}`);
      productId = before.productId;

      // Record stock so the order's decrement can be undone in cleanup.
      if (productId) {
        const p = await supa(`/rest/v1/products?id=eq.${productId}&select=stock`);
        originalStock = Array.isArray(p.body) && p.body.length ? p.body[0].stock : null;
      }

      // --- 3. checkout: step 1 → 2 → 3 → place order ---
      await cdp.send("Page.navigate", { url: `${BASE}/checkout` });
      await waitFor(
        () => evalJs(`!!document.getElementById('c-first') &&
          window.__CART_DEBUG && window.__CART_DEBUG.ready === true`),
        "checkout page with hydrated cart", 25000
      );
      await evalJs(`(() => {
        const set = (sel, val) => {
          const el = document.querySelector(sel);
          if (!el) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        set('#c-first', 'E2E');
        set('#c-last', 'Shopper');
        set('#c-email', ${JSON.stringify(EMAIL)});
        set('#c-phone', '5550100100');
        set('#a-address1', '1 Test Street');
        set('#a-city', 'Testville');
        set('#a-state', 'TS');
        set('#a-zip', '12345');
        return true;
      })()`);
      await evalJs(`(() => {
        [...document.querySelectorAll('button')]
          .find(b => /Continue to payment/.test(b.textContent)).click();
        return true;
      })()`);
      await waitFor(
        () => evalJs(`!document.querySelector('[data-step="2"]').classList.contains('hidden')`),
        "step 2 (payment)", 10000
      );
      ok("advanced to payment step", true);

      // Pay on delivery — skips card fields entirely.
      await evalJs(`document.querySelector('input[name="payment"][value="cod"]').click()`);
      await evalJs(`(() => {
        [...document.querySelectorAll('button')]
          .find(b => /Review order/.test(b.textContent)).click();
        return true;
      })()`);
      await waitFor(
        () => evalJs(`!document.querySelector('[data-step="3"]').classList.contains('hidden')`),
        "step 3 (review)", 10000
      );
      ok("advanced to review step", true);

      await evalJs(`(() => {
        [...document.querySelectorAll('button')]
          .find(b => /Place order/.test(b.textContent)).click();
        return true;
      })()`);

      // Server action writes the order + items, decrements stock, redirects.
      await waitFor(
        () => evalJs(`location.pathname === '/order-success' &&
          location.search.includes('orderNumber=')`),
        "landed on order-success", 45000
      );
      const orderNumber = await evalJs(
        `new URLSearchParams(location.search).get('orderNumber')`
      );
      ok("order placed and redirected to confirmation", true, orderNumber);

      // --- 4. the fix: bag must be empty now ---
      const emptied = await waitFor(async () => {
        const raw = await evalJs(`(() => {
          const key = (window.__CART_DEBUG && window.__CART_DEBUG.storageKey)
            || 'cc_cart_v2:' + ${JSON.stringify(uid)};
          return localStorage.getItem(key);
        })()`);
        return raw === "[]" ? raw : null;
      }, "cart cleared in localStorage", 10000);
      ok("per-user cart key cleared after order", emptied === "[]", `localStorage=${emptied}`);

      const badge = await evalJs(`(() => {
        const spans = document.querySelectorAll('button[aria-label="Open bag"] span');
        return spans.length ? spans[spans.length - 1].textContent.trim() : null;
      })()`);
      ok("header bag badge reads 0", badge === "0", `badge=${badge}`);

      const orderCount = await evalJs(`(window.__AUTH_USER ? window.__AUTH_USER.id : null)`);
      const orders = await supa(`/rest/v1/orders?customer_id=eq.${uid}&select=order_number,status`);
      ok("order row exists in DB",
        Array.isArray(orders.body) && orders.body.length >= 1,
        JSON.stringify(orders.body));
      void orderCount;
    } finally {
      if (cdp) cdp.close();
      chrome.kill();
    }
  } finally {
    // --- 5. cleanup: restore stock, remove order + user ---
    await cleanup(uid, productId, originalStock);
    console.log("cleaned up test data");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error("E2E ERROR:", e);
  process.exit(1);
});
