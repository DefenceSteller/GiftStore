/**
 * Screenshots the auth pages (signin / signup / reset-password) at desktop
 * and mobile widths so the redesign can be eyeballed.
 *   node scripts/shot-auth.js
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.join(__dirname, "..", ".shots");
const PAGES = ["signin", "signup", "reset-password"];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function startChrome() {
  const userData = path.join(process.env.TEMP, "cc-shot-auth");
  fs.rmSync(userData, { recursive: true, force: true });
  return spawn(CHROME, [
    "--headless=new", "--remote-debugging-port=9366", `--user-data-dir=${userData}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu",
    "--window-size=1440,900", "--no-sandbox", "about:blank",
  ], { stdio: "ignore" });
}

async function cdpTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9366/json/list");
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

async function shoot(send, name, width, height, file) {
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 600,
  });
  await send("Page.navigate", { url: `${BASE}/auth/${name}` });
  await sleep(4500); // fonts + hydrate (origin state) + animate-pop settle
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  console.log(`saved ${path.basename(file)} (${width}x${height})`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = startChrome();
  let conn;
  try {
    const ws = await cdpTarget();
    conn = await connect(ws);
    const { send } = conn;
    await send("Page.enable");
    for (const p of PAGES) {
      await shoot(send, p, 1440, 900, path.join(OUT, `${p}-desktop.png`));
      await shoot(send, p, 390, 844, path.join(OUT, `${p}-mobile.png`));
    }
  } finally {
    if (conn) conn.close();
    chrome.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
