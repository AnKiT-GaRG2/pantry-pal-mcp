import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { PantryItem } from "./store.js";
import { spokenName } from "./names.js";

const said = (i: PantryItem) => spokenName(i.name, i.quantity, i.unit);

const MODEL_ID = process.env.BEDROCK_MODEL_ID;

export interface Suggestion {
  text: string;
  source: "bedrock" | "local";
}

const SYSTEM = "You are a voice kitchen assistant. Reply in short spoken sentences. No lists, no markdown, no emojis.";

function describe(items: PantryItem[]): string {
  return items.map((i) => `${i.quantity} ${i.unit} ${i.name}${i.expires ? ` (expires ${i.expires})` : ""}`).join(", ");
}

async function ask(prompt: string, maxTokens: number): Promise<string | undefined> {
  if (!MODEL_ID) return undefined;
  try {
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "us-east-1" });
    const res = await client.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: SYSTEM }],
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens, temperature: 0.5 },
      }),
    );
    return res.output?.message?.content?.[0]?.text?.trim() || undefined;
  } catch (err) {
    console.error("Bedrock call failed, using local fallback:", (err as Error).message);
    return undefined;
  }
}

export async function suggestRecipe(items: PantryItem[], meal: string, diet?: string): Promise<Suggestion> {
  if (items.length === 0) return { text: "Your pantry is empty, so I have nothing to cook with yet.", source: "local" };
  const text = await ask(
    `Suggest one ${meal} recipe${diet ? ` that is ${diet}` : ""} using mostly: ${describe(items)}. Use food expiring soonest first. Max 3 sentences.`,
    200,
  );
  if (text) return { text, source: "bedrock" };
  const main = items.slice(0, 3).map(said).join(", ");
  return { text: `For ${meal}, try a simple skillet or stir-fry with ${main}. Season to taste and cook until tender.`, source: "local" };
}

export async function planMeals(items: PantryItem[], days: number): Promise<Suggestion> {
  if (items.length === 0) return { text: "Your pantry is empty, so I can't plan meals yet.", source: "local" };
  const text = await ask(
    `Plan dinners for the next ${days} days using mostly: ${describe(items)}. Use food expiring soonest on the earliest days. One sentence per day, start each with the day number.`,
    120 * days,
  );
  if (text) return { text, source: "bedrock" };
  const lines = Array.from({ length: days }, (_, d) => {
    const it = items[d % items.length];
    return `Day ${d + 1}: something with ${said(it)}.`;
  });
  return { text: lines.join(" "), source: "local" };
}
