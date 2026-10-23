export const DASHBOARD_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pantry Pal</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#1c2430;--mute:#6b7685;--line:#e3e7ec;--ok:#1f8f55;--warn:#c27a00;--bad:#c0392b;--accent:#2563eb}
@media (prefers-color-scheme:dark){:root{--bg:#10151c;--card:#1a212b;--ink:#e8edf3;--mute:#93a0b0;--line:#2a3340;--ok:#4cc38a;--warn:#f0b429;--bad:#ff7b6b;--accent:#6ea0ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.4 system-ui,sans-serif;padding:16px}
main{max-width:860px;margin:0 auto}h1{font-size:1.4rem;margin:0 0 4px}.sub{color:var(--mute);margin:0 0 16px}
.grid{display:grid;gap:12px;grid-template-columns:2fr 1fr}@media(max-width:700px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
h2{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin:0 0 8px}
ul{list-style:none;margin:0;padding:0}li{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid var(--line)}li:first-child{border-top:0}
.tag{font-size:.8rem;font-weight:600;white-space:nowrap}.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}.mute{color:var(--mute)}
.stat{font-size:2rem;font-weight:700}input{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink)}
</style></head><body><main>
<h1>Pantry Pal</h1>
<p class="sub">Live view of what your voice commands changed. Household: <input id="hh" value="default" size="14" aria-label="Household id"></p>
<div class="grid">
 <section class="card"><h2>Pantry (soonest expiry first)</h2><ul id="pantry"></ul></section>
 <div style="display:grid;gap:12px;align-content:start">
  <section class="card"><h2>Shopping list</h2><ul id="shop"></ul></section>
  <section class="card"><h2>Eaten before expiry</h2><div class="stat" id="pct">–</div><div class="mute" id="stats"></div></section>
 </div>
</div></main>
<script>
const q = new URLSearchParams(location.search);
const hh = document.getElementById('hh');
hh.value = q.get('household') || 'default';
function row(left, right, cls){const li=document.createElement('li');const a=document.createElement('span');a.textContent=left;const b=document.createElement('span');b.className='tag '+(cls||'mute');b.textContent=right;li.append(a,b);return li}
function empty(ul,t){ul.replaceChildren(row(t,'','mute'))}
async function refresh(){
  const url='/api/state?household='+encodeURIComponent(hh.value)+(q.get('token')?'&token='+encodeURIComponent(q.get('token')):'');
  try{
    const r=await fetch(url); if(!r.ok) throw new Error(r.status);
    const s=await r.json();
    const p=document.getElementById('pantry');
    const items=[...s.pantry].sort((a,b)=>(a.daysLeft??9999)-(b.daysLeft??9999));
    if(!items.length) empty(p,'Pantry is empty'); else p.replaceChildren(...items.map(i=>{
      const d=i.daysLeft; const label=d==null?'no date':d<0?'expired':d===0?'today':d===1?'tomorrow':'in '+d+' days';
      return row(i.quantity+(i.unit==='count'?'':' '+i.unit)+' '+i.name,label,d==null?'mute':d<0?'bad':d<=2?'warn':'ok');
    }));
    const sh=document.getElementById('shop');
    if(!s.shopping.length) empty(sh,'Nothing to buy'); else sh.replaceChildren(...s.shopping.map(x=>row(x,'')));
    const t=s.stats.used+s.stats.wasted;
    document.getElementById('pct').textContent=t?Math.round(s.stats.used/t*100)+'%':'–';
    document.getElementById('stats').textContent=s.stats.used+' used, '+s.stats.wasted+' wasted';
  }catch(e){empty(document.getElementById('pantry'),'Could not load ('+e.message+')')}
}
hh.addEventListener('change',refresh); refresh(); setInterval(refresh,2000);
</script></body></html>`;
