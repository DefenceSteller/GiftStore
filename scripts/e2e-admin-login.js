/**
 * E2E: admin login flow (your exact scenario).
 *   node scripts/e2e-admin-login.js
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = "admin@confetticlub.shop";
const ADMIN_PASSWORD = "ChangeMe!2026";
const PORT = 9356;

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
  const userData = path.join(process.env.TEMP, "cc-e2e-adminlogin");
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

    // TEST 1: signed-out /admin -> /admin/login
    await cdp.send("Page.navigate", { url: `${BASE}/admin` });
    await sleep(3000);
    const p1 = await evalJs(`location.pathname`);
    ok("signed-out /admin -> /admin/login", p1 === "/admin/login", p1);

    // TEST 2: no create-account link on admin login
    const noCreate = await evalJs(
      `!document.body.innerHTML.includes("Create account")`
    );
    ok("admin login has no create-account link", noCreate);

    // TEST 3: enter admin creds -> /admin dashboard
    await evalJs(`(() => {
      const set = (sel, val) => {
        const el = document.querySelector(sel);
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
        s.call(el, val);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
      };
      set('input[name="email"]', ${JSON.stringify(ADMIN_EMAIL)});
      set('input[name="password"]', ${JSON.stringify(ADMIN_PASSWORD)});
      document.querySelector('form button[type="submit"], form button').click();
      return true;
    })()`);
    const p3 = await waitFor(
      () => evalJs(`location.pathname === "/admin" ? location.pathname : null`),
      "admin login -> /admin"
    );
    ok("admin credentials land on /admin", p3 === "/admin", p3);

    // TEST 4: dashboard renders (stats) + no error message
    await sleep(4000);
    const dash = await evalJs(
      `(() => { const t = document.body.innerText; return t.includes("Revenue") || t.includes("Orders") || t.includes("Total"); })()`
    );
    ok("admin dashboard renders", dash);
    const noErr = await evalJs(
      `!document.body.innerText.toLowerCase().includes("invalid login credentials") && !document.body.innerText.toLowerCase().includes("does not have admin access")`
    );
    ok("no login error shown", noErr);

    // Screenshot
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const shotPath = path.join(process.env.TEMP, "cc-admin-login.png");
    fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
    console.log("screenshot: " + shotPath);

    const passed = results.filter((r) => r.pass).length;
    console.log(`\n${passed}/${results.length} checks passed`);
    if (passed !== results.length) process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
  }
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
