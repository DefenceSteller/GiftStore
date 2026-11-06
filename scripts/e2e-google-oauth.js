/**
 * E2E: Google OAuth button + callback route.
 *   node scripts\e2e-google-oauth.js
 *
 * Verifies:
 *   1. "Continue with Google" button exists on /auth/signin
 *   2. "Continue with Google" button exists on /auth/signup
 *   3. Clicking it starts the OAuth redirect to Supabase/Google
 *   4. /auth/callback handles a missing code gracefully (redirects to signin)
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PORT = 9367;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(fn, label, timeoutMs = 20000, interval = 250) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    try { last = await fn(); } catch {}
    if (last) return last;
    await sleep(interval);
  }
  throw new Error(`timeout: ${label} (last=${JSON.stringify(last)})`);
}
function startChrome() {
  const userData = path.join(process.env.TEMP, "cc-e2e-google2");
  fs.rmSync(userData, { recursive: true, force: true });
  return spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${userData}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu",
    "--window-size=1400,1000", "--no-sandbox", "about:blank",
  ], { stdio: "ignore" });
}
async function cdpTargets() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
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

async function main() {
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
    const evalJs = async (expression) => {
      const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
      if (r.exceptionDetails) throw new Error("page exception: " + JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };

    // TEST 1: Google button on /auth/signin
    await cdp.send("Page.navigate", { url: `${BASE}/auth/signin` });
    await waitFor(() => evalJs(`document.body.innerText.includes("Continue with Google") ? true : null`), "signin page loaded");
    ok("Google button on signin page", true);

    // TEST 2: Clicking it redirects to Supabase/Google OAuth
    const beforeUrl = await evalJs(`location.href`);
    await evalJs(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Continue with Google'));
      btn.click();
      return true;
    })()`);
    // OAuth redirects are slow in headless; wait generously then check.
    await sleep(8000);
    let afterUrl = beforeUrl;
    try { afterUrl = await evalJs(`location.href`); } catch {}
    const redirected = afterUrl && !afterUrl.includes("localhost:3000/auth/signin");
    ok("Google button redirects to OAuth provider", !!redirected, `before=${beforeUrl} after=${afterUrl}`);

    // TEST 3: /auth/callback handles missing code gracefully
    await cdp.send("Page.navigate", { url: `${BASE}/auth/callback` });
    await sleep(2000);
    const p3 = await evalJs(`location.pathname + location.search`);
    ok("callback with no code -> /auth/signin", p3.startsWith("/auth/signin"), p3);

    // TEST 4: Google button on /auth/signup
    await cdp.send("Page.navigate", { url: `${BASE}/auth/signup` });
    await waitFor(() => evalJs(`document.body.innerText.includes("Continue with Google") ? true : null`), "signup page loaded");
    ok("Google button on signup page", true);

    const passed = results.filter((r) => r.pass).length;
    console.log(`\n${passed}/${results.length} checks passed`);
    if (passed !== results.length) process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
  }
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });