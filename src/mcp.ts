import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withState } from "./store.js";
import { daysUntil, estimateExpiry, parseExpiry } from "./dates.js";
import { planMeals, suggestRecipe } from "./recipes.js";
import { isPlural, normalizeName, plural, spokenName } from "./names.js";

const reply = (text: string) => ({ content: [{ type: "text" as const, text }] });
const qty = (n: number, unit: string, name: string) => `${n} ${unit === "count" ? "" : unit + " "}${spokenName(name, n, unit)}`.replace(/\s+/g, " ");

const when = (iso: string, plural = false) => {
  const d = daysUntil(iso);
  const v = plural ? "expire" : "expires";
  return d < 0 ? "already expired" : d === 0 ? `${v} today` : d === 1 ? `${v} tomorrow` : `${v} in ${d} days`;
};

export function createServer(userId: string): McpServer {
  const server = new McpServer({ name: "pantry-pal", version: "2.0.0" });

  server.registerTool(
    "add_pantry_item",
    {
      title: "Add pantry item",
      description:
        "Add food to the pantry. Pass the expiry exactly as the user said it ('friday', 'in 3 days', 'tomorrow'). " +
        "If no expiry is given, a typical shelf life is estimated for common foods.",
      inputSchema: {
        name: z.string().min(1).describe("Food name, e.g. 'eggs'"),
        quantity: z.number().positive().default(1),
        unit: z.string().default("count").describe("e.g. 'count', 'kg', 'liters'"),
        expires: z.string().optional().describe("Natural-language or ISO date"),
      },
    },
    async ({ name, quantity, unit, expires }) => {
      const key = normalizeName(name);
      let date: string | undefined;
      let estimated = false;
      if (expires) {
        date = parseExpiry(expires);
        if (!date) return reply(`Sorry, I didn't understand the date "${expires}". Try something like tomorrow, Friday, or in 3 days.`);
      } else {
        date = estimateExpiry(key);
        estimated = date !== undefined;
      }
      return withState(userId, (s) => {
        const existing = s.pantry.find((i) => i.name === key && i.unit === unit);
        if (existing) {
          existing.quantity += quantity;
          if (date && (!existing.expires || date < existing.expires)) existing.expires = date; // keep the earlier date
        } else {
          s.pantry.push({ name: key, quantity, unit, expires: date });
        }
        s.shopping = s.shopping.filter((i) => i !== key);
        let msg = `Added ${qty(quantity, unit, key)} to your pantry.`;
        if (date) {
          const pl = isPlural(key, quantity, unit);
          const subject = pl ? "they" : "it";
          msg += estimated ? ` I'll assume ${subject} ${when(date, pl)}.` : ` ${pl ? "They" : "It"} ${when(date, pl)}.`;
        }
        return reply(msg);
      });
    },
  );

  server.registerTool(
    "use_pantry_item",
    {
      title: "Use pantry item",
      description: "Remove some quantity of a food after cooking or eating it. Adds it to the shopping list if it runs out.",
      inputSchema: { name: z.string().min(1), quantity: z.number().positive().default(1) },
    },
    ({ name, quantity }) =>
      withState(userId, (s) => {
        const key = normalizeName(name);
        const item = s.pantry.find((i) => i.name === key);
        if (!item) return reply(`You don't have any ${key} in the pantry.`);
        const taken = Math.min(quantity, item.quantity);
        item.quantity -= taken;
        s.stats.used += taken;
        let msg = `Okay, used ${taken} ${spokenName(key, taken)}.`;
        if (item.quantity <= 0) {
          s.pantry = s.pantry.filter((i) => i !== item);
          if (!s.shopping.includes(key)) s.shopping.push(key);
          msg += ` You're out of ${key}, so I added it to your shopping list.`;
        } else {
          msg += ` ${item.quantity} left.`;
        }
        return reply(msg);
      }),
  );

  server.registerTool(
    "check_expiring",
    {
      annotations: { readOnlyHint: true },
      title: "Check expiring food",
      description: "List foods that expire within the given number of days, soonest first. Use for 'what should I eat first?'",
      inputSchema: { days: z.number().int().min(0).max(30).default(3) },
    },
    ({ days }) =>
      withState(userId, (s) => {
        const soon = s.pantry.filter((i) => i.expires && daysUntil(i.expires) <= days).sort((a, b) => a.expires!.localeCompare(b.expires!));
        if (soon.length === 0) return reply(`Nothing expires in the next ${days} days.`);
        return reply(soon.map((i) => `${spokenName(i.name, i.quantity, i.unit)} ${when(i.expires!, isPlural(i.name, i.quantity, i.unit))}`).join(". ") + ".");
      }),
  );

  server.registerTool(
    "discard_expired",
    {
      annotations: { destructiveHint: true },
      title: "Throw away expired food",
      description: "Remove everything that has already expired from the pantry and record it as wasted.",
      inputSchema: {},
    },
    () =>
      withState(userId, (s) => {
        const bad = s.pantry.filter((i) => i.expires && daysUntil(i.expires) < 0);
        if (bad.length === 0) return reply("Nothing in your pantry has expired.");
        s.pantry = s.pantry.filter((i) => !bad.includes(i));
        s.stats.wasted += bad.reduce((n, i) => n + i.quantity, 0);
        return reply(`Threw out ${bad.map((i) => qty(i.quantity, i.unit, i.name)).join(", ")}.`);
      }),
  );

  server.registerTool(
    "waste_report",
    {
      annotations: { readOnlyHint: true },
      title: "Food waste report",
      description: "Report how much food was used versus thrown away, as a percentage saved.",
      inputSchema: {},
    },
    () =>
      withState(userId, (s) => {
        const { used, wasted } = s.stats;
        if (used + wasted === 0) return reply("I don't have any usage history yet.");
        const pct = Math.round((used / (used + wasted)) * 100);
        return reply(`You've used ${used} ${plural(used, "item")} and wasted ${wasted}. That's ${pct} percent of your food eaten before it went off.`);
      }),
  );

  server.registerTool(
    "suggest_recipe",
    {
      annotations: { readOnlyHint: true },
      title: "Suggest a recipe",
      description: "Suggest one meal using the pantry, prioritising food that expires soon. Uses Amazon Bedrock when configured.",
      inputSchema: {
        meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("dinner"),
        diet: z.string().optional().describe("e.g. 'vegetarian', 'vegan', 'gluten free'"),
      },
    },
    async ({ meal, diet }) => {
      const items = await withState(userId, (s) => [...s.pantry].sort((a, b) => (a.expires ?? "9999").localeCompare(b.expires ?? "9999")).slice(0, 10));
      return reply((await suggestRecipe(items, meal, diet)).text);
    },
  );

  server.registerTool(
    "plan_meals",
    {
      annotations: { readOnlyHint: true },
      title: "Plan dinners",
      description: "Plan dinners for the next few days from the pantry, using food that expires first on the earliest days.",
      inputSchema: { days: z.number().int().min(1).max(7).default(3) },
    },
    async ({ days }) => {
      const items = await withState(userId, (s) => [...s.pantry].sort((a, b) => (a.expires ?? "9999").localeCompare(b.expires ?? "9999")).slice(0, 12));
      return reply((await planMeals(items, days)).text);
    },
  );

  server.registerTool(
    "manage_shopping_list",
    {
      title: "Manage shopping list",
      description: "Add or remove items on the shopping list, read it back, or clear it.",
      inputSchema: { action: z.enum(["add", "remove", "read", "clear"]), item: z.string().optional() },
    },
    ({ action, item }) =>
      withState(userId, (s) => {
        const key = item ? normalizeName(item) : undefined;
        if (action === "read") return reply(s.shopping.length ? `Your shopping list has ${s.shopping.join(", ")}.` : "Your shopping list is empty.");
        if (action === "clear") {
          s.shopping = [];
          return reply("Shopping list cleared.");
        }
        if (!key) return reply(`Which item should I ${action}?`);
        if (action === "add") {
          if (!s.shopping.includes(key)) s.shopping.push(key);
          return reply(`Added ${key} to your shopping list.`);
        }
        s.shopping = s.shopping.filter((i) => i !== key);
        return reply(`Removed ${key} from your shopping list.`);
      }),
  );

  server.registerTool(
    "pantry_summary",
    {
      annotations: { readOnlyHint: true }, title: "Pantry summary", description: "Read back everything currently in the pantry.", inputSchema: {} },
    () =>
      withState(userId, (s) =>
        reply(s.pantry.length ? "You have " + s.pantry.map((i) => qty(i.quantity, i.unit, i.name)).join(", ") + "." : "Your pantry is empty."),
      ),
  );

  // Structured view for clients that read resources instead of calling tools.
  server.registerResource(
    "inventory",
    new ResourceTemplate("pantry://inventory", { list: undefined }),
    { title: "Pantry inventory", description: "Full pantry and shopping list as JSON", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, text: JSON.stringify(await withState(userId, (s) => s)) }] }),
  );

  server.registerPrompt(
    "use_it_up",
    { title: "Use it up", description: "Help me cook before food expires" },
    () => ({
      messages: [{ role: "user", content: { type: "text", text: "Check what is expiring soon, then suggest a recipe that uses it." } }],
    }),
  );

  return server;
}
