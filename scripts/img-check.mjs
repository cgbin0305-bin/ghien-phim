import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9860 + Math.floor(Math.random() * 30);
const BASE = "http://localhost:3111";
const PROFILE = `C:\\Users\\Admin\\AppData\\Local\\Temp\\cdp-img-${PORT}`;
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
  throw new Error("no chrome");
}
let id = 0; const pending = new Map(); let ws;
function send(m, p = {}, s) {
  const i = ++id;
  return new Promise((res, rej) => { pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); });
}
const u = await getWsUrl(); ws = new WebSocket(u);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
};
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
async function ev(e) {
  const { result } = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }, sessionId);
  return result.value;
}
await send("Page.navigate", { url: BASE + "/phim" }, sessionId);
await sleep(9000);
console.log("phim body:", await ev(`document.body.innerText.slice(0,300)`));
console.log("phim imgs:", await ev(`JSON.stringify(Array.from(document.querySelectorAll('img')).slice(0,4).map(i=>({src:i.currentSrc.slice(0,80), nw:i.naturalWidth})))`));
console.log("imgs:", await ev(`JSON.stringify(Array.from(document.querySelectorAll('img')).slice(0,6).map(i=>({src:i.currentSrc.slice(0,90), nw:i.naturalWidth, nh:i.naturalHeight, w:i.clientWidth, h:i.clientHeight})))`));
console.log("hydrated:", await ev(`!!document.querySelector('[data-movie-card]') || document.querySelectorAll('article').length`));

await send("Page.navigate", { url: BASE + "/phim/khong-ton-tai-123" }, sessionId);
await sleep(4000);
console.log("404 body text:", await ev(`document.body.innerText.slice(0,200)`));
console.log("404 h1:", await ev(`document.querySelector('h1')?.innerText`));

await send("Page.navigate", { url: BASE + "/xem/van-kiem-lam-ngo/tap-1" }, sessionId);
await sleep(5000);
console.log("watch ls:", await ev(`JSON.stringify(Object.keys(localStorage))`));
console.log("watch iframe:", await ev(`document.querySelectorAll('iframe').length`));

proc.kill(); process.exit(0);
