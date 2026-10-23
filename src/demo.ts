// Plays the demo conversation against a running server, one sentence at a time, so you can record the dashboard.
//   npm run dev            (one terminal)
//   npm run demo           (another; open the printed dashboard URL first, then press Enter)
import readline from "node:readline/promises";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const household = process.env.HOUSEHOLD ?? `demo-${Date.now().toString(36).slice(-4)}`;
const delay = Number(process.env.DEMO_DELAY_MS ?? 5000);
const token = process.env.MCP_AUTH_TOKEN ? `?token=${encodeURIComponent(process.env.MCP_AUTH_TOKEN)}` : "";

const SCRIPT = [
  "I bought six eggs that expire Sunday",
  "I bought some spinach that expires tomorrow",
  "I bought two liters of milk",
  "What should I eat first?",
  "I used two eggs",
  "I cooked the spinach",
  "I bought yogurt that expired yesterday",
  "Throw out what's expired",
  "How much food have I wasted?",
  "What can I make for dinner?",
  "Add bread to my shopping list",
  "What's in my pantry?",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

console.log(`Open the dashboard:  ${base}/?household=${household}${token ? "&token=…" : ""}\n`);
if (!process.env.DEMO_AUTOSTART) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("Start recording, then press Enter to begin. ");
  rl.close();
}

let failed = 0;
for (const text of SCRIPT) {
  console.log(`\nYou:         ${text}`);
  const res = await fetch(`${base}/api/say${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ household, text }) });
  const j = (await res.json()) as { understood: boolean; reply: string };
  if (!res.ok || !j.understood) failed++;
  console.log(`Pantry Pal:  ${j.reply}`);
  await sleep(delay);
}
console.log(failed ? `\n${failed} line(s) were not understood.` : "\nDone.");
process.exit(failed ? 1 : 0);
