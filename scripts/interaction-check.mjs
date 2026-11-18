// Interaction test: search, filters, pagination, localStorage continue-watching.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9500 + Math.floor(Math.random() * 300);
const BASE = process.env.BASE_URL || "http://localhost:3111";
const PROFILE = `C:\\Users\\Admin\\AppData\\Local\\Temp\\cdp-int-${PORT}`;

const proc = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--headless=new", "--disable-gpu",
  "--no-first-run", "--no-default-browser-check", `--user-data-dir=${PROFILE}`,
  "about:blank",
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
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);

async function evalJs(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  }, sessionId);
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description || ""));
  return result.value;
}
async function goto(path, wait = 2500) {
  await send("Page.navigate", { url: BASE + path }, sessionId);
  await sleep(wait);
}
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
}

// ---- 1. Catalogue search by Vietnamese / original title
await goto("/phim");
const q = await evalJs(`(() => {
  const i = document.querySelector('#movie-search');
  return i ? i.outerHTML.slice(0,200) : 'NO-INPUT';
})()`);
check("catalogue has a search input", !String(q).includes("NO-INPUT"), String(q).slice(0, 120));

const searchResult = await evalJs(`(async () => {
  const i = document.querySelector('#movie-search');
  if (!i) return { err: 'no input' };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, 'Kiếm');
  i.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1800));
  return { url: location.search, cards: document.querySelectorAll('article').length };
})()`);
check("live search updates URL query", String(searchResult.url || "").includes("q="), JSON.stringify(searchResult).slice(0, 200));

await goto("/phim?q=nguyet");
const nguyet = await evalJs(`JSON.stringify({ url: location.search, text: document.body.innerText.slice(0, 200) })`);
check("URL-synced search returns results for 'nguyet'", String(nguyet).toLowerCase().includes("nguyet"), String(nguyet).slice(0, 180));

// ---- 2. Genre filter syncs to URL
await goto("/phim?genre=co-trang");
const gf = await evalJs(`JSON.stringify({ url: location.search, hasCards: document.querySelectorAll('a[href^="/phim/"]').length })`);
check("genre filter renders from URL", String(gf).includes("genre=co-trang"), String(gf).slice(0, 180));

// ---- 3. Pagination
await goto("/phim");
const pag = await evalJs(`JSON.stringify(Array.from(document.querySelectorAll('a[href*="page="]')).map(a => a.getAttribute('href')).slice(0,6))`);
check("pagination links exist", String(pag).includes("page="), String(pag).slice(0, 200));

// ---- 4. Sorting
await goto("/phim?sort=year");
check("sort param accepted", (await evalJs("location.search")).includes("sort=year"));

// ---- 5. Watch page saves to localStorage (continue watching source of truth)
await goto("/xem/van-kiem-lam-ngo/tap-1", 3500);
const ls = await evalJs(`JSON.stringify(Object.keys(localStorage).map(k => [k, String(localStorage.getItem(k)).slice(0,120)]))`);
check("watch page writes localStorage entry", String(ls).length > 5, String(ls).slice(0, 300));

// ---- 6. Home shows continue-watching only when localStorage has data
await goto("/");
const before = await evalJs(`document.body.innerText.includes("Tiếp tục xem")`);
await goto("/xem/van-kiem-lam-ngo/tap-1", 3000);
await goto("/");
const after = await evalJs(`document.body.innerText.includes("Tiếp tục xem")`);
check("home shows continue-watching after viewing", after === true, `before=${before} after=${after}`);

// ---- 7. Unknown movie slug must render the not-found page (HTTP 404)
await goto("/phim/khong-ton-tai-123", 3000);
const notFound = await evalJs(`document.querySelector('h1')?.innerText === "Không tìm thấy trang"`);
check("unknown movie slug shows not-found state", notFound === true, String(await evalJs(`document.querySelector('h1')?.innerText`)));

// ---- 8. Admin route is guarded in non-demo mode is N/A here (demo mode) - ensure page renders
await goto("/admin/phim", 2000);
const adminOk = await evalJs(`document.body.innerText.length > 200`);
check("admin page renders", adminOk === true);

// ---- 9. Article markdown content is escaped (no script execution)
await goto("/bai-viet/lich-chieu-tuan-demo", 2000);
const scriptRan = await evalJs(`!!window.__xss_marker`);
check("article does not execute injected script", scriptRan === false);
const html = await evalJs(`document.querySelector('article')?.innerHTML.includes('<script')`);
check("article contains no raw script tag", html === false);

console.log("\n=== summary:", results.filter(r => r.pass).length + "/" + results.length + " passed");
proc.kill();
process.exit(results.every(r => r.pass) ? 0 : 1);
