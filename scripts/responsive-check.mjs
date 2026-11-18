// Minimal CDP client: launches Chrome headless, checks pages at multiple widths.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const BASE = process.env.BASE_URL || "http://localhost:3111";
const WIDTHS = (process.env.WIDTHS || "375,768,1440").split(",").map(Number);
const PATHS = (process.env.PATHS || "/,/phim,/lich-chieu,/bai-viet,/admin/phim").split(",");

const proc = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--user-data-dir=C:\\Users\\Admin\\AppData\\Local\\Temp\\cdp-profile",
  "about:blank",
], { stdio: "ignore" });

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("chrome did not start");
}

let id = 0;
const pending = new Map();
let ws;

function send(method, params = {}, sessionId) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
  });
}

async function connect() {
  const url = await getWsUrl();
  ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  };
}

async function main() {
  await connect();
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);

  const problems = [];
  for (const path of PATHS) {
    for (const width of WIDTHS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width, height: 900, deviceScaleFactor: 1, mobile: width < 700,
      }, sessionId);
      await send("Page.navigate", { url: BASE + path }, sessionId);
      await sleep(2200);
      const { result } = await send("Runtime.evaluate", {
        expression: `JSON.stringify({
          url: location.pathname,
          title: document.title,
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
          bodySw: document.body.scrollWidth,
          brokenLinks: Array.from(document.querySelectorAll('a[href]')).filter(a => !a.getAttribute('href') || a.getAttribute('href') === '#').length,
          overflowEls: Array.from(document.querySelectorAll('body *')).filter(el => {
            const r = el.getBoundingClientRect();
            if (r.width <= 0) return false;
            if (r.right <= document.documentElement.clientWidth + 1 && r.left >= -1) return false;
            // Ignore elements living inside a horizontally scrollable ancestor (intentional scroll strips).
            let p = el.parentElement;
            while (p && p !== document.body) {
              const ov = getComputedStyle(p).overflowX;
              if (ov === 'auto' || ov === 'scroll') return false;
              p = p.parentElement;
            }
            return true;
          }).slice(0, 5).map(el => el.tagName + '.' + (el.className && el.className.baseVal === undefined ? String(el.className).split(' ').slice(0,4).join('.') : '')),
          tinyTargets: Array.from(document.querySelectorAll('a,button,input,select,textarea')).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.height < 24 && !el.closest('nav,footer');
          }).slice(0, 5).map(el => el.tagName + ':' + (el.textContent||'').trim().slice(0,20))
        })`,
        returnByValue: true,
      }, sessionId);
      const data = JSON.parse(result.value);
      const overflow = data.sw > data.cw + 1;
      const bad = overflow || data.brokenLinks > 0 || data.overflowEls.length > 0;
      if (bad) problems.push({ path, width, ...data });
      console.log(`${bad ? "FAIL" : "ok  "} ${path} @${width} sw=${data.sw} cw=${data.cw} broken=${data.brokenLinks} tiny=${JSON.stringify(data.tinyTargets)}`);
      if (data.overflowEls.length) console.log("   overflow:", data.overflowEls.join(" | "));
    }
  }
  console.log("\n=== problems:", problems.length);
  proc.kill();
  process.exit(0);
}

main().catch((e) => { console.error(e); proc.kill(); process.exit(1); });
