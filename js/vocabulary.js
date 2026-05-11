// ── Supabase config ───────────────────────────────────────────────────────
const SUPABASE_URL = "https://nppqvufmexrwdkkjwccy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHF2dWZtZXhyd2Rra2p3Y2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDQ1MDMsImV4cCI6MjA5NDA4MDUwM30.a8vhhZ1kMIHuLOT6auwzVtGrSS2XI4idMwohl-I_3aI";

let words = [];
let genderFilter = "all";

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

// Map Greek article → gender code used by the UI
function mapGender(g) {
  if (!g) return "";
  const v = g.trim();
  if (v === "ο") return "m";
  if (v === "η") return "f";
  if (v === "το") return "n";
  // already coded
  if (v === "m" || v === "masculine") return "m";
  if (v === "f" || v === "feminine")  return "f";
  if (v === "n" || v === "neuter")    return "n";
  return v;
}

// Transform flat Supabase row → shape expected by render()
function transformWord(row) {
  return {
    word: row.greek,
    translation: row.english,
    gender: mapGender(row.gender),
    plural: row.plural,
    "example sentence": row.example_sentence,
    notes: row.notes
  };
}

function setFilter(g) {
  genderFilter = g;
  ["all","m","f","n"].forEach(x => {
    const btn = document.getElementById("f-"+x);
    btn.className = "filter-btn" + (x===g ? " active-"+g : "");
  });
  render();
}

async function sync() {
  document.getElementById("sync-btn").disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vocabulary?select=*&order=greek`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Empty response");
    words = data.map(transformWord);
    sessionStorage.setItem("gk_vocab", JSON.stringify(words));
    toast(`${words.length} words loaded`);
    render();
  } catch(e) {
    if (!words.length) {
      document.getElementById("main").innerHTML =
        `<div class="error-box">Could not load vocabulary. Check your internet connection and try refreshing.<br><small>${e.message}</small></div>`;
    } else {
      toast("Refresh failed — showing cached data");
    }
  } finally {
    document.getElementById("sync-btn").disabled = false;
  }
}

function genderClass(g) {
  if (g==="m") return "gender-m";
  if (g==="f") return "gender-f";
  if (g==="n") return "gender-n";
  return "";
}
function genderLabel(g) { return g || ""; }

function matchesFilter(w) {
  if (genderFilter==="all") return true;
  return w.gender === genderFilter;
}

function render() {
  const main = document.getElementById("main");
  const sw   = document.getElementById("search-wrap");
  const fw   = document.getElementById("filter-wrap");
  const sb   = document.getElementById("sync-btn");

  const hasData = words.length > 0;
  sw.style.display = fw.style.display = sb.style.display = hasData ? "" : "none";
  if (!hasData) return;

  const q = (document.getElementById("search").value||"").toLowerCase();
  const filtered = words.filter(w =>
    matchesFilter(w) && (
      (w.word||"").toLowerCase().includes(q) ||
      (w.translation||"").toLowerCase().includes(q) ||
      (w.plural||"").toLowerCase().includes(q)
    )
  );

  const grouped = {};
  filtered.forEach(w => {
    const l = (w.word||"?")[0].toUpperCase();
    if (!grouped[l]) grouped[l] = [];
    grouped[l].push(w);
  });
  const letters = Object.keys(grouped).sort((a,b) => a.localeCompare(b,"el"));

  let html = `<div class="meta-bar"><span>${filtered.length} of ${words.length} words</span></div>`;

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
      <div class="word-list">`;

    grouped[letter].forEach(w => {
      const gc = genderClass(w.gender);
      const gl = genderLabel(w.gender);
      html += `<div class="word-card">
        <div class="word-main">
          <span class="word-greek">${w.word||""}</span>
          ${gc ? `<span class="gender-badge ${gc}">${gl}</span>` : ""}
        </div>
        <span class="word-plural">${w.plural||"—"}</span>
        <span class="word-translation">${w.translation||""}</span>
        ${w["example sentence"] ? `<span class="word-example">${w["example sentence"]}</span>` : ""}
        ${w.notes ? `<span class="word-notes">${w.notes}</span>` : ""}
      </div>`;
    });

    html += `</div></div>`;
  });

  main.innerHTML = html;
}

// Boot
try { const s = sessionStorage.getItem("gk_vocab"); if (s) words = JSON.parse(s); } catch {}
render();
sync();
