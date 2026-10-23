// Connects to a running server with the official MCP client and exercises every tool.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.MCP_URL ?? "http://localhost:3000/mcp";
const headers: Record<string, string> = process.env.MCP_AUTH_TOKEN ? { Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN}` } : {};
const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const call = async (name: string, args: Record<string, unknown>) => {
  const r = (await client.callTool({ name, arguments: args })) as { content: { text: string }[] };
  console.log(`> ${name}(${JSON.stringify(args)})\n  ${r.content[0].text}`);
};

console.log("tools:", (await client.listTools()).tools.map((t) => t.name).join(", "));
await call("add_pantry_item", { name: "eggs", quantity: 6, expires: day(1) });
await call("add_pantry_item", { name: "spinach", quantity: 1, unit: "bag", expires: day(2) });
await call("add_pantry_item", { name: "rice", quantity: 2, unit: "kg" });
await call("pantry_summary", {});
await call("check_expiring", { days: 3 });
await call("suggest_recipe", { meal: "dinner" });
await call("use_pantry_item", { name: "spinach", quantity: 1 });
await call("manage_shopping_list", { action: "read" });
await client.close();
