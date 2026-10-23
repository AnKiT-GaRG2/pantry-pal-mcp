import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./mcp.js";
import { withState } from "./store.js";
import { daysUntil } from "./dates.js";
import { lastRecipe, recentActions } from "./activity.js";
import { say } from "./say.js";
import { spokenName } from "./names.js";
import { DASHBOARD_HTML } from "./dashboard.js";

const app = express();
app.use(express.json());

// Optional bearer token so a publicly exposed endpoint isn't open to everyone.
const TOKEN = process.env.MCP_AUTH_TOKEN;

// /mcp accepts the token only in the Authorization header, so it never lands in URLs or access logs.
const authorizedHeader = (req: express.Request) => !TOKEN || req.headers.authorization === `Bearer ${TOKEN}`;
// The browser dashboard can't set headers, so /api/state also accepts ?token=.
const authorized = (req: express.Request) => authorizedHeader(req) || req.query.token === TOKEN;

app.post("/mcp", async (req, res) => {
  if (!authorizedHeader(req)) {
    res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
    return;
  }
  // Each household gets its own pantry, keyed by the x-household-id header.
  const household = String(req.headers["x-household-id"] ?? "default");
  // Stateless mode: a fresh server + transport per request.
  const server = createServer(household);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const notAllowed = (_req: express.Request, res: express.Response) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
};
app.get("/mcp", notAllowed);
app.delete("/mcp", notAllowed);

// Live read-only dashboard, handy for showing what the voice commands changed.
app.get("/", (_req, res) => void res.type("html").send(DASHBOARD_HTML));
app.get("/api/state", async (req, res) => {
  if (!authorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const household = String(req.query.household ?? "default");
  const state = await withState(household, (s) => s);
  res.json({ ...state, activity: recentActions(household), recipe: lastRecipe(household), pantry: state.pantry.map((i) => ({ ...i, spoken: spokenName(i.name, i.quantity, i.unit), daysLeft: i.expires ? daysUntil(i.expires) : null })) });
});

// On-screen Alexa+ simulator: a spoken sentence in, the tool's spoken reply out.
app.post("/api/say", async (req, res) => {
  if (!authorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const text = typeof req.body?.text === "string" ? req.body.text.slice(0, 300) : "";
  const household = typeof req.body?.household === "string" && req.body.household ? req.body.household : "default";
  res.json(await say(household, text));
});

app.get("/health", (_req, res) => void res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Pantry Pal MCP server listening on http://localhost:${port}/mcp`));
