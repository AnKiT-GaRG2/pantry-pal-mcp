// In-memory record of what the voice assistant just did, per household, for the live dashboard.
export interface Action {
  at: string; // ISO timestamp
  tool: string;
  args: Record<string, unknown>;
  reply: string;
  heard?: string; // the sentence spoken to the on-screen simulator, when there was one
}

export interface Recipe {
  at: string;
  kind: "Recipe idea" | "Meal plan";
  text: string;
  source: "bedrock" | "local";
}

const MAX_ACTIONS = 20;
const actions = new Map<string, Action[]>();
const recipes = new Map<string, Recipe>();

export function recordAction(userId: string, tool: string, args: unknown, reply: string): void {
  const list = actions.get(userId) ?? [];
  const safeArgs = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  list.unshift({ at: new Date().toISOString(), tool, args: safeArgs, reply });
  actions.set(userId, list.slice(0, MAX_ACTIONS));
}

export function recordRecipe(userId: string, kind: Recipe["kind"], text: string, source: Recipe["source"]): void {
  recipes.set(userId, { at: new Date().toISOString(), kind, text, source });
}

export const recentActions = (userId: string, n = 8): Action[] => (actions.get(userId) ?? []).slice(0, n);
export const lastRecipe = (userId: string): Recipe | null => recipes.get(userId) ?? null;

/** Attach the spoken sentence to the action that was just recorded for this household. */
export function annotateLatest(userId: string, heard: string): void {
  const latest = actions.get(userId)?.[0];
  if (latest) latest.heard = heard;
}
