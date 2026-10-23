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
test("dashboard is served as HTML at /", async () => {
  const res = await fetch(`${open}/`);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await res.text(), /<html/i);
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
test("auth: /api/state requires the token", async () => {
  assert.equal((await fetch(`${locked}/api/state`)).status, 401);
  assert.equal((await fetch(`${locked}/api/state?token=s3cret`)).status, 200);
});
test("auth: /health stays public", async () => assert.equal((await fetch(`${locked}/health`)).status, 200));
