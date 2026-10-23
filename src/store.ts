import { promises as fs } from "node:fs";
import path from "node:path";

export interface PantryItem {
  name: string;
  quantity: number;
  unit: string;
  expires?: string; // ISO date
}

export interface State {
  pantry: PantryItem[];
  shopping: string[];
}

const FILE = process.env.PANTRY_DATA ?? path.join(process.cwd(), "data", "state.json");

export async function load(): Promise<State> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { pantry: [], shopping: [] };
  }
}

export async function save(state: State): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state, null, 2));
}

export function daysUntil(iso: string, now = new Date()): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}
