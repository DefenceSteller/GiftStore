/**
 * End-to-end test: signed-out visitor clicks "Add" -> sign-in popout ->
 * sign in -> return to the same page -> product auto-added to that user's
 * private cart -> profile visible in the DB (admin customers source).
 *
 * Creates a throwaway customer, runs Chrome headless over CDP, then deletes
 * the customer again.
 *
 *   node scripts/e2e-auth-cart.js
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "e2e.cart.test@confetticlub.shop";
const PASSWORD = "TestPass!2026";
const PROFILE = "e2e-cart-profile";

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
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(fn, label, timeoutMs = 20000, interval = 250) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (last) return last;
    await sleep(interval);
  }
  throw new Error(`timeout waiting for: ${label} (last=${JSON.stringify(last)})`);
}

function startChrome() {
  const userData = path.join(process.env.TEMP, "cc-e2e-profile");
  fs.rmSync(userData, { recursive: true, force: true });
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--remote-debugging-port=9333",
      `--user-data-dir=${userData}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--window-size=1280,900",
      "--no-sandbox",
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  return proc;
}

async function cdpTargets() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9333/json/list");
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* chrome not up yet */
    }
    await sleep(500);
  }
  throw new Error("chrome CDP endpoint never came up");
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const on = [];
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
        } else if (m.method) {
          on.forEach((fn) => fn(m));
        }
      };
      resolve({ send, on, close: () => ws.close() });
    };
    ws.onerror = () => reject(new Error("CDP websocket failed"));
  });
}

async function main() {
  const results = [];
  const ok = (name, cond, detail = "") => {
    results.push({ name, pass: !!cond, detail });
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  };

  // --- 1. throwaway customer (trigger should create the profile row) ---
  // Idempotent: delete any leftover user from a previous run first, then
  // create fresh so the signup trigger runs and the profile row is new.
  const existing = await supa(`/auth/v1/admin/users?email=eq.${EMAIL}`);
  const existingId = existing.body?.users?.[0]?.id;
  if (existingId) {
    await supa(`/rest/v1/profiles?id=eq.${existingId}`, { method: "DELETE" });
    await supa(`/auth/v1/admin/users/${existingId}`, { method: "DELETE" });
    await sleep(800);
  }

  let created = await supa("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: "E2E Cart Test" },
    }),
  });
  const uid = created.body?.id || created.body?.user?.id;
  ok("test customer created in Supabase Auth", !!uid, `id=${uid}`);
  if (!uid) throw new Error("could not create test user: " + JSON.stringify(created.body));
  await sleep(1200);

  const profile = await supa(`/rest/v1/profiles?id=eq.${uid}&select=id,email,role`);
  ok(
    "signup trigger created profiles row (admin customers source)",
    Array.isArray(profile.body) && profile.body.length === 1,
    JSON.stringify(profile.body)
  );

  // --- 2. drive Chrome ---
  const chrome = startChrome();
  let cdp;
  try {
    const wsUrl = await cdpTargets();
    cdp = await connect(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const evalJs = async (expression, awaitPromise = false) => {
      const r = await cdp.send("Runtime.evaluate", {
        expression,
        awaitPromise,
        returnByValue: true,
      });
      if (r.exceptionDetails) {
        throw new Error(
          "page exception: " + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails)
        );
      }
      return r.result.value;
    };

    // Signed out first: pick a product page.
    await cdp.send("Page.navigate", { url: `${BASE}/shop` });
    await waitFor(
      () => evalJs(`document.readyState === "complete" && !!document.querySelector('a[href^="/product/"]')`),
      "shop page product links"
    );
    const productUrl = await evalJs(
      `document.querySelector('a[href^="/product/"]').getAttribute('href')`
    );
    await cdp.send("Page.navigate", { url: BASE + productUrl });
    await waitFor(
      () => evalJs(`!!document.querySelector('button')`),
      "product page"
    );
    // Wait for React to mount so click handlers are attached. AuthProvider
    // sets window.__AUTH_USER on first render; that's our hydration signal.
    await waitFor(
      () => evalJs(`(window.__AUTH_USER !== undefined)`),
      "React hydration (window.__AUTH_USER set)",
      20000
    );

    // Confirm we start signed out.
    const signedOut = await evalJs(
      `!document.cookie.includes("sb-") || document.body.innerText.includes("Sign in")`
    );
    ok("visitor starts signed out", signedOut);

    // Click the add-to-bag button.
    const clicked = await evalJs(`(() => {
      const btns = [...document.querySelectorAll('button')];
      const add = btns.find(b => /Add/i.test(b.textContent) && !/Sold out/i.test(b.textContent));
      if (!add) return "no-add-button";
      add.click();
      return "clicked";
    })()`);
    ok("clicked Add while signed out", clicked === "clicked", clicked);

    // The sign-in popout should appear instead of the bag.
    await sleep(600);
    const popoutText = await evalJs(`document.body.innerText`);
    ok(
      "sign-in popout shown (no bag opened)",
      popoutText.includes("Psst") && popoutText.includes("your bag is waiting"),
      popoutText.includes("your bag is waiting") ? "popout text found" : popoutText.slice(0, 200)
    );
    const bagNotOpen = await evalJs(
      `!document.body.innerText.includes("Checkout securely")`
    );
    ok("cart drawer did NOT open for signed-out click", bagNotOpen);
    const stashed = await evalJs(`sessionStorage.getItem("cc_pending_add")`);
    ok("pending product stashed for post-sign-in add", !!stashed, stashed ? "has payload" : "empty");

    // Follow the popout's sign-in link.
    await evalJs(`(() => {
      const a = [...document.querySelectorAll('a')].find(x => /Sign in to continue/.test(x.textContent));
      a.click(); return true;
    })()`, false);
    await waitFor(
      () => evalJs(`location.pathname === "/auth/signin"`),
      "navigated to /auth/signin"
    );
    const nextParam = await evalJs(
      `new URLSearchParams(location.search).get("next")`
    );
    ok(
      "sign-in page carries the return destination",
      nextParam === productUrl,
      String(nextParam)
    );

    // Submit credentials.
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
      document.querySelector('form button[type="submit"], form button').click();
      return true;
    })()`);

    // Force a full reload to make sure Next.js reads the updated session cookie.
    await waitFor(
      () => evalJs(`location.pathname !== "/auth/signin"`),
      "redirect after sign in",
      25000
    );
    const landedOn = await evalJs(`location.pathname + location.search`);
    ok("returned to the page they started on", landedOn === productUrl, landedOn);

    // The stashed product should land in THEIR cart, drawer open.
    // Wait for the client AuthProvider to reconcile with the session cookie
    // (sign-in redirects soft-navigate back to the same path, so the cookie
    // appears without any pathname/auth event — polling handles that).
    await waitFor(
      () => evalJs(`(window.__AUTH_USER ? window.__AUTH_USER.id : null)`),
      "client auth state reconciles with session cookie",
      15000
    );
    const cartState = await evalJs(`(() => {
      const keys = Object.keys(localStorage);
      const cartKey = keys.find(k => k.startsWith('cc_cart_v2'));
      const raw = cartKey ? localStorage.getItem(cartKey) : '[]';
      const items = JSON.parse(raw);
      return { cartKey, count: items.length, names: items.map(i => i.name), keys };
    })()`);
    ok(
      "cart key is scoped to this user",
      !!cartState.cartKey && cartState.cartKey !== "cc_cart_v2" && cartState.cartKey.includes(uid),
      cartState.cartKey
    );
    ok(
      "stashed product auto-added after sign-in",
      cartState.count > 0,
      JSON.stringify(cartState.names)
    );
    const drawerOpen = await evalJs(
      `document.body.innerText.includes("Checkout securely") || !!document.querySelector('[aria-label="Close bag"]')`
    );
    ok("bag drawer opened after auto-add", drawerOpen);

    // Signed in on the page (header should reflect it).
    const headerSignedIn = await evalJs(
      `document.body.innerText.includes("Sign out")`
    );
    ok("header now shows signed-in state", headerSignedIn);

    // A second, different browser profile must not see this bag:
    // simulate by reading the guest key (must be absent/empty for this user).
    const guestCart = await evalJs(`localStorage.getItem("cc_cart_v2") || "[]"`);
    ok(
      "guest cart untouched by the signed-in cart",
      guestCart === "[]",
      guestCart.slice(0, 80)
    );

    // Session cookie present?
    const cookies = await evalJs(`document.cookie`);
    ok("session cookie set", /sb-/.test(cookies), cookies.slice(0, 60));
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  // --- 3. cleanup ---
  await supa(`/rest/v1/profiles?id=eq.${uid}`, { method: "DELETE" });
  await supa(`/auth/v1/admin/users/${uid}`, { method: "DELETE" });
  console.log("cleaned up test customer");

  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error("E2E ERROR:", e);
  process.exit(1);
});