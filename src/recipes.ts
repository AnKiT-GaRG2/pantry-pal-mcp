import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { PantryItem } from "./store.js";

const MODEL_ID = process.env.BEDROCK_MODEL_ID;

// Used when Bedrock is not configured, so the server still works offline.
function fallback(items: PantryItem[], meal: string): string {
  const names = items.map((i) => i.name);
  if (names.length === 0) return "Your pantry is empty, so I have nothing to cook with yet.";
  const main = names.slice(0, 3).join(", ");
  return `For ${meal}, try a simple skillet or stir-fry with ${main}. Season to taste and cook until tender.`;
}

export async function suggestRecipe(items: PantryItem[], meal: string): Promise<{ text: string; source: "bedrock" | "local" }> {
  if (!MODEL_ID || items.length === 0) return { text: fallback(items, meal), source: "local" };
  try {
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "us-east-1" });
    const list = items.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ");
    const res = await client.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: "You are a voice kitchen assistant. Reply in at most 3 short spoken sentences. No lists, no markdown." }],
        messages: [{ role: "user", content: [{ text: `Suggest one ${meal} recipe using mostly: ${list}.` }] }],
        inferenceConfig: { maxTokens: 200, temperature: 0.5 },
      }),
    );
    const text = res.output?.message?.content?.[0]?.text?.trim();
    if (text) return { text, source: "bedrock" };
  } catch (err) {
    console.error("Bedrock call failed, using local fallback:", (err as Error).message);
  }
  return { text: fallback(items, meal), source: "local" };
}
