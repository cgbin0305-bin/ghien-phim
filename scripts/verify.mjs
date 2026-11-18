import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9600 + Math.floor(Math.random() * 40);
const BASE = "http://localhost:3111";
const PROFILE = `C:\\Users\\Admin\\AppData\\Local\\Temp\\cdp-v-${PORT}`;
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
async function goto(p, w = 6000) { await send("Page.navigate", { url: BASE + p }, sessionId); await sleep(w); }

await goto("/phim");
console.log("body:", await ev(`document.body.innerText.slice(0,400)`));
console.log("cards:", await ev(`document.querySelectorAll('article').length`));
console.log("movieLinks:", await ev(`document.querySelectorAll('a[href^="/phim/"]').length`));
console.log("pageLinks:", await ev(`JSON.stringify(Array.from(document.querySelectorAll('a[href*="page="]')).map(a=>a.getAttribute('href')))`));
console.log("imgLoaded:", await ev(`JSON.stringify(Array.from(document.querySelectorAll('img')).slice(0,3).map(i=>i.naturalWidth))`));

// Live search typing
console.log("liveSearch:", await ev(`(async () => {
  const i = document.querySelector('#movie-search');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  setter.call(i,'Kiếm'); i.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,1800));
  return location.search + ' || shows=' + (document.body.innerText.match(/Hiển thị[^\\n]*/)?.[0]||'') + ' || cards=' + document.querySelectorAll('article').length;
})()`));

await goto("/phim?genre=co-trang");
console.log("genre cards:", await ev(`document.querySelectorAll('article').length`));

await goto("/phim?page=2");
console.log("page2 shows:", await ev(`document.body.innerText.match(/Hiển thị[^\\n]*/)?.[0]`));
console.log("page2 current:", await ev(`document.querySelector('[aria-current="page"]')?.textContent`));

await goto("/xem/van-kiem-lam-ngo/tap-1", 7000);
console.log("watch ls:", await ev(`JSON.stringify(Object.keys(localStorage))`));
await goto("/", 6000);
console.log("home continue:", await ev(`document.body.innerText.includes("Tiếp tục xem")`));

proc.kill(); process.exit(0);
