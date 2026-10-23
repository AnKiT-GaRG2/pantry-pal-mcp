// Connects to a running server with the official MCP client and exercises the tools.
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.MCP_URL ?? "http://localhost:3000/mcp";

async function connect(household: string) {
  const headers: Record<string, string> = { "x-household-id": household };
  if (process.env.MCP_AUTH_TOKEN) headers.Authorization = `Bearer ${process.env.MCP_AUTH_TOKEN}`;
  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));
  return client;
}

const run = Date.now().toString(36); // fresh households every run
const a = await connect(`a-${run}`);
const b = await connect(`b-${run}`);

const call = async (c: Client, name: string, args: Record<string, unknown>) => {
  const r = (await c.callTool({ name, arguments: args })) as { content: { text: string }[] };
  const text = r.content[0].text;
  console.log(`> ${name}(${JSON.stringify(args)})\n  ${text}`);
  return text;
};

console.log("tools:", (await a.listTools()).tools.map((t) => t.name).join(", "));
console.log("prompts:", (await a.listPrompts()).prompts.map((p) => p.name).join(", "));

assert.match(await call(a, "add_pantry_item", { name: "eggs", quantity: 6, expires: "tomorrow" }), /They expire tomorrow/);
assert.match(await call(a, "add_pantry_item", { name: "spinach", unit: "bag", expires: "in 2 days" }), /expires in 2 days/);
assert.match(await call(a, "add_pantry_item", { name: "milk" }), /assume it expires in 7 days/); // estimated shelf life
assert.match(await call(a, "add_pantry_item", { name: "rice", quantity: 2, unit: "kg", expires: "someday" }), /didn't understand/);
assert.match(await call(a, "check_expiring", { days: 3 }), /eggs expire tomorrow\. spinach expires in 2 days/);
await call(a, "suggest_recipe", { meal: "dinner", diet: "vegetarian" });
await call(a, "plan_meals", { days: 2 });
assert.match(await call(a, "use_pantry_item", { name: "spinach" }), /shopping list/);
assert.match(await call(a, "waste_report", {}), /100 percent/);
assert.match(await call(a, "use_pantry_item", { name: "Egg" }), /5 left/, "singular matches plural stock");
assert.match(await call(b, "pantry_summary", {}), /empty/, "households must be isolated");

const res = await a.readResource({ uri: "pantry://inventory" });
assert.equal(JSON.parse(res.contents[0].text as string).pantry.length, 2)
const api = await (await fetch(new URL(`/api/state?household=a-${run}`, url))).json() as { pantry: { daysLeft: number }[] };
assert.equal(api.pantry.length, 2, "dashboard API sees the same state");;
console.log("\nAll smoke checks passed.");
await a.close();
await b.close();
