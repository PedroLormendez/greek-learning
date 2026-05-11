// ── Supabase config ───────────────────────────────────────────────────────
const SUPABASE_URL = "https://nppqvufmexrwdkkjwccy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHF2dWZtZXhyd2Rra2p3Y2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDQ1MDMsImV4cCI6MjA5NDA4MDUwM30.a8vhhZ1kMIHuLOT6auwzVtGrSS2XI4idMwohl-I_3aI";

const PERSONS = ["εγώ","εσύ","αυτός","εμείς","εσείς","αυτοί"];
const TENSES  = ["present","subjunctive","future","past"];
const LABELS  = { present:"Present", subjunctive:"Subjunctive (να)", future:"Future (θα)", past:"Past (αόριστος)" };

let verbs = [];
let openCards  = {};
let activeTenses = {};

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

// Transform flat Supabase row → structured verb object
function transformVerb(row) {
  return {
    verb: row.verb,
    translation: row.english,
    conjugations: {
      present:     [row.present_ego,     row.present_esy,     row.present_aytos,     row.present_emeis,     row.present_eseis,     row.present_aytoi],
      subjunctive: [row.subjunctive_ego, row.subjunctive_esy, row.subjunctive_aytos, row.subjunctive_emeis, row.subjunctive_eseis, row.subjunctive_aytoi],
      future:      [row.future_ego,      row.future_esy,      row.future_aytos,      row.future_emeis,      row.future_eseis,      row.future_aytoi],
      past:        [row.past_ego,        row.past_esy,        row.past_aytos,        row.past_emeis,        row.past_eseis,        row.past_aytoi]
    }
  };
}

async function sync() {
  document.getElementById("sync-btn").disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/verbs?select=*&order=verb`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Empty response");
    verbs = data.map(transformVerb);
    sessionStorage.setItem("gk_verbs", JSON.stringify(verbs));
    toast(`${verbs.length} verbs loaded`);
    render();
  } catch(e) {
    if (!verbs.length) {
      document.getElementById("main").innerHTML =
        `<div class="error-box">Could not load verbs. Check your internet connection and try refreshing.<br><small>${e.message}</small></div>`;
    } else {
      toast("Refresh failed — showing cached data");
    }
  } finally {
    document.getElementById("sync-btn").disabled = false;
  }
}

function esc(s) { return s.replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
function toggle(id) { openCards[id] = !openCards[id]; render(); }
function setTense(id,t) { activeTenses[id] = t; render(); }

function render() {
  const main = document.getElementById("main");
  document.getElementById("search-wrap").style.display = verbs.length ? "" : "none";
  document.getElementById("sync-btn").style.display    = verbs.length ? "" : "none";
  if (!verbs.length) return;

  const q = (document.getElementById("search").value || "").toLowerCase();
  const filtered = verbs.filter(v =>
    v.verb.toLowerCase().includes(q) || v.translation.toLowerCase().includes(q)
  );

  const grouped = {};
  filtered.forEach(v => {
    const l = v.verb[0].toUpperCase();
    if (!grouped[l]) grouped[l] = [];
    grouped[l].push(v);
  });
  const letters = Object.keys(grouped).sort((a,b) => a.localeCompare(b,"el"));

  let html = `<div class="meta-bar">
    <span>${filtered.length} of ${verbs.length} verbs</span>
    <span>click any verb to expand</span>
  </div>`;

  if (!filtered.length) {
    html += `<div class="empty-state">No match for "${q}"</div>`;
    main.innerHTML = html;
    return;
  }

  letters.forEach(letter => {
    html += `<div class="letter-group">
      <div class="letter-heading">
        <span class="letter-label">${letter}</span>
        <div class="letter-line"></div>
        <span class="letter-count">${grouped[letter].length}</span>
      </div>
      <div class="verb-list">`;

    grouped[letter].forEach(v => {
      const id    = v.verb;
      const isOpen = !!openCards[id];
      const tense  = activeTenses[id] || "present";
      const forms  = v.conjugations[tense] || [];

      html += `<div class="verb-card${isOpen ? " open" : ""}">
        <div class="verb-header" onclick="toggle('${esc(id)}')">
          <div class="verb-label">
            <span class="verb-name">${v.verb}</span>
            <span class="verb-trans">${v.translation}</span>
          </div>
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>`;

      if (isOpen) {
        html += `<div class="verb-body">
          <div class="tense-tabs">
            ${TENSES.map(t => `<button class="tense-tab${tense===t?" active":""}" onclick="event.stopPropagation();setTense('${esc(id)}','${t}')">${LABELS[t]}</button>`).join("")}
          </div>
          <div class="conj-table">
            ${PERSONS.map((p,i) => `<div class="conj-row"><span class="person">${p}</span><span class="form">${forms[i]||"—"}</span></div>`).join("")}
          </div>
        </div>`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
  });

  main.innerHTML = html;
}

// Boot
try { const s = sessionStorage.getItem("gk_verbs"); if (s) verbs = JSON.parse(s); } catch {}
render();
sync();
