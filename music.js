// Docked in-app music player (fixed spot on every tab) that shares "now playing" via Firestore.
// Firestore: couples/{id}.np.{uid} = {t, a, on, ts}
let C = null, upd = null, tgOpen = null, D = null, open = false, hb = null;
const au = new Audio(); let Q = [], cur = -1;
const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
// Playlists live on this phone: [{n: name, ids: [song ids]}]. sel = open playlist ('' = all songs).
let PL = jget('m_pl', []), sel = jget('m_sel', ''), mode = jget('m_mode', 'all'), shuf = jget('m_shuf', false), editing = false;
const curPL = () => PL.find(p => p.n === sel) || null;
const act = () => { const p = curPL(); return p ? p.ids.map(id => Q.findIndex(s => s.id === id)).filter(i => i >= 0) : Q.map((_, i) => i); };
au.preload = 'metadata';

// Songs are kept in IndexedDB (a copy of each file) so the queue survives refreshes.
let db = null;
const idb = () => db ? Promise.resolve(db) : new Promise((res, rej) => { const r = indexedDB.open('mplayer', 1); r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id', autoIncrement: true }); r.onsuccess = () => res(db = r.result); r.onerror = () => rej(r.error); });
const tx = (mode, fn) => idb().then(d => new Promise((res, rej) => { const t = d.transaction('songs', mode); const out = fn(t.objectStore('songs')); t.oncomplete = () => res(out && out.result); t.onerror = t.onabort = () => rej(t.error); }));
const ready = (async () => {
  try {
    const rows = await tx('readonly', s => s.getAll());
    Q = (rows || []).map(r => ({ id: r.id, url: URL.createObjectURL(r.blob), t: r.t, a: r.a }));
    const k = +localStorage.getItem('m_cur'); if (Q[k]) { cur = k; au.src = Q[k].url; }
  } catch (e) { /* no storage available: player still works for this session */ }
  drawBar(); drawPanel();
})();

export function initMusic(c, updFn, telegramFn) { C = c; upd = updFn; tgOpen = telegramFn; }

const clean = n => n.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/_+/g, ' ').trim();
const meta = f => { const n = clean(f.name), m = n.split(/\s+[-–]\s+/); return m.length > 1 ? { a: m[0].trim(), t: m.slice(1).join(' - ').trim() } : { a: '', t: n }; };
const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const npOf = u => { const n = C && C.couple() && C.couple().np; return (n && u && n[u]) || null; };
const live = n => !!(n && n.on && Date.now() - n.ts < 15e4);
const label = n => (n.a ? n.a + ' – ' : '') + n.t;
const $ = s => D && D.querySelector(s);

export function npLine(uid) { const n = npOf(uid); return live(n) ? '🎵 ' + C.esc(label(n)) : ''; }
export function musicTick() { ensure(); drawBar(); if (open) drawPart(); }
export function openMusicModal() { ensure(); if (!D) return; open = !open; $('#mpanel').style.display = open ? 'block' : 'none'; $('#mex').textContent = open ? '▾' : '▴'; if (open) { drawPart(); drawPanel(); } }

function share(on) {
  if (!C || !C.couple() || cur < 0 || !Q[cur]) return;
  const t = Q[cur]; upd({ [`np.${C.me().uid}`]: { t: t.t, a: t.a, on, ts: Date.now() } }).catch(() => {});
}
function setSession() {
  if (!('mediaSession' in navigator) || cur < 0) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: Q[cur].t, artist: Q[cur].a });
  navigator.mediaSession.setActionHandler('play', () => au.play());
  navigator.mediaSession.setActionHandler('pause', () => au.pause());
  navigator.mediaSession.setActionHandler('nexttrack', () => go(1));
  navigator.mediaSession.setActionHandler('previoustrack', () => go(-1));
}
function play(k) { if (!Q[k]) return; cur = k; try { localStorage.setItem('m_cur', k); } catch (e) {} au.src = Q[k].url; au.play().catch(() => {}); setSession(); drawBar(); drawPanel(); }
async function rm(k) {
  const s = Q[k]; if (!s) return;
  if (k === cur) { share(false); au.pause(); au.removeAttribute('src'); cur = -1; } else if (k < cur) cur--;
  URL.revokeObjectURL(s.url); Q.splice(k, 1); PL.forEach(p => p.ids = p.ids.filter(i => i !== s.id)); jset('m_pl', PL);
  try { localStorage.setItem('m_cur', cur); } catch (e) {}
  if (s.id != null) try { await tx('readwrite', st => st.delete(s.id)); } catch (e) {}
  drawBar(); drawPanel();
}
async function clearAll() {
  share(false); au.pause(); au.removeAttribute('src'); Q.forEach(s => URL.revokeObjectURL(s.url)); Q = []; cur = -1; PL = []; sel = ''; jset('m_pl', PL); jset('m_sel', sel);
  try { localStorage.setItem('m_cur', -1); } catch (e) {}
  try { await tx('readwrite', st => st.clear()); } catch (e) {}
  drawBar(); drawPanel();
}
function go(d) {
  const a = act(); if (!a.length) return;
  if (shuf && d > 0 && a.length > 1) { let n; do { n = a[Math.floor(Math.random() * a.length)]; } while (n === cur); return play(n); }
  const p = a.indexOf(cur); play(a[p < 0 ? 0 : (p + d + a.length) % a.length]);
}
function newPL() { const n = (prompt('Playlist name:') || '').trim().slice(0, 30); if (!n) return; if (!PL.some(p => p.n === n)) { PL.push({ n, ids: [] }); jset('m_pl', PL); } sel = n; jset('m_sel', sel); editing = true; drawPanel(); }
function delPL() { const p = curPL(); if (!p || !confirm('Delete playlist “' + p.n + '”? Your songs stay.')) return; PL = PL.filter(x => x !== p); sel = ''; editing = false; jset('m_pl', PL); jset('m_sel', sel); drawPanel(); }
function toggleIn(k) { const p = curPL(), s = Q[k]; if (!p || !s) return; if (s.id == null) { C.toast && C.toast('That song wasn’t saved, so it can’t go in a playlist'); return; } p.ids = p.ids.includes(s.id) ? p.ids.filter(i => i !== s.id) : [...p.ids, s.id]; jset('m_pl', PL); drawPanel(); }
function outPL(k) { const p = curPL(), s = Q[k]; if (!p || !s) return; p.ids = p.ids.filter(i => i !== s.id); jset('m_pl', PL); drawPanel(); }

au.onplay = () => { share(true); clearInterval(hb); hb = setInterval(() => share(true), 60000); drawBar(); drawPanel(); };
au.onpause = () => { clearInterval(hb); share(false); drawBar(); drawPanel(); };
au.onended = () => { if (mode === 'one') { au.currentTime = 0; au.play(); return; } const a = act(); if (mode === 'off' && !shuf && a.indexOf(cur) === a.length - 1) return; go(1); };
au.ontimeupdate = () => { if (!open || !D) return; const s = $('#mseek'); if (s && document.activeElement !== s) { s.max = au.duration || 0; s.value = au.currentTime; } $('#mtime').textContent = fmt(au.currentTime) + ' / ' + fmt(au.duration); };

function drawBar() {
  if (!D) return;
  const p = C.pid(), n = npOf(p), who = p ? C.nameOf(p) : 'Partner';
  $('#mbp').textContent = au.paused ? '▶' : '⏸';
  $('#mtxt').innerHTML = `<div class="ml">${cur >= 0 ? '🎧 ' + C.esc(label(Q[cur])) : (Q.length ? 'Tap ▶ to play your songs' : 'Tap ▶ to add your songs')}</div><div class="ml muted">${C.esc(who)}: ${live(n) ? '🎵 ' + C.esc(label(n)) : 'not playing'}</div>`;
}
function drawPart() {
  const el = $('#mpart'); if (!el) return;
  const p = C.pid(), n = npOf(p), who = p ? C.nameOf(p) : 'Partner';
  el.innerHTML = `<small class="muted">${C.esc(who)}</small><div style="margin-top:2px">` + (!n ? '<span class="muted">Nothing shared yet</span>' :
    `<b>${C.esc(n.t)}</b>${n.a ? `<div class="muted" style="font-size:13px">${C.esc(n.a)}</div>` : ''}<div style="font-size:12px;margin-top:2px;color:${live(n) ? '#1f9d8f' : 'var(--muted)'}">${live(n) ? '● Playing now' : 'Last played ' + ago(n.ts)}</div>`) + '</div>';
}
function drawPanel() {
  if (!D || !open) return;
  const t = Q[cur];
  $('#mnow').innerHTML = t ? `<b>${C.esc(t.t)}</b><div class="muted" style="font-size:13px">${C.esc(t.a || 'You’re playing')}</div>` : '<span class="muted">Add songs from your phone to start</span>';
  $('#mpp').textContent = au.paused ? '▶' : '⏸';
  const p = curPL();
  $('#msel').innerHTML = '<option value="">All songs</option>' + PL.map(x => `<option value="${C.esc(x.n)}"${x.n === sel ? ' selected' : ''}>${C.esc(x.n)}</option>`).join('');
  $('#mdel').style.display = $('#med').style.display = p ? '' : 'none'; $('#med').textContent = editing ? '✔ Done' : '✎ Edit';
  $('#mshuf').style.opacity = shuf ? 1 : .4; $('#mrep').textContent = mode === 'one' ? '🔂' : '🔁'; $('#mrep').style.opacity = mode === 'off' ? .4 : 1;
  const rows = act().map(k => { const s = Q[k]; return `<div data-q="${k}" style="display:flex;align-items:center;gap:6px;padding:7px 8px;border-radius:10px;cursor:pointer;font-size:14px;${k === cur ? 'background:var(--bg);font-weight:700' : ''}"><span class="ml" style="flex:1;min-width:0">${C.esc(label(s))}</span><button data-rm="${k}" class="btn ghost small" aria-label="${p ? 'Remove from playlist' : 'Remove song'}" style="flex:none;padding:2px 8px">✕</button></div>`; }).join('');
  $('#mq').innerHTML = editing && p ? Q.map((s, k) => `<div data-tg="${k}" style="padding:7px 8px;cursor:pointer;font-size:14px">${p.ids.includes(s.id) ? '✅' : '⬜'} ${C.esc(label(s))}</div>`).join('') : (rows || `<p class="muted" style="font-size:13px;margin:4px 0">${p ? 'Empty playlist. Tap ✎ Edit to add songs.' : ''}</p>`);
}

function ensure() {
  if (D || !C || !C.couple()) return;
  D = document.createElement('div'); D.id = 'mdock';
  D.style.cssText = 'position:fixed;left:14px;bottom:96px;z-index:60;width:min(290px,calc(100vw - 100px));color:var(--ink)';
  D.innerHTML = `<style>#mdock .ml{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mdock .ml.muted{font-size:11px}</style>
<div id="mpanel" style="display:none;background:var(--card);border:1.5px solid var(--line);border-radius:18px;padding:12px;margin-bottom:8px;max-height:60vh;overflow:auto;box-shadow:0 4px 14px rgba(0,0,0,.18)">
<b style="font-size:15px">🎵 Our music</b><div id="mpart" style="padding:8px 0"></div>
<div style="border-top:1px solid var(--line);padding-top:8px"><small class="muted">You</small><div id="mnow" style="margin:2px 0 6px"></div>
<input type="range" id="mseek" min="0" max="0" step="1" value="0" style="width:100%"><div id="mtime" class="muted" style="font-size:12px;text-align:right">0:00 / 0:00</div>
<div class="row" style="gap:6px;justify-content:center;align-items:center;margin:6px 0"><button class="btn ghost small" id="mshuf" aria-label="Shuffle">🔀</button><button class="btn ghost" id="mprev" aria-label="Previous">⏮</button><button class="btn" id="mpp" aria-label="Play or pause">▶</button><button class="btn ghost" id="mnext" aria-label="Next">⏭</button><button class="btn ghost small" id="mrep" aria-label="Repeat mode">🔁</button></div>
<div class="row" style="gap:6px;margin:6px 0"><select id="msel" aria-label="Playlist" style="flex:1;min-width:0"></select><button class="btn ghost small" id="mnew" aria-label="New playlist">＋</button><button class="btn ghost small" id="med">✎ Edit</button><button class="btn ghost small" id="mdel" aria-label="Delete playlist">🗑</button></div>
<div id="mq" style="max-height:24vh;overflow:auto;margin:6px 0"></div>
<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small" id="madd">＋ Add songs</button><button class="btn small" id="mpl">▶ Play list</button><button class="btn ghost small" id="mclr">Clear</button><button class="btn ghost small" id="mtg">Telegram</button></div>
<p class="muted" style="font-size:12px;margin:8px 0 0">Keep the app open so your partner can see what’s playing. Your songs are saved on this phone, so they’re still here after a refresh.</p></div></div>
<div id="mbar" style="display:flex;align-items:center;gap:8px;background:var(--card);border:1.5px solid var(--line);border-radius:26px;padding:6px 8px;box-shadow:0 4px 14px rgba(0,0,0,.18)">
<button id="mbp" class="btn small" aria-label="Play or pause" style="border-radius:50%;width:38px;height:38px;padding:0;flex:none">▶</button>
<div id="mtxt" style="flex:1;min-width:0;font-size:12px;line-height:1.3"></div>
<button id="mex" class="btn ghost small" aria-label="Open player" style="flex:none">▴</button></div>
<input type="file" id="mf" accept="audio/*" multiple hidden>`;
  document.body.appendChild(D);
  D.onclick = e => {
    const b = e.target.closest('button'), q = e.target.closest('[data-q]'), id = b ? b.id : '';
    const r = e.target.closest('[data-rm]');
    const tg = e.target.closest('[data-tg]');
    if (r) { curPL() ? outPL(+r.dataset.rm) : rm(+r.dataset.rm); }
    else if (tg) toggleIn(+tg.dataset.tg);
    else if (q) play(+q.dataset.q);
    else if (id === 'mex') openMusicModal();
    else if (id === 'mbp' || id === 'mpp') { if (cur < 0) { const a = act(); a.length ? play(a[0]) : $('#mf').click(); } else au.paused ? au.play() : au.pause(); }
    else if (id === 'mnext') go(1); else if (id === 'mprev') go(-1);
    else if (id === 'madd') $('#mf').click();
    else if (id === 'mclr') clearAll();
    else if (id === 'mshuf') { shuf = !shuf; jset('m_shuf', shuf); drawPanel(); }
    else if (id === 'mrep') { mode = mode === 'all' ? 'one' : mode === 'one' ? 'off' : 'all'; jset('m_mode', mode); drawPanel(); C.toast && C.toast({ all: 'Repeat all', one: 'Repeat one', off: 'No repeat' }[mode]); }
    else if (id === 'mnew') newPL();
    else if (id === 'mdel') delPL();
    else if (id === 'med') { editing = !editing; drawPanel(); }
    else if (id === 'mpl') { const a = act(); if (a.length) play(shuf ? a[Math.floor(Math.random() * a.length)] : a[0]); }
    else if (id === 'mtg') tgOpen && tgOpen();
  };
  $('#mf').onchange = async e => {
    const fs = [...e.target.files].filter(f => f.type.startsWith('audio') || /\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(f.name)); e.target.value = '';
    await ready; const first = Q.length; let failed = false;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    for (const f of fs) {
      const m = meta(f); let id = null;
      try { id = await tx('readwrite', st => st.add({ t: m.t, a: m.a, blob: f })); } catch (err) { failed = true; }
      Q.push({ id, url: URL.createObjectURL(f), ...m });
    }
    { const p = curPL(); if (p) { p.ids.push(...Q.slice(first).map(s => s.id).filter(i => i != null)); jset('m_pl', PL); } }
    if (failed) C.toast && C.toast('Couldn’t save some songs for next time (storage full?)');
    if (cur < 0 && Q.length > first) play(first); else { drawBar(); drawPanel(); }
  };
  $('#mseek').oninput = e => { au.currentTime = +e.target.value; };
  $('#msel').onchange = e => { sel = e.target.value; editing = false; jset('m_sel', sel); drawPanel(); };
  setInterval(() => { drawBar(); if (open) drawPart(); }, 30000);
}
