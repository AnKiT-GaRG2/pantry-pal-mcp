// Foods whose singular form looks plural; leave them alone.
const KEEP = new Set(["hummus", "couscous", "asparagus", "molasses", "swiss", "citrus", "bass", "lemongrass"]);

/** Canonical food name so "Eggs", "an egg" and "egg" are the same pantry item. */
export function normalizeName(raw: string): string {
  let n = raw.toLowerCase().trim().replace(/^(a|an|the|some|my)\s+/, "").replace(/\s+/g, " ");
  if (KEEP.has(n)) return n;
  if (/[^aeiou]ies$/.test(n)) return n.slice(0, -3) + "y"; // berries -> berry
  if (/(tomato|potato|mango|avocado)es$/.test(n)) return n.slice(0, -2);
  if (/(ch|sh|x|ss)es$/.test(n)) return n.slice(0, -2); // peaches -> peach
  if (n.endsWith("s") && !n.endsWith("ss") && n.length > 3) return n.slice(0, -1);
  return n;
}

export function plural(n: number, singular: string, pluralForm = singular + "s"): string {
  return n === 1 ? singular : pluralForm;
}

const UNCOUNTABLE = new Set(["milk", "rice", "spinach", "bread", "butter", "cheese", "flour", "yogurt", "chicken", "fish", "beef", "pasta", "lettuce", "paneer", "hummus", "couscous"]);

/** Spoken form of a stored (singular) name for a given count: 6 -> "eggs", 1 -> "egg". */
export function spokenName(name: string, count: number, unit = "count"): string {
  if (count === 1 || unit !== "count" || UNCOUNTABLE.has(name)) return name;
  if (/[^aeiou]y$/.test(name)) return name.slice(0, -1) + "ies";
  if (/(tomato|potato|mango|avocado|ch|sh|x|ss)$/.test(name)) return name + "es";
  return name + "s";
}

export const isPlural = (name: string, count: number, unit = "count") => spokenName(name, count, unit) !== name;
