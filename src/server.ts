import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./mcp.js";

const app = express();
app.use(express.json());

// Optional bearer token so a publicly exposed endpoint isn't open to everyone.
const TOKEN = process.env.MCP_AUTH_TOKEN;

app.post("/mcp", async (req, res) => {
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
    return;
  }
  // Stateless mode: a fresh server + transport per request.
  const server = createServer();
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

app.get("/health", (_req, res) => void res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Pantry Pal MCP server listening on http://localhost:${port}/mcp`));
