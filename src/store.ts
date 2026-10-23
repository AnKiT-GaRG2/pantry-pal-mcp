import { promises as fs } from "node:fs";
import path from "node:path";

export interface PantryItem {
  name: string;
  quantity: number;
  unit: string;
  expires?: string; // yyyy-mm-dd
}

export interface State {
  pantry: PantryItem[];
  shopping: string[];
  stats: { used: number; wasted: number };
}

const DIR = process.env.PANTRY_DIR ?? path.join(process.cwd(), "data");

const empty = (): State => ({ pantry: [], shopping: [], stats: { used: 0, wasted: 0 } });

// Each household gets its own file; the id is sanitised so it can't escape DIR.
const fileFor = (userId: string) => path.join(DIR, `${userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "default"}.json`);

// Serialise read-modify-write per household so concurrent voice requests don't clobber each other.
const locks = new Map<string, Promise<unknown>>();

export function withState<T>(userId: string, fn: (s: State) => T | Promise<T>): Promise<T> {
  const file = fileFor(userId);
  const run = (locks.get(file) ?? Promise.resolve()).then(async () => {
    let state: State;
    try {
      state = { ...empty(), ...JSON.parse(await fs.readFile(file, "utf8")) };
    } catch {
      state = empty();
    }
    const result = await fn(state);
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(file, JSON.stringify(state, null, 2));
    return result;
  });
  locks.set(file, run.catch(() => undefined));
  return run;
}
