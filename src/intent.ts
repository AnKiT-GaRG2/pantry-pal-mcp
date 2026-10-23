// Turns a spoken sentence into one of the MCP tool calls. This stands in for Alexa+'s language
// understanding when there is no Alexa device: rule-based, offline and deterministic.
export interface Intent {
  tool: string;
  args: Record<string, unknown>;
}

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};
const NUMBER_WORD = Object.keys(WORDS).join("|");

const UNITS: Record<string, string> = {
  liter: "liters", liters: "liters", litre: "liters", litres: "liters",
  kg: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  gram: "grams", grams: "grams", pound: "pounds", pounds: "pounds", lb: "pounds", lbs: "pounds",
};

/** Lowercase, drop the wake word and punctuation, and expand contractions so the rules stay simple. */
export function clean(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[“”"]/g, "")
    .replace(/[’]/g, "'")
    .replace(/^\s*(?:hey |ok |okay )?alexa[,:]?\s*/, "")
    .replace(/^(?:please\s+)?(?:ask|tell)\s+pantry pal\s+(?:to\s+|that\s+)?/, "")
    .replace(/\bwhat's\b/g, "what is")
    .replace(/\bthat's\b/g, "that is")
    .replace(/\bi've\b/g, "i have")
    .replace(/\bwhat've\b/g, "what have")
    .replace(/[?!,;]+/g, " ")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ") // keep the point in 1.5
    .replace(/^please\s+|\s+please$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function takeQuantity(s: string): { qty: number; rest: string } {
  let m = s.match(/^(?:a\s+)?dozen\s+(?:of\s+)?(.+)$/);
  if (m) return { qty: 12, rest: m[1] };
  m = s.match(/^a\s+couple\s+of\s+(.+)$/);
  if (m) return { qty: 2, rest: m[1] };
  m = s.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (m) return { qty: Number(m[1]), rest: m[2] };
  m = s.match(new RegExp(`^(${NUMBER_WORD})\\s+(.+)$`));
  if (m) return { qty: WORDS[m[1]], rest: m[2] };
  m = s.match(/^(?:a|an|some|the|my)\s+(.+)$/);
  if (m) return { qty: 1, rest: m[1] };
  return { qty: 1, rest: s };
}

function takeUnit(s: string): { unit: string; rest: string } {
  const m = s.match(/^([a-z]+)\s+(?:of\s+)?(.+)$/);
  if (m && UNITS[m[1]]) return { unit: UNITS[m[1]], rest: m[2] };
  return { unit: "count", rest: s };
}

function numberWordsToDigits(s: string): string {
  return s.replace(new RegExp(`\\b(${NUMBER_WORD})\\b`, "g"), (w) => String(WORDS[w]));
}

function parseItem(phrase: string): { name: string; quantity: number; unit: string } | undefined {
  const { qty, rest } = takeQuantity(phrase.trim());
  const { unit, rest: name } = takeUnit(rest);
  const item = name.replace(/^(?:a|an|some|the|my)\s+/, "").trim();
  return item ? { name: item, quantity: qty, unit } : undefined;
}

const MEALS: [RegExp, string][] = [[/\bbreakfast\b/, "breakfast"], [/\blunch\b/, "lunch"], [/\b(?:dinner|supper)\b/, "dinner"], [/\bsnack\b/, "snack"]];
const DIET = /\b(vegetarian|vegan|gluten[- ]free|dairy[- ]free|keto|low[- ]carb)\b/;

const SHOP = "(?:shopping|grocery)(?: list)?";

export function parseUtterance(raw: string): Intent | undefined {
  const s = clean(raw);
  if (!s) return undefined;
  let m: RegExpMatchArray | null;

  // Shopping list (before the generic "add" rule).
  if (new RegExp(`^clear (?:my |the )?${SHOP}$`).test(s)) return { tool: "manage_shopping_list", args: { action: "clear" } };
  if ((m = s.match(new RegExp(`^(?:add|put) (.+?) (?:to|on) (?:my |the )?${SHOP}$`)))) return { tool: "manage_shopping_list", args: { action: "add", item: m[1] } };
  if ((m = s.match(new RegExp(`^(?:remove|delete|take) (.+?) (?:from|off) (?:my |the )?${SHOP}$`)))) return { tool: "manage_shopping_list", args: { action: "remove", item: m[1] } };
  if (new RegExp(`^(?:what is on|what is in|read(?: me)?|show me|tell me) (?:my |the )?${SHOP}$`).test(s) || /^what (?:do|should) i (?:need to )?(?:buy|get)$/.test(s))
    return { tool: "manage_shopping_list", args: { action: "read" } };

  // Meal plan.
  if (/^plan\b.*\b(?:dinners?|meals?|suppers?)\b/.test(s)) {
    let days = 3;
    if (/\bweek\b/.test(s)) days = 7;
    const n = numberWordsToDigits(s).match(/\b(\d+)\s+days?\b/);
    if (n) days = Number(n[1]);
    return { tool: "plan_meals", args: { days: Math.min(7, Math.max(1, days)) } };
  }

  // What expires soon.
  if (/^what (?:should|can|do) i (?:eat|use|cook|use up) (?:first|soon|up)\b/.test(s) || /^what is (?:about to|going to) (?:expire|go off|go bad|spoil)/.test(s) ||
      /^what (?:is expiring|expires)\b/.test(s) || /^(?:is )?anything (?:expiring|going off|about to expire)/.test(s)) {
    let days = 3;
    if (/\btoday\b/.test(s)) days = 0;
    else if (/\btomorrow\b/.test(s)) days = 1;
    else if (/\bweek\b/.test(s)) days = 7;
    const n = numberWordsToDigits(s).match(/\b(\d+)\s+days?\b/);
    if (n) days = Number(n[1]);
    return { tool: "check_expiring", args: { days: Math.min(30, Math.max(0, days)) } };
  }

  // Throw out expired food.
  if (/^(?:throw|toss|discard|clear|clean)\b.*\b(?:expired|gone off|spoiled|bad|off)\b/.test(s)) return { tool: "discard_expired", args: {} };

  // Waste report.
  if (/\bwaste (?:report|score)\b/.test(s) || /^how much (?:food )?(?:have i |did i |do i )?(?:wasted?|thrown away)/.test(s) || /^how (?:am|are) (?:i|we) doing\b/.test(s))
    return { tool: "waste_report", args: {} };

  // Pantry contents.
  if (/^(?:(?:tell me|show me) )?(?:what is in (?:my|the) (?:pantry|fridge|kitchen|cupboard)|what do i (?:have|own)(?: in (?:my|the) (?:pantry|fridge|kitchen))?|(?:read|tell me|show me) (?:my |the )?pantry|pantry summary|what is in stock)$/.test(s))
    return { tool: "pantry_summary", args: {} };

  // Using food up.
  if ((m = s.match(/^(?:i )?(?:just )?(?:used up|used|ate|cooked|finished|had)\s+(.+)$/))) {
    const item = parseItem(m[1]);
    return item ? { tool: "use_pantry_item", args: { name: item.name, quantity: item.quantity } } : undefined;
  }

  // A cooking idea.
  if (/\b(?:recipe|idea|suggest)\b/.test(s) || /^what\b.*\b(?:can|could|should|shall) i (?:make|cook|eat|have)\b/.test(s) || /^what is for (?:dinner|lunch|breakfast|supper)\b/.test(s)) {
    const meal = MEALS.find(([re]) => re.test(s))?.[1] ?? "dinner";
    const diet = s.match(DIET)?.[1].replace("-", " ");
    return { tool: "suggest_recipe", args: diet ? { meal, diet } : { meal } };
  }

  // Adding food.
  if ((m = s.match(/^(?:i )?(?:just )?(?:bought|got|purchased|picked up|stocked up on|added|add)\s+(.+)$/))) {
    let phrase = m[1].replace(/\s+(?:to|in|into) (?:my |the )?(?:pantry|fridge|kitchen|cupboard)$/, "");
    let expires: string | undefined;
    const e = phrase.match(/^(.*?)\s+(?:(?:that|which)\s+)?(?:(?:will|is|are)\s+)?(?:expires?|expiring|expired|use by|best before|good until)\s+(?:on\s+)?(.+)$/);
    if (e) {
      phrase = e[1];
      expires = numberWordsToDigits(e[2]);
    }
    const item = parseItem(phrase);
    if (!item) return undefined;
    return { tool: "add_pantry_item", args: { ...item, ...(expires ? { expires } : {}) } };
  }

  return undefined;
}

export const HELP = "Sorry, I didn't catch that. Try: I bought six eggs that expire Sunday. What should I eat first? What can I make for dinner?";
