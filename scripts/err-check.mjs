import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9700 + Math.floor(Math.random() * 50);
const BASE = "http://localhost:3111";
const PROFILE = `C:\\Users\\Admin\\AppData\\Local\\Temp\\cdp-err-${PORT}`;
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
let id = 0; const pending = new Map(); let ws; const logs = [];
function send(m, p = {}, s) {
  const i = ++id;
  return new Promise((res, rej) => { pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); });
}
const u = await getWsUrl(); ws = new WebSocket(u);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.consoleAPICalled") logs.push("CONSOLE " + m.params.type + ": " + m.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a.preview?.properties?.map(p=>p.name+"="+p.value) ?? a.type)).join(" "));
  if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === "Log.entryAdded") logs.push("LOG " + m.params.entry.level + ": " + m.params.entry.text);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
};
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Log.enable", {}, sessionId);
await send("Page.navigate", { url: BASE + (process.env.PAGE || "/phim") }, sessionId);
await sleep(9000);
console.log(logs.join("\n") || "(no logs)");
proc.kill(); process.exit(0);
