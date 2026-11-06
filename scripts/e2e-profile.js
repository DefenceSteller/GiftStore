/**
 * E2E: profile page.
 *   node scripts/e2e-profile.js
 *
 * Creates a throwaway customer + customer record + 2 orders, drives Chrome
 * headless over CDP to verify the /profile flow and design, then cleans up.
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "e2e.profile.test@confetticlub.shop";
const PASSWORD = "TestPass!2026";
const NAME = "E2E Profile Test";

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
  const userData = path.join(process.env.TEMP, "cc-e2e-profilepage");
  fs.rmSync(userData, { recursive: true, force: true });
  return spawn(CHROME, [
    "--headless=new", "--remote-debugging-port=9355", `--user-data-dir=${userData}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu",
    "--window-size=1400,1200", "--no-sandbox", "about:blank",
  ], { stdio: "ignore" });
}
async function cdpTargets() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9355/json/list");
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
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

async function setup() {
  // Idempotent: remove leftovers from a prior run.
  const existing = await supa(`/auth/v1/admin/users?email=eq.${EMAIL}`);
  const uid0 = existing.body?.users?.[0]?.id;
  if (uid0) {
    await supa(`/rest/v1/orders?customer_id=eq.${uid0}`, { method: "DELETE" });
    await supa(`/rest/v1/customers?profiles_id=eq.${uid0}`, { method: "DELETE" });
    await supa(`/rest/v1/profiles?id=eq.${uid0}`, { method: "DELETE" });
    await supa(`/auth/v1/admin/users/${uid0}`, { method: "DELETE" });
    await sleep(800);
  }

  const created = await supa("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: EMAIL, password: PASSWORD, email_confirm: true,
      user_metadata: { name: NAME },
    }),
  });
  const uid = created.body?.id || created.body?.user?.id;
  if (!uid) throw new Error("could not create test user: " + JSON.stringify(created.body));
  await sleep(1300); // let the signup trigger create the profiles row

  await supa("/rest/v1/customers", {
    method: "POST",
    body: JSON.stringify({
      profiles_id: uid, email: EMAIL, name: NAME,
      phone: "+1 555 0100", city: "Testville",
    }),
  });

  const mkOrder = (n, status, total, items, placed) => ({
    order_number: n, customer_id: uid, email: EMAIL, name: NAME,
    address1: "1 Test Street", city: "Testville", state: "TS",
    postal_code: "12345", country: "US",
    subtotal_cents: total, total_cents: total, item_count: items,
    payment_method: "card", status, placed_at: placed,
  });
  await supa("/rest/v1/orders", {
    method: "POST",
    body: JSON.stringify([
      mkOrder("CC-PRF0001", "delivered", 5250, 2, "2026-03-10T10:00:00Z"),
      mkOrder("CC-PRF0002", "shipped", 3000, 1, "2026-04-02T15:30:00Z"),
    ]),
  });
  return uid;
}

async function cleanup(uid) {
  await supa(`/rest/v1/orders?customer_id=eq.${uid}`, { method: "DELETE" });
  await supa(`/rest/v1/customers?profiles_id=eq.${uid}`, { method: "DELETE" });
  await supa(`/rest/v1/profiles?id=eq.${uid}`, { method: "DELETE" });
  await supa(`/auth/v1/admin/users/${uid}`, { method: "DELETE" });
}

async function main() {
  const uid = await setup();
  console.log("setup ok, uid=" + uid);
  const results = [];
  const ok = (name, cond, detail = "") => {
    results.push({ name, pass: !!cond });
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  };

  const chrome = startChrome();
  let cdp;
  try {
    const wsUrl = await cdpTargets();
    cdp = await connect(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    const evalJs = async (expression, awaitPromise = false) => {
      const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true });
      if (r.exceptionDetails) throw new Error("page exception: " + JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };

    // TEST 1: signed-out /profile -> /auth/signin?next=/profile
    await cdp.send("Page.navigate", { url: `${BASE}/profile` });
    await sleep(2500);
    const p1 = await evalJs(`location.pathname + location.search`);
    ok("signed-out /profile redirects to sign-in", p1.startsWith("/auth/signin"), p1);

    // TEST 2: sign in -> /profile
    await evalJs(`(() => {
      const set = (sel, val) => {
        const el = document.querySelector(sel);
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
        s.call(el, val);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
      };
      set('input[name="email"]', ${JSON.stringify(EMAIL)});
      set('input[name="password"]', ${JSON.stringify(PASSWORD)});
      document.querySelector('form button[type="submit"], form button').click();
      return true;
    })()`);
    const p2 = await waitFor(
      () => evalJs(`location.pathname === "/profile" ? location.pathname : null`),
      "sign-in -> /profile"
    );
    ok("after sign-in lands on /profile", p2 === "/profile", p2);
    await sleep(3000);

    // TEST 3: identity hero shows name + email
    const hasName = await evalJs(`document.body.innerText.includes(${JSON.stringify(NAME)})`);
    ok("profile shows customer name", hasName);
    const hasEmail = await evalJs(`document.body.innerText.includes(${JSON.stringify(EMAIL)})`);
    ok("profile shows email", hasEmail);

    // TEST 4: order history with both order numbers
    const hasOrdersHeading = await evalJs(`document.body.innerText.includes("Order history")`);
    ok("Order history section present", hasOrdersHeading);
    const hasO1 = await evalJs(`document.body.innerText.includes("CC-PRF0001")`);
    const hasO2 = await evalJs(`document.body.innerText.includes("CC-PRF0002")`);
    ok("both orders listed", hasO1 && hasO2, `o1=${hasO1} o2=${hasO2}`);

    // TEST 5: status badges + stats
    const hasDelivered = await evalJs(`document.body.innerText.includes("Delivered")`);
    const hasShipped = await evalJs(`document.body.innerText.includes("Shipped")`);
    ok("status badges render", hasDelivered && hasShipped, `d=${hasDelivered} s=${hasShipped}`);
    const hasStats = await evalJs(
      `(() => { const t = document.body.innerText.toUpperCase(); return t.includes("TOTAL ORDERS") && t.includes("TOTAL SPENT") && t.includes("ITEMS GIFTED"); })()`
    );
    ok("stats cards render", hasStats);

    // TEST 6: navbar profile button present and links to /profile
    const btn = await evalJs(`(() => {
      const a = document.querySelector('a[href="/profile"]');
      return a ? a.getAttribute('aria-label') || a.innerText : null;
    })()`);
    ok("navbar profile button present", !!btn, `label=${btn}`);

    // TEST 7: account details sidebar
    const hasDetails = await evalJs(
      `document.body.innerText.includes("Account details") && document.body.innerText.includes("Member since")`
    );
    ok("account details sidebar renders", hasDetails);

    // Screenshot for visual/design verification
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const shotPath = path.join(process.env.TEMP, "cc-profile.png");
    fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
    console.log("screenshot: " + shotPath);

    const passed = results.filter((r) => r.pass).length;
    console.log(`\n${passed}/${results.length} checks passed`);
    if (passed !== results.length) process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
    await cleanup(uid);
    console.log("cleanup done");
  }
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
