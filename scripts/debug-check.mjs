import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9800 + Math.floor(Math.random() * 150);
const BASE = process.env.BASE_URL || "http://localhost:3111";
const PROFILE = `C:\\Users\\Admin\\AppData\\Local\\Temp\\cdp-dbg-${PORT}`;

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
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
async function evalJs(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (exceptionDetails) return "EXC: " + exceptionDetails.text + " " + (exceptionDetails.exception?.description || "");
  return result.value;
}
async function goto(path, wait = 3000) { await send("Page.navigate", { url: BASE + path }, sessionId); await sleep(wait); }

// A) watch page + localStorage
await goto("/xem/van-kiem-lam-ngo/tap-1", 5000);
console.log("A) url:", await evalJs("location.href"));
console.log("A) ls keys:", await evalJs("JSON.stringify(Object.keys(localStorage))"));
console.log("A) has history note:", await evalJs(`document.body.innerText.includes("Đã ghi nhớ tập này")`));
console.log("A) h1:", await evalJs(`document.querySelector('h1')?.innerText`));

// B) movie filter input (correct id)
await goto("/phim", 3000);
console.log("B) movie-search present:", await evalJs(`!!document.querySelector('#movie-search')`));
console.log("B) filter search result:", await evalJs(`(async () => {
  const i = document.querySelector('#movie-search');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  setter.call(i,'Kiếm'); i.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,1500));
  return location.search + ' || cards=' + document.querySelectorAll('a[href^="/phim/"]').length + ' || ' + document.body.innerText.match(/Hiển thị[^\\n]*/)?.[0];
})()`));

// C) pagination: total movies
await goto("/phim", 3000);
console.log("C) count line:", await evalJs(`document.body.innerText.match(/Hiển thị[^\\n]*/)?.[0]`));
console.log("C) pagination html:", await evalJs(`document.body.innerHTML.includes('page=')`));

// D) 404 page
await goto("/phim/khong-ton-tai-123", 3000);
console.log("D) status-ish text:", await evalJs(`document.body.innerText.slice(0,300)`));
console.log("D) title:", await evalJs("document.title"));

proc.kill(); process.exit(0);
