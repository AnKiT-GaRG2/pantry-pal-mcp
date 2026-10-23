import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { annotateLatest } from "./activity.js";
import { HELP, parseUtterance } from "./intent.js";
import { createServer } from "./mcp.js";

export interface SayResult {
  heard: string;
  understood: boolean;
  tool?: string;
  args?: Record<string, unknown>;
  reply: string;
}

/**
 * Handles one spoken sentence for the on-screen Alexa+ simulator: works out which tool it means, then calls
 * that tool on the real MCP server over an in-memory MCP connection (the same server the HTTP endpoint serves).
 */
export async function say(household: string, text: string): Promise<SayResult> {
  const intent = parseUtterance(text);
  if (!intent) return { heard: text, understood: false, reply: HELP };

  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const server = createServer(household);
  const client = new Client({ name: "alexa-simulator", version: "1.0.0" });
  try {
    await server.connect(serverSide);
    await client.connect(clientSide);
    const res = await client.callTool({ name: intent.tool, arguments: intent.args });
    const reply = (res.content as { text: string }[] | undefined)?.[0]?.text;
    if (res.isError || !reply) return { heard: text, understood: true, ...intent, reply: "Sorry, something went wrong with that." };
    annotateLatest(household, text);
    return { heard: text, understood: true, ...intent, reply };
  } finally {
    await client.close();
    await server.close();
  }
}
