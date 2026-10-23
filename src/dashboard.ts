export const DASHBOARD_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pantry Pal</title>
<style>
:root{--bg:#f4f6f9;--card:#fff;--ink:#17202b;--mute:#667385;--line:#e1e6ec;--ok:#16794a;--warn:#a86400;--bad:#b83224;--accent:#2557d6;--soft:#eef2f8}
@media (prefers-color-scheme:dark){:root{--bg:#0e131a;--card:#171e28;--ink:#e9eef4;--mute:#95a2b3;--line:#27313e;--ok:#4cc38a;--warn:#f0b429;--bad:#ff7b6b;--accent:#7aa8ff;--soft:#1e2733}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px 20px 40px}
main{max-width:1180px;margin:0 auto}
header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
h1{font-size:1.7rem;margin:0;letter-spacing:-.01em}
.who{display:flex;align-items:center;gap:12px;color:var(--mute);font-size:.9rem}
.live{display:inline-flex;align-items:center;gap:6px;font-weight:600}
.dot{width:9px;height:9px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 var(--ok);animation:pulse 2s infinite}
.dot.off{background:var(--bad);animation:none}
@keyframes pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--ok) 55%,transparent)}70%,100%{box-shadow:0 0 0 8px transparent}}
input{font:inherit;font-size:.9rem;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);width:150px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin:0 0 12px;font-weight:700}
.layout{display:grid;gap:16px;grid-template-columns:minmax(0,3fr) minmax(0,2fr);margin-top:16px;align-items:start}
.col{display:grid;gap:16px;grid-template-columns:minmax(0,1fr);min-width:0}
.card{min-width:0}
@media(max-width:860px){.layout{grid-template-columns:1fr}}

.first{border-color:color-mix(in srgb,var(--warn) 45%,var(--line))}
.first.calm{border-color:var(--line)}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{display:inline-flex;align-items:baseline;gap:8px;padding:8px 14px;border-radius:999px;font-weight:600;background:var(--soft);border:1px solid var(--line)}
.chip small{font-size:.8rem;font-weight:700}
.chip.warn{border-color:var(--warn)}.chip.bad{border-color:var(--bad)}
.calm{color:var(--ok);font-weight:600}

ul{list-style:none;margin:0;padding:0}
li{padding:11px 10px;border-top:1px solid var(--line);border-radius:8px}li:first-child{border-top:0}
li .top{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
li .name{font-size:1.08rem;font-weight:550}
.tag{font-size:.85rem;font-weight:700;white-space:nowrap}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}.mute{color:var(--mute)}
.track{height:5px;border-radius:3px;background:var(--soft);margin-top:7px;overflow:hidden}
.fill{height:100%;border-radius:3px;background:currentColor;transition:width .5s}
li.expired{background:color-mix(in srgb,var(--bad) 9%,transparent)}
li.flash{animation:flash 1.8s ease-out}
li.leaving{opacity:.55;text-decoration:line-through}
@keyframes flash{from{background:color-mix(in srgb,var(--accent) 30%,transparent)}to{background:transparent}}

.heard .reply{font-size:1.3rem;line-height:1.35;font-weight:600;margin:0 0 10px}
.heard .meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:.85rem;color:var(--mute)}
.pill{background:var(--soft);border:1px solid var(--line);border-radius:6px;padding:2px 8px;font-size:.8rem}
.pill.tool{color:var(--accent);font-weight:700}
.heard.new .reply{animation:flash 1.8s ease-out;border-radius:8px}
.older{margin-top:12px;border-top:1px solid var(--line);padding-top:8px;font-size:.88rem;color:var(--mute)}
.older div{padding:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.recipe p{margin:0 0 10px;font-size:1.05rem}
.badge{display:inline-block;font-size:.75rem;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--soft)}
.badge.bedrock{color:var(--accent);border-color:var(--accent)}
.stat{font-size:2.6rem;font-weight:750;line-height:1}
.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.talk{margin-bottom:16px;border-color:color-mix(in srgb,var(--accent) 50%,var(--line))}
.talk h2{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.sim{font-size:.7rem;letter-spacing:.04em;text-transform:none;font-weight:600;padding:2px 9px;border-radius:999px;border:1px solid var(--accent);color:var(--accent)}
.talkrow{display:flex;gap:10px}
.talkrow input{flex:1;width:auto;font-size:1.05rem;padding:11px 14px;border-radius:10px}
button{font:inherit;cursor:pointer;border-radius:10px;border:1px solid var(--line);background:var(--soft);color:var(--ink)}
button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.send{padding:0 22px;font-weight:700;background:var(--accent);color:var(--card);border-color:var(--accent)}
.mic{width:52px;display:grid;place-items:center}.mic svg{width:22px;height:22px;fill:currentColor}
.mic.on{background:var(--bad);border-color:var(--bad);color:var(--card);animation:pulse2 1.2s infinite}
.mic:disabled{opacity:.4;cursor:not-allowed}
@keyframes pulse2{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--bad) 50%,transparent)}100%{box-shadow:0 0 0 12px transparent}}
.try{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
.try button{padding:5px 12px;border-radius:999px;font-size:.85rem;color:var(--mute)}
.try button:hover{color:var(--ink);border-color:var(--accent)}
.speak input{width:auto;padding:0;margin:0}
.speak{display:inline-flex;gap:6px;align-items:center;font-size:.85rem;color:var(--mute);margin-top:6px}
.convo{margin-top:12px;display:grid;gap:6px;font-size:1.1rem}
.convo .you{color:var(--mute)}.convo .bot{font-weight:600}.convo .bot.miss{color:var(--warn)}
.heard .said{color:var(--mute);margin:0 0 6px;font-size:.95rem}
.empty{color:var(--mute);margin:0}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body><main>
<header>
 <h1>Pantry Pal</h1>
 <div class="who">
  <span class="live"><span class="dot" id="dot"></span><span id="conn">Live</span></span>
  <label>Household <input id="hh" value="default" aria-label="Household id"></label>
 </div>
</header>

<section class="card talk" aria-labelledby="talk-h">
 <h2 id="talk-h">Talk to Pantry Pal <span class="sim">Alexa+ simulator · not a real Alexa</span></h2>
 <form id="talkForm" class="talkrow" autocomplete="off">
  <button type="button" class="mic" id="mic" aria-label="Speak to Pantry Pal" title="Speak"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2z"/></svg></button>
  <input id="say" placeholder="Type or tap the mic, e.g. I bought six eggs that expire Sunday" aria-label="Say something to Pantry Pal">
  <button type="submit" class="send">Send</button>
 </form>
 <div class="try" id="try"></div>
 <label class="speak"><input type="checkbox" id="speakOn" checked> Read replies aloud</label>
 <div class="convo" id="convo" aria-live="polite"></div>
</section>

<section class="card first calm" id="firstCard" aria-labelledby="eat-h"><h2 id="eat-h">Eat first</h2><div class="chips" id="first"></div></section>

<div class="layout">
 <section class="card" aria-labelledby="pan-h"><h2 id="pan-h">Pantry · soonest expiry first</h2><ul id="pantry"></ul></section>
 <div class="col">
  <section class="card heard" id="heard" aria-labelledby="hear-h" aria-live="polite"><h2 id="hear-h">Last Alexa+ action</h2><div id="heardBody"></div></section>
  <section class="card recipe" aria-labelledby="rec-h"><h2 id="rec-h">Cooking idea</h2><div id="recipe"></div></section>
  <div class="pair">
   <section class="card" aria-labelledby="shop-h"><h2 id="shop-h">Shopping list</h2><ul id="shop"></ul></section>
   <section class="card" aria-labelledby="pct-h"><h2 id="pct-h">Eaten before expiry</h2><div class="stat" id="pct">–</div><div class="mute" id="stats"></div></section>
  </div>
 </div>
</div></main>
<script>
const q = new URLSearchParams(location.search);
const hh = document.getElementById('hh');
hh.value = q.get('household') || 'default';
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const lab = d => d == null ? 'no date' : d < 0 ? 'expired' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days';
const tone = d => d == null ? 'mute' : d < 0 ? 'bad' : d <= 2 ? 'warn' : 'ok';
const human = t => t.replace(/_/g, ' ');

function row(text, right, cls, opt) {
  opt = opt || {};
  const li = el('li', opt.li || '');
  const top = el('div', 'top');
  top.append(el('span', 'name', text), el('span', 'tag ' + (cls || 'mute'), right));
  li.append(top);
  if (opt.bar != null) {
    const t = el('div', 'track'), f = el('div', 'fill ' + cls);
    f.style.width = Math.round(opt.bar * 100) + '%';
    t.append(f); li.append(t);
  }
  return li;
}
const note = (ul, t) => { const li = el('li'); li.append(el('p', 'empty', t)); ul.replaceChildren(li); };

let prevPantry = null, prevShop = null, lastAction = null;

function renderPantry(s) {
  const items = [...s.pantry].sort((a, b) => (a.daysLeft == null ? 9999 : a.daysLeft) - (b.daysLeft == null ? 9999 : b.daysLeft));
  const cur = new Map();
  const rows = items.map(i => {
    const key = i.name + '|' + i.unit, sig = i.quantity + '|' + i.expires;
    const text = i.quantity + (i.unit === 'count' ? '' : ' ' + i.unit) + ' ' + (i.spoken || i.name);
    cur.set(key, { sig, text });
    const changed = prevPantry && (!prevPantry.has(key) || prevPantry.get(key).sig !== sig);
    const d = i.daysLeft;
    return row(text, lab(d), tone(d), { bar: d == null ? null : d < 0 ? 0 : Math.min(d, 14) / 14, li: (changed ? 'flash ' : '') + (d != null && d < 0 ? 'expired' : '') });
  });
  if (prevPantry) for (const [k, v] of prevPantry) if (!cur.has(k)) rows.push(row(v.text, 'gone', 'mute', { li: 'leaving' }));
  if (rows.length) $('pantry').replaceChildren(...rows); else note($('pantry'), 'Your pantry is empty. Tell Alexa what you bought.');
  prevPantry = cur;

  const urgent = items.filter(i => i.daysLeft != null && i.daysLeft <= 2);
  const chips = urgent.map(i => {
    const c = el('span', 'chip ' + tone(i.daysLeft));
    c.append(el('span', '', i.spoken || i.name), el('small', tone(i.daysLeft), lab(i.daysLeft)));
    return c;
  });
  $('firstCard').classList.toggle('calm', !chips.length);
  if (chips.length) $('first').replaceChildren(...chips);
  else if (!items.length) $('first').replaceChildren(el('span', 'empty', 'Nothing here yet. Foods expiring within two days will show up first.'));
  else $('first').replaceChildren(el('span', 'calm', 'Nothing is about to expire. Your pantry is in good shape.'));
}

function renderShop(s) {
  const sh = $('shop');
  const cur = new Set(s.shopping);
  const rows = s.shopping.map(x => row(x, '', 'mute', { li: prevShop && !prevShop.has(x) ? 'flash' : '' }));
  if (prevShop) for (const x of prevShop) if (!cur.has(x)) rows.push(row(x, '', 'mute', { li: 'leaving' }));
  if (rows.length) sh.replaceChildren(...rows); else note(sh, 'Nothing to buy.');
  prevShop = cur;
}

function renderHeard(s) {
  const body = $('heardBody'), list = s.activity || [];
  if (!list.length) { body.replaceChildren(el('p', 'empty', 'Waiting for a command from Alexa+…')); return; }
  const a = list[0], key = a.at + a.tool;
  const isNew = lastAction !== null && lastAction !== key;
  lastAction = key;
  $('heard').classList.toggle('new', isNew);
  const meta = el('div', 'meta', null);
  meta.append(el('span', 'pill tool', human(a.tool)));
  for (const [k, v] of Object.entries(a.args)) meta.append(el('span', 'pill', k + ': ' + v));
  meta.append(el('span', '', new Date(a.at).toLocaleTimeString()));
  const nodes = [];
  if (a.heard) nodes.push(el('p', 'said', 'You said: “' + a.heard + '”'));
  nodes.push(el('p', 'reply', '“' + a.reply + '”'), meta);
  if (list.length > 1) {
    const older = el('div', 'older');
    for (const o of list.slice(1, 5)) older.append(el('div', '', new Date(o.at).toLocaleTimeString() + '  ·  ' + o.reply));
    nodes.push(older);
  }
  body.replaceChildren(...nodes);
}

function renderRecipe(s) {
  const box = $('recipe'), r = s.recipe;
  if (!r) { box.replaceChildren(el('p', 'empty', 'Ask Alexa for a dinner idea or a meal plan and it shows up here.')); return; }
  const badge = el('span', 'badge ' + r.source, r.source === 'bedrock' ? 'Amazon Bedrock' : 'Local fallback');
  box.replaceChildren(el('p', '', r.text), badge);
}

async function refresh() {
  const url = '/api/state?household=' + encodeURIComponent(hh.value) + (q.get('token') ? '&token=' + encodeURIComponent(q.get('token')) : '');
  try {
    const r = await fetch(url); if (!r.ok) throw new Error(r.status);
    const s = await r.json();
    renderPantry(s); renderShop(s); renderHeard(s); renderRecipe(s);
    const t = s.stats.used + s.stats.wasted;
    $('pct').textContent = t ? Math.round(s.stats.used / t * 100) + '%' : '–';
    $('stats').textContent = s.stats.used + ' used, ' + s.stats.wasted + ' wasted';
    $('dot').className = 'dot'; $('conn').textContent = 'Live';
  } catch (e) {
    $('dot').className = 'dot off'; $('conn').textContent = 'Offline (' + e.message + ')';
  }
}
// ---- Alexa+ simulator: type or speak a sentence; the server turns it into an MCP tool call ----
const EXAMPLES = ['I bought six eggs that expire Sunday', 'What should I eat first?', 'I used two eggs', 'Throw out what is expired', 'What can I make for dinner?', 'Add bread to my shopping list', 'How much food have I wasted?', 'What is in my pantry?'];
for (const t of EXAMPLES) { const b = el('button', '', t); b.type = 'button'; b.addEventListener('click', () => send(t)); $('try').append(b); }

function speak(text) {
  if (!$('speakOn').checked || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

async function send(text) {
  text = (text || '').trim();
  if (!text) return;
  $('say').value = '';
  $('convo').replaceChildren(el('div', 'you', 'You: ' + text), el('div', 'bot', 'Pantry Pal: …'));
  try {
    const r = await fetch('/api/say' + (q.get('token') ? '?token=' + encodeURIComponent(q.get('token')) : ''), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ household: hh.value, text })
    });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    $('convo').replaceChildren(el('div', 'you', 'You: ' + text), el('div', 'bot' + (j.understood ? '' : ' miss'), 'Pantry Pal: ' + j.reply));
    speak(j.reply);
    refresh();
  } catch (e) {
    $('convo').replaceChildren(el('div', 'you', 'You: ' + text), el('div', 'bot miss', 'Pantry Pal: could not reach the server (' + e.message + ')'));
  }
}
$('talkForm').addEventListener('submit', e => { e.preventDefault(); send($('say').value); });

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  $('mic').disabled = true;
  $('mic').title = 'Speech recognition needs Chrome or Edge. You can still type.';
} else {
  const rec = new SR();
  rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onresult = e => send(e.results[0][0].transcript);
  rec.onend = () => $('mic').classList.remove('on');
  rec.onerror = e => { $('mic').classList.remove('on'); $('convo').replaceChildren(el('div', 'bot miss', 'Microphone problem: ' + e.error + '. You can still type.')); };
  $('mic').addEventListener('click', () => {
    if ($('mic').classList.contains('on')) { rec.stop(); return; }
    speechSynthesis.cancel(); rec.start(); $('mic').classList.add('on');
  });
}
hh.addEventListener('change', () => { prevPantry = prevShop = lastAction = null; refresh(); });
refresh(); setInterval(refresh, 2000);
</script></body></html>`;
