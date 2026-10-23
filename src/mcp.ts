import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { load, save, daysUntil } from "./store.js";
import { suggestRecipe } from "./recipes.js";

const reply = (text: string) => ({ content: [{ type: "text" as const, text }] });

export function createServer(): McpServer {
  const server = new McpServer({ name: "pantry-pal", version: "1.0.0" });

  server.registerTool(
    "add_pantry_item",
    {
      title: "Add pantry item",
      description: "Add food to the pantry, e.g. 'I bought 6 eggs that expire Friday'. Merges with an existing item of the same name.",
      inputSchema: {
        name: z.string().min(1).describe("Food name, e.g. 'eggs'"),
        quantity: z.number().positive().default(1),
        unit: z.string().default("count").describe("e.g. 'count', 'kg', 'liters'"),
        expires: z.string().optional().describe("Expiry date as ISO yyyy-mm-dd"),
      },
    },
    async ({ name, quantity, unit, expires }) => {
      const s = await load();
      const key = name.toLowerCase().trim();
      const existing = s.pantry.find((i) => i.name === key && i.unit === unit);
      if (existing) {
        existing.quantity += quantity;
        if (expires) existing.expires = expires;
      } else {
        s.pantry.push({ name: key, quantity, unit, expires });
      }
      s.shopping = s.shopping.filter((i) => i !== key);
      await save(s);
      return reply(`Added ${quantity} ${unit === "count" ? "" : unit + " of "}${key} to your pantry.`);
    },
  );

  server.registerTool(
    "use_pantry_item",
    {
      title: "Use pantry item",
      description: "Remove some quantity of a food after cooking or eating it. Adds it to the shopping list if it runs out.",
      inputSchema: { name: z.string().min(1), quantity: z.number().positive().default(1) },
    },
    async ({ name, quantity }) => {
      const s = await load();
      const key = name.toLowerCase().trim();
      const item = s.pantry.find((i) => i.name === key);
      if (!item) return reply(`You don't have any ${key} in the pantry.`);
      item.quantity -= quantity;
      let msg = `Okay, used ${quantity} ${key}.`;
      if (item.quantity <= 0) {
        s.pantry = s.pantry.filter((i) => i !== item);
        if (!s.shopping.includes(key)) s.shopping.push(key);
        msg += ` You're out of ${key}, so I added it to your shopping list.`;
      } else {
        msg += ` ${item.quantity} left.`;
      }
      await save(s);
      return reply(msg);
    },
  );

  server.registerTool(
    "check_expiring",
    {
      title: "Check expiring food",
      description: "List foods that expire within the given number of days, soonest first. Use for 'what should I eat first?'",
      inputSchema: { days: z.number().int().min(0).max(30).default(3) },
    },
    async ({ days }) => {
      const s = await load();
      const soon = s.pantry
        .filter((i) => i.expires && daysUntil(i.expires) <= days)
        .sort((a, b) => a.expires!.localeCompare(b.expires!));
      if (soon.length === 0) return reply(`Nothing expires in the next ${days} days.`);
      const parts = soon.map((i) => {
        const d = daysUntil(i.expires!);
        const when = d < 0 ? "already expired" : d === 0 ? "expires today" : d === 1 ? "expires tomorrow" : `expires in ${d} days`;
        return `${i.name} ${when}`;
      });
      return reply(parts.join(". ") + ".");
    },
  );

  server.registerTool(
    "suggest_recipe",
    {
      title: "Suggest a recipe",
      description: "Suggest a meal using what's in the pantry, prioritizing food that expires soon. Uses Amazon Bedrock when configured.",
      inputSchema: { meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("dinner") },
    },
    async ({ meal }) => {
      const s = await load();
      const ranked = [...s.pantry].sort((a, b) => (a.expires ?? "9999").localeCompare(b.expires ?? "9999"));
      const { text } = await suggestRecipe(ranked.slice(0, 8), meal);
      return reply(text);
    },
  );

  server.registerTool(
    "manage_shopping_list",
    {
      title: "Manage shopping list",
      description: "Add or remove items on the shopping list, or read it back.",
      inputSchema: {
        action: z.enum(["add", "remove", "read", "clear"]),
        item: z.string().optional(),
      },
    },
    async ({ action, item }) => {
      const s = await load();
      const key = item?.toLowerCase().trim();
      if (action === "read") {
        return reply(s.shopping.length ? `Your shopping list has ${s.shopping.join(", ")}.` : "Your shopping list is empty.");
      }
      if (action === "clear") {
        s.shopping = [];
        await save(s);
        return reply("Shopping list cleared.");
      }
      if (!key) return reply(`Which item should I ${action}?`);
      if (action === "add") {
        if (!s.shopping.includes(key)) s.shopping.push(key);
        await save(s);
        return reply(`Added ${key} to your shopping list.`);
      }
      s.shopping = s.shopping.filter((i) => i !== key);
      await save(s);
      return reply(`Removed ${key} from your shopping list.`);
    },
  );

  server.registerTool(
    "pantry_summary",
    {
      title: "Pantry summary",
      description: "Read back everything currently in the pantry.",
      inputSchema: {},
    },
    async () => {
      const s = await load();
      if (s.pantry.length === 0) return reply("Your pantry is empty.");
      return reply("You have " + s.pantry.map((i) => `${i.quantity} ${i.unit === "count" ? "" : i.unit + " "}${i.name}`.replace(/\s+/g, " ")).join(", ") + ".");
    },
  );

  return server;
}
