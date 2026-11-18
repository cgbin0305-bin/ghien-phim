// Capture full-page screenshots at given widths for visual review.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = Number(process.env.CDP_PORT || 9400 + Math.floor(Math.random() * 400));
const PROFILE = `C:\\Users\\Admin\\AppData\\Local\\Temp\\cdp-shot-${PORT}`;
const BASE = process.env.BASE_URL || "http://localhost:3111";
const OUT = process.env.OUT_DIR || "C:\\Users\\Admin\\gheien-phim\\.shots";
const WIDTH = Number(process.env.WIDTH || 375);
const PATHS = (process.env.PATHS || "/,/phim,/phim/van-kiem-lam-ngo,/xem/van-kiem-lam-ngo/tap-1,/lich-chieu,/bai-viet").split(",");

const proc = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--headless=new", "--disable-gpu",
  "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${PROFILE}`, "about:blank",
], { stdio: "ignore" });

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
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

const wsUrl = await getWsUrl();
ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.onopen = res; ws.onerror = rej;
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  };
});

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 700 }, sessionId);

for (const path of PATHS) {
  await send("Page.navigate", { url: BASE + path }, sessionId);
  await sleep(2500);
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId);
  const name = path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
  const file = `${OUT}\\${WIDTH}-${name}.png`;
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log("saved", file);
}
proc.kill();
process.exit(0);
