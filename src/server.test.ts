import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const procs: ChildProcess[] = [];

async function start(port: number, env: Record<string, string> = {}) {
  const p = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    env: { ...process.env, PORT: String(port), PANTRY_DIR: mkdtempSync(path.join(tmpdir(), "pantry-http-")), ...env },
    stdio: "ignore",
  });
  procs.push(p);
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/health`)).ok) return `http://localhost:${port}`;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
}

const HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const rpc = (method: string, params: unknown = {}, id = 1) => JSON.stringify({ jsonrpc: "2.0", id, method, params });
const init = rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "t", version: "1" } });
const call = (name: string, args: unknown) => rpc("tools/call", { name, arguments: args }, 2);

let open = "";
let locked = "";
before(async () => {
  [open, locked] = await Promise.all([start(3801), start(3802, { MCP_AUTH_TOKEN: "s3cret" })]);
});
after(() => procs.forEach((p) => p.kill()));

test("health endpoint", async () => assert.deepEqual(await (await fetch(`${open}/health`)).json(), { ok: true }));
test("initialize negotiates the 2025-11-25 protocol", async () => {
  const res = await fetch(`${open}/mcp`, { method: "POST", headers: HEADERS, body: init });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /"protocolVersion":"2025-11-25"/);
});
test("response uses streamable HTTP event framing", async () => {
  const res = await fetch(`${open}/mcp`, { method: "POST", headers: HEADERS, body: init });
  assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/);
});
test("GET /mcp is not allowed", async () => assert.equal((await fetch(`${open}/mcp`)).status, 405));
test("DELETE /mcp is not allowed", async () => assert.equal((await fetch(`${open}/mcp`, { method: "DELETE" })).status, 405));
test("tools/list over HTTP returns nine tools", async () => {
  const res = await fetch(`${open}/mcp`, { method: "POST", headers: HEADERS, body: rpc("tools/list") });
  assert.equal((await res.text()).match(/"name":"[a-z_]+","title"/g)?.length, 9);
});
test("tools/call over HTTP changes state visible on /api/state", async () => {
  const h = { ...HEADERS, "x-household-id": "http-a" };
  const res = await fetch(`${open}/mcp`, { method: "POST", headers: h, body: call("add_pantry_item", { name: "eggs", quantity: 6 }) });
  assert.match(await res.text(), /Added 6 eggs/);
  const state = await (await fetch(`${open}/api/state?household=http-a`)).json();
  assert.equal(state.pantry[0].name, "egg");
  assert.equal(typeof state.pantry[0].daysLeft, "number");
  assert.equal(state.pantry[0].spoken, "eggs");
});
test("x-household-id header isolates households", async () => {
  const h = { ...HEADERS, "x-household-id": "http-b" };
  await fetch(`${open}/mcp`, { method: "POST", headers: h, body: call("add_pantry_item", { name: "milk", unit: "liters" }) });
  const other = await (await fetch(`${open}/api/state?household=http-c`)).json();
  assert.deepEqual(other.pantry, []);
});
test("default household is used without a header", async () => {
  await fetch(`${open}/mcp`, { method: "POST", headers: HEADERS, body: call("manage_shopping_list", { action: "add", item: "salt" }) });
  assert.deepEqual((await (await fetch(`${open}/api/state`)).json()).shopping, ["salt"]);
});
test("api/state reports the latest action and the spoken reply", async () => {
  const h = { ...HEADERS, "x-household-id": "http-act" };
  await fetch(`${open}/mcp`, { method: "POST", headers: h, body: call("add_pantry_item", { name: "eggs", quantity: 6 }) });
  await fetch(`${open}/mcp`, { method: "POST", headers: h, body: call("pantry_summary", {}) });
  const { activity } = await (await fetch(`${open}/api/state?household=http-act`)).json();
  assert.equal(activity.length, 2);
  assert.equal(activity[0].tool, "pantry_summary", "newest first");
  assert.equal(activity[0].reply, "You have 6 eggs.");
  assert.equal(activity[1].tool, "add_pantry_item");
  assert.equal(activity[1].args.quantity, 6);
});
test("api/state keeps action history per household", async () => {
  assert.deepEqual((await (await fetch(`${open}/api/state?household=http-quiet`)).json()).activity, []);
});
test("api/state exposes the last recipe with its source", async () => {
  const h = { ...HEADERS, "x-household-id": "http-rec" };
  await fetch(`${open}/mcp`, { method: "POST", headers: h, body: call("add_pantry_item", { name: "rice" }) });
  assert.equal((await (await fetch(`${open}/api/state?household=http-rec`)).json()).recipe, null);
  await fetch(`${open}/mcp`, { method: "POST", headers: h, body: call("suggest_recipe", { meal: "lunch" }) });
  const { recipe } = await (await fetch(`${open}/api/state?household=http-rec`)).json();
  assert.equal(recipe.kind, "Recipe idea");
  assert.equal(recipe.source, "local");
  assert.match(recipe.text, /^For lunch/);
});
test("action history is capped", async () => {
  const h = { ...HEADERS, "x-household-id": "http-cap" };
  for (let i = 0; i < 12; i++) await fetch(`${open}/mcp`, { method: "POST", headers: h, body: call("pantry_summary", {}) });
  assert.equal((await (await fetch(`${open}/api/state?household=http-cap`)).json()).activity.length, 8);
});
const sayTo = (base: string, household: string, text: string, query = "", headers: Record<string, string> = {}) =>
  fetch(`${base}/api/say${query}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ household, text }) });

test("api/say turns a sentence into a tool call and returns the spoken reply", async () => {
  const res = await sayTo(open, "http-say", "I bought six eggs that expire tomorrow");
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.understood, true);
  assert.equal(j.tool, "add_pantry_item");
  assert.equal(j.reply, "Added 6 eggs to your pantry. They expire tomorrow.");
  const state = await (await fetch(`${open}/api/state?household=http-say`)).json();
  assert.equal(state.pantry[0].name, "egg");
  assert.equal(state.activity[0].heard, "I bought six eggs that expire tomorrow");
});
test("api/say answers unrecognised sentences with help", async () => {
  const j = await (await sayTo(open, "http-say2", "sing me a song")).json();
  assert.equal(j.understood, false);
  assert.match(j.reply, /didn't catch that/);
});
test("api/say tolerates a missing body", async () => {
  const res = await fetch(`${open}/api/say`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).understood, false);
});
test("api/say requires the token when one is set", async () => {
  assert.equal((await sayTo(locked, "x", "what is in my pantry")).status, 401);
  assert.equal((await sayTo(locked, "x", "what is in my pantry", "?token=s3cret")).status, 200);
  assert.equal((await sayTo(locked, "x", "what is in my pantry", "", { authorization: "Bearer s3cret" })).status, 200);
});
test("dashboard has the simulator, mic button and its label", async () => {
  const html = await (await fetch(`${open}/`)).text();
  for (const part of ['id="mic"', 'id="say"', "Alexa+ simulator", "not a real Alexa", "/api/say"]) assert.ok(html.includes(part), part);
});
test("dashboard is served as HTML at /", async () => {
  const res = await fetch(`${open}/`);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  const html = await res.text();
  assert.match(html, /<html/i);
  for (const panel of ["Eat first", "Last Alexa+ action", "Cooking idea", "Shopping list"]) assert.ok(html.includes(panel), panel);
});
test("unauthenticated server accepts requests without a token", async () => assert.equal((await fetch(`${open}/api/state`)).status, 200));

test("auth: missing token is rejected with 401", async () => {
  const res = await fetch(`${locked}/mcp`, { method: "POST", headers: HEADERS, body: init });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.message, "Unauthorized");
});
test("auth: wrong token is rejected", async () => {
  const res = await fetch(`${locked}/mcp`, { method: "POST", headers: { ...HEADERS, authorization: "Bearer nope" }, body: init });
  assert.equal(res.status, 401);
});
test("auth: bearer token is accepted", async () => {
  const res = await fetch(`${locked}/mcp`, { method: "POST", headers: { ...HEADERS, authorization: "Bearer s3cret" }, body: init });
  assert.equal(res.status, 200);
});
test("auth: /mcp does not accept the token in the query string", async () => {
  const res = await fetch(`${locked}/mcp?token=s3cret`, { method: "POST", headers: HEADERS, body: init });
  assert.equal(res.status, 401);
});
test("auth: /api/state requires the token", async () => {
  assert.equal((await fetch(`${locked}/api/state`)).status, 401);
  assert.equal((await fetch(`${locked}/api/state?token=s3cret`)).status, 200);
});
test("auth: /health stays public", async () => assert.equal((await fetch(`${locked}/health`)).status, 200));
