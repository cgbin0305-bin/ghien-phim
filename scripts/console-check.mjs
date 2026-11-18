import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9950 + Math.floor(Math.random() * 40);
const BASE = process.env.BASE_URL || "http://localhost:3111";
const PROFILE = `C:\\Users\\Admin\\AppData\\Local\\Temp\\cdp-console-${PORT}`;

const proc = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--headless=new", "--disable-gpu",
  "--no-first-run", "--no-default-browser-check", `--user-data-dir=${PROFILE}`, "about:blank",
], { stdio: "ignore" });

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === "page");
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("chrome did not start");
}
let id = 0; const pending = new Map(); let ws;
function send(method, params = {}, sessionId) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
  });
}
const wsUrl = await getWsUrl();
ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
const logs = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.consoleAPICalled") {
    logs.push("CONSOLE " + m.params.type + ": " + m.params.args.map(a => a.value ?? a.description ?? a.type).join(" "));
  }
  if (m.method === "Runtime.exceptionThrown") {
    logs.push("EXCEPTION: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  }
  if (m.method === "Log.entryAdded") {
    logs.push("LOG " + m.params.entry.level + ": " + m.params.entry.text);
  }
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Log.enable", {}, sessionId);
await send("Network.enable", {}, sessionId);

const failed = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Network.loadingFailed") failed.push("FAILED " + m.params.errorText);
  if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
    failed.push("HTTP " + m.params.response.status + " " + m.params.response.url);
  }
});

await send("Page.navigate", { url: BASE + "/phim/van-kiem-lam-ngo" }, sessionId);
await sleep(6000);
console.log("--- logs ---");
console.log(logs.join("\n") || "(none)");
console.log("--- failed requests ---");
console.log(failed.join("\n") || "(none)");
const { result } = await send("Runtime.evaluate", {
  expression: `JSON.stringify({
    reactRoot: !!document.querySelector('[data-reactroot]'),
    nextData: !!document.querySelector('#__NEXT_DATA__'),
    scripts: document.querySelectorAll('script').length,
    hydrationMarker: Object.keys(window).filter(k => k.startsWith('__next')).slice(0,10),
    bodyClass: document.body.className.slice(0,120),
  })`, returnByValue: true,
}, sessionId);
console.log("--- page state ---");
console.log(result.value);

proc.kill(); process.exit(0);
