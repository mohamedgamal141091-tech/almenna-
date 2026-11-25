'use strict';
/* المنة للأندرويد — النواة: الإعدادات الإضافية، التلاوة المتقدمة، قارئ الشاشة، زر الرجوع، والأدوات المشتركة.
   يعتمد على ما يعرّفه app.js (S و VIEWS و go و setAyah …) لأنه يُحمّل بعده. */
const XE = window.MennaEnv;
const XP = XE.P;
const H = window.MennaHooks = window.MennaHooks || {};
const st = () => S.settings;
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ ثوابت القرآن
const JUZ = [[1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41], [9, 93], [11, 6], [12, 53], [15, 1], [17, 1],
  [18, 75], [21, 1], [23, 1], [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]];
const SAJDA = ['7:206', '13:15', '16:50', '17:109', '19:58', '22:18', '22:77', '25:60', '27:26', '32:15', '38:24', '41:38', '53:62', '84:21', '96:19'];
const TOTAL = 6236;
const LETTERS = { 'ا': 'ألف', 'أ': 'ألف عليها همزة', 'إ': 'ألف تحتها همزة', 'آ': 'ألف ممدودة', 'ٱ': 'ألف وصل', 'ء': 'همزة', 'ؤ': 'واو عليها همزة', 'ئ': 'ياء عليها همزة',
  'ب': 'باء', 'ت': 'تاء', 'ة': 'تاء مربوطة', 'ث': 'ثاء', 'ج': 'جيم', 'ح': 'حاء', 'خ': 'خاء', 'د': 'دال', 'ذ': 'ذال', 'ر': 'راء', 'ز': 'زاي', 'س': 'سين',
  'ش': 'شين', 'ص': 'صاد', 'ض': 'ضاد', 'ط': 'طاء', 'ظ': 'ظاء', 'ع': 'عين', 'غ': 'غين', 'ف': 'فاء', 'ق': 'قاف', 'ك': 'كاف', 'ل': 'لام', 'م': 'ميم', 'ن': 'نون',
  'ه': 'هاء', 'و': 'واو', 'ي': 'ياء', 'ى': 'ألف مقصورة' };
const MARKS = { 'َ': 'فتحة', 'ُ': 'ضمة', 'ِ': 'كسرة', 'ً': 'تنوين فتح', 'ٌ': 'تنوين ضم', 'ٍ': 'تنوين كسر', 'ّ': 'شدة', 'ْ': 'سكون', 'ۡ': 'سكون', 'ٰ': 'ألف خنجرية', 'ٓ': 'مدة' };

function juzOf(s, a) { let j = 1; for (let i = 0; i < 30; i++) { const [js, ja] = JUZ[i]; if (s > js || (s === js && a >= ja)) j = i + 1; } return j; }
function fromGlobal(g) { g = Math.max(1, Math.min(TOTAL, g)); for (let s = 1; s <= 114; s++) { const n = surah(s).ayahs; if (g <= n) return [s, g]; g -= n; } return [114, 6]; }
function simple(s, a) { const t = S.quran[s][a - 1][1]; return a === 1 && s !== 1 && s !== 9 ? t.replace(/^بسم الله الرحمن الرحيم ?/, '') : t; }
function words(s, a) { return ayahText(s, a).split(/\s+/).filter(Boolean); }
function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }
function dayNumber() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
function ref(s, a) { return `${surah(s).name}: ${ar(a)}`; }
function xsave() { return save(); }
function surahOptions(sel) { return S.meta.surahs.map((x) => `<option value="${x.n}"${x.n === sel ? ' selected' : ''}>${ar(x.n)}. ${esc(x.name)}</option>`).join(''); }
function say(msg, urgent) { if (urgent || st().urgentMsgs) alertMsg(msg); else announce(msg); }

// ------------------------------------------------------------------ النغمات والاهتزاز (78، 79)
let actx = null;
function tone(kind) {
  if (!st().tones) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const f = { ok: [660, 880], nav: [520], err: [330, 220], mark: [784, 988, 1175] }[kind] || [600];
    f.forEach((hz, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = hz; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, actx.currentTime + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.18, actx.currentTime + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * 0.09 + 0.08);
      o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + i * 0.09); o.stop(actx.currentTime + i * 0.09 + 0.1);
    });
  } catch { /* no audio */ }
}
function buzz(kind) {
  if (st().haptics === false) return;
  try {
    if (XP.Haptics) { kind === 'err' ? XP.Haptics.notification({ type: 'ERROR' }) : XP.Haptics.impact({ style: kind === 'ok' ? 'MEDIUM' : 'LIGHT' }); }
    else if (navigator.vibrate) navigator.vibrate(kind === 'err' ? [60, 60, 60] : 30);
  } catch { /* none */ }
}
function done(msg, kind = 'ok') { tone(kind); buzz(kind); say(msg, kind === 'err'); }

// ------------------------------------------------------------------ سجل الأعطال (99)
function logError(msg) {
  try {
    const log = JSON.parse(localStorage.getItem('almenna.log') || '[]');
    log.push({ at: new Date().toISOString(), msg: String(msg).slice(0, 500), view: S.view });
    localStorage.setItem('almenna.log', JSON.stringify(log.slice(-100)));
  } catch { /* full */ }
}
window.addEventListener('error', (e) => { logError(e.message + ' @' + (e.filename || '') + ':' + (e.lineno || '')); });
window.addEventListener('unhandledrejection', (e) => { logError('promise: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)); });

// ------------------------------------------------------------------ عرض النصوص لقارئ الشاشة (75، 76، 77، 90)
const HONOR = [[/ﷺ/g, 'صلى الله عليه وسلم'], [/﵁/g, 'رضي الله عنه'], [/﵂/g, 'رضي الله عنها'], [/﵃/g, 'رضي الله عنهما'], [/﵄/g, 'رضي الله عنهما'], [/﵅/g, 'رضي الله عنهم'], [/ؒ/g, 'رحمه الله'], [/ؓ/g, 'رضي الله عنه']];
function fixText(t) {
  const o = st();
  if (o.honorifics !== false) for (const [re, w] of HONOR) t = t.replace(re, ' ' + w + ' ');
  if (o.noBrackets) t = t.replace(/[﴿﴾]/g, '');
  if (o.westDigits) t = t.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  return t;
}
function processNode(root) {
  const o = st();
  if (o.honorifics === false && !o.noBrackets && !o.westDigits && !o.noTashkil) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const list = []; while (w.nextNode()) list.push(w.currentNode);
  for (const n of list) {
    if (n.parentElement && n.parentElement.closest('textarea, input, script, style')) continue;
    let t = fixText(n.nodeValue);
    if (o.noTashkil && n.parentElement && n.parentElement.closest('.ayah-text, .x-ayah')) t = t.replace(/[ً-ٰٟۖ-ۭ]/g, '');
    if (t !== n.nodeValue) n.nodeValue = t;
  }
}
let mo = null;
function watchMain() {
  if (mo) return;
  mo = new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach((n) => { if (n.nodeType === 1) { processNode(n); applyHadithFilter(n); } }); });
  mo.observe($main, { childList: true, subtree: true });
}

// ------------------------------------------------------------------ المظهر (80–86)
function applyX() {
  const o = st(), r = document.documentElement;
  r.style.setProperty('--ayah-fs', (o.ayahSize || Math.round((o.fontSize || 20) * 1.35)) + 'px');
  r.style.setProperty('--lh', String(o.lineHeight || 1.9));
  r.style.setProperty('--ws', (o.wordSpacing || 0) + 'em');
  r.classList.toggle('big-targets', !!o.bigTargets);
  r.classList.toggle('reduce-motion', !!o.reduceMotion);
  r.classList.toggle('simple-ui', !!o.simpleUi);
  r.classList.toggle('focus-mode', !!S.focusMode);
}
const _applyLook = applyLook;
applyLook = function () { _applyLook(); applyX(); };   // eslint-disable-line no-func-assign

// ------------------------------------------------------------------ التلاوة المتقدمة (21–32)
const R = { left: 0, cur: '', range: null, rangeLeft: 0, sleep: null, lock: null };
H.playLabel = () => 'استمع إلى الآية بصوت ' + (window.MennaReciters[window.MennaAudio.reciter()] || {}).name;
H.beforePlay = (pl, s, a) => {
  const o = st();
  pl.playbackRate = o.rate || 1;
  pl.volume = o.volume == null ? 1 : o.volume;
  if (o.announcePlay) announce(`${surah(s).name}، الآية ${a}`);
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: `${surah(s).name} — الآية ${a}`, artist: (window.MennaReciters[window.MennaAudio.reciter()] || {}).name, album: 'المنة' });
      navigator.mediaSession.setActionHandler('pause', () => stopPlay());
      navigator.mediaSession.setActionHandler('play', () => { if (!S.playing) togglePlay(); });
      navigator.mediaSession.setActionHandler('nexttrack', () => { const n = nextAyah(S.settings.surah, S.settings.ayah); if (n) { stopPlay(true); setAyah(n[0], n[1]).then(() => togglePlay()); } });
      navigator.mediaSession.setActionHandler('previoustrack', () => { stopPlay(true); step(-1); setTimeout(togglePlay, 300); });
    } catch { /* unsupported */ }
  }
  if (o.keepAwake !== false && 'wakeLock' in navigator && !R.lock) navigator.wakeLock.request('screen').then((l) => { R.lock = l; l.addEventListener('release', () => { R.lock = null; }); }).catch(() => {});
};
H.afterPlay = (s, a) => {
  const k = s + ':' + a;
  if (R.cur !== k) { R.cur = k; R.left = Math.max(1, st().repeat || 1); }
  tone('nav');
};
function pause(ms) { return new Promise((ok) => setTimeout(ok, ms)); }
H.onEnded = async (pl) => {
  const o = st();
  const gap = (o.gap || 0) * 1000 || (o.gapAuto ? pl.duration * 1000 : 0);
  if (R.left > 1) {
    R.left--;
    if (gap) await pause(gap);
    if (!S.playing) return true;
    pl.currentTime = 0; pl.play().catch(() => {});
    return true;
  }
  if (R.range) {
    const s = S.settings.surah, a = S.settings.ayah;
    if (s === R.range.s && a < R.range.to) {
      if (gap) await pause(gap);
      if (!S.playing) return true;
      R.cur = '';
      const going = playAyah(s, a + 1); await setAyah(s, a + 1, '#btn-play', true); await going; return true;
    }
    if (R.rangeLeft > 1) {
      R.rangeLeft--; if (gap) await pause(gap); if (!S.playing) return true;
      R.cur = ''; const going = playAyah(s, R.range.from); await setAyah(s, R.range.from, '#btn-play', true); await going; return true;
    }
    R.range = null; S.playing = false; setPlayLabel(); releaseLock(); done('انتهت تلاوة المقطع'); return true;
  }
  if (gap && st().follow) await pause(gap);
  return false;
};
function releaseLock() { if (R.lock) { R.lock.release().catch(() => {}); R.lock = null; } }
const _stopPlay = stopPlay;
stopPlay = function (quiet) { if (!quiet) R.stopped = true; R.range = null; releaseLock(); _stopPlay(quiet); };   // eslint-disable-line no-func-assign
function playRange(s, from, to, times) {
  stopPlay(true);
  R.range = { s, from, to }; R.rangeLeft = Math.max(1, times || 1); R.cur = '';
  setAyah(s, from).then(() => playAyah(s, from));
}
function setSleep(min) {
  if (R.sleep) clearTimeout(R.sleep);
  R.sleep = null;
  if (min > 0) { R.sleep = setTimeout(() => { stopPlay(); done('انتهى مؤقت التلاوة فتوقفت'); }, min * 60000); announce(`ستتوقف التلاوة بعد ${min} دقيقة`); } else announce('أُلغي مؤقت الإيقاف');
}
async function saveSurahAudio(s) {
  const n = surah(s).ayahs; let ok = 0, bad = 0;
  S.downloads['audio'] = { done: 0, total: n, title: `تلاوة سورة ${surah(s).name}` }; showDlBar();
  announce(`بدأ حفظ تلاوة سورة ${surah(s).name}`);
  for (let a = 1; a <= n; a++) {
    try { if (!(await window.MennaAudio.audioLocal(s, a))) await window.MennaAudio.audioSave(s, a, globalAyah(s, a)); ok++; } catch { bad++; }
    S.downloads['audio'].done = a; showDlBar();
  }
  delete S.downloads['audio']; showDlBar();
  if (bad) done(`حُفظت ${ok} آية وتعذّر ${bad}. تحقق من الإنترنت ثم أعد المحاولة.`, 'err'); else done(`حُفظت تلاوة سورة ${surah(s).name} كاملة، وتعمل الآن بلا إنترنت.`);
}

// ------------------------------------------------------------------ الإعلان عند تغيير الآية، السجل، آخر موضع (7، 72، 74)
H.onAyah = (s, a) => {
  const o = st();
  o.history = [s + ':' + a].concat((o.history || []).filter((x) => x !== s + ':' + a)).slice(0, 50);
  o.lastIn = o.lastIn || {}; o.lastIn[s] = a;
  markActivity();
  if (o.verbose) setTimeout(() => announce(positionText(s, a)), 400);
  if (SAJDA.includes(s + ':' + a) && o.sajdaNote !== false) setTimeout(() => say('هذه آية سجدة'), 900);
  tone('nav');
};
function positionText(s, a) {
  return `سورة ${surah(s).name}، ${surah(s).type}، الآية ${a} من ${surah(s).ayahs}، الجزء ${juzOf(s, a)}${SAJDA.includes(s + ':' + a) ? '، آية سجدة' : ''}`;
}
function markActivity() {
  const o = st(); o.days = o.days || [];
  const d = today(); if (o.days[o.days.length - 1] !== d) { o.days.push(d); o.days = o.days.slice(-400); }
}
function streak() {
  const ds = new Set(st().days || []); let n = 0; let d = today();
  if (!ds.has(d)) d = addDays(d, -1);
  while (ds.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// ------------------------------------------------------------------ وقت القراءة (54)
let visibleSince = Date.now();
function flushTime() {
  const o = st(); if (!o) return;
  const m = (Date.now() - visibleSince) / 60000; visibleSince = Date.now();
  if (m <= 0 || m > 120) return;
  o.minutes = o.minutes || {}; o.minutes[today()] = (o.minutes[today()] || 0) + m;
  const keys = Object.keys(o.minutes).sort(); while (keys.length > 60) delete o.minutes[keys.shift()];
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { flushTime(); xsave(); } else visibleSince = Date.now(); });
setInterval(() => { flushTime(); }, 60000);

// ------------------------------------------------------------------ تصفية الأحاديث (57–59)
function applyHadithFilter(root) {
  const f = st().hfilter || 'all';
  const box = root && root.id === 'tbody' ? root : (root && root.querySelector ? root.querySelector('#tbody') : null);
  if (!box || f === 'all') return;
  box.querySelectorAll('article.item[id^="h-"]').forEach((art) => {
    let show = true;
    if (f === 'sahih') show = !!art.querySelector('.grade.S');
    else if (f === 'explicit') show = /ربط صريح/.test(art.textContent);
    else show = !!art.querySelector(`button[data-act="open-hadith"][data-id^="${f}:"]`);
    art.hidden = !show;
  });
}

// ------------------------------------------------------------------ أدوات الآية تحت نصها
H.ayahTools = (s, a) => {
  const o = st();
  const bm = (o.bookmarks || []).some((b) => b.s === s && b.a === a);
  const fav = (o.favs || []).includes(s + ':' + a);
  const memo = isMemo(s, a);
  return `<div class="x-tools" role="group" aria-label="أدوات الآية">
    <button type="button" data-x="bookmark" aria-pressed="${bm}">${bm ? 'إزالة العلامة' : 'وضع علامة'}</button>
    <button type="button" data-x="fav" aria-pressed="${fav}">${fav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}</button>
    <button type="button" data-x="note">ملاحظة تدبر${o.notes && o.notes[s + ':' + a] ? ' (مكتوبة)' : ''}</button>
    <button type="button" data-x="memo" aria-pressed="${memo}">${memo ? 'محفوظة، إلغاء' : 'تحديد كمحفوظة'}</button>
    <button type="button" data-x="share">مشاركة الآية</button>
    <details class="x-more"><summary>أدوات أخرى للآية</summary>
      <button type="button" data-x="info">معلومات الآية</button>
      <button type="button" data-x="copy-ayah">نسخ الآية</button>
      <button type="button" data-x="words">تقطيع الآية كلمة كلمة</button>
      <button type="button" data-x="similar">الآيات المتشابهة لفظًا</button>
      <button type="button" data-x="compare">مقارنة التفاسير المحمّلة</button>
      <button type="button" data-x="share-tafsir">مشاركة الآية مع التفسير المعروض</button>
      <button type="button" data-x="copy-section">نسخ نص التفسير المعروض</button>
      <button type="button" data-x="tags">وسوم الآية${(o.tags || {})[s + ':' + a] ? ': ' + esc(o.tags[s + ':' + a].join('، ')) : ''}</button>
      <button type="button" data-x="range-play">تلاوة مقطع من هذه الآية</button>
      <button type="button" data-x="report">إبلاغ عن خطأ علمي</button>
      <p><label for="x-hfilter">الأحاديث المعروضة</label> <select id="x-hfilter" data-xc="hfilter">
        ${[['all', 'كل الأحاديث'], ['sahih', 'الصحيح والحسن فقط'], ['explicit', 'الربط الصريح فقط']].concat(S.meta.books.map((b) => [b.code, 'ما رواه ' + b.short]))
          .map(([v, l]) => `<option value="${v}"${(o.hfilter || 'all') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></p>
      <p class="nav-ayah"><button type="button" data-x="prev-surah">السورة السابقة</button> <button type="button" data-x="next-surah">السورة التالية</button>
      <button type="button" data-x="random">آية عشوائية</button></p>
    </details>
    <div id="x-out" class="x-out" aria-live="polite"></div></div>`;
};
function out(html, focusHeading = true) {
  const el = $('x-out'); if (!el) return;
  el.innerHTML = html;
  const h = el.querySelector('h3, h4');
  if (focusHeading && h) { h.tabIndex = -1; h.focus(); }
}

// ------------------------------------------------------------------ المحفوظ (33، 34)
function isMemo(s, a) { const m = (st().memo || {})[s]; return !!(m && m.includes(a)); }
function setMemo(s, a, on) {
  const o = st(); o.memo = o.memo || {}; const m = new Set(o.memo[s] || []);
  if (on) m.add(a); else m.delete(a);
  o.memo[s] = [...m].sort((x, y) => x - y);
  if (on) { o.memoLog = o.memoLog || {}; o.memoLog[today()] = (o.memoLog[today()] || 0) + 1; markActivity(); }
}
function memoCount(s) { return ((st().memo || {})[s] || []).length; }
function memoTotal() { let n = 0; for (let s = 1; s <= 114; s++) n += memoCount(s); return n; }

// ------------------------------------------------------------------ أدوات النص
function spell(word) {
  const out = []; let cur = null;
  for (const ch of word) {
    if (LETTERS[ch]) { cur = { l: LETTERS[ch], m: [] }; out.push(cur); } else if (MARKS[ch] && cur) cur.m.push(MARKS[ch]);
    else if (ch === 'ٓ' && cur) cur.m.push('مدة');
  }
  return out.map((x) => x.l + (x.m.length ? ' ' + x.m.join(' و') : '')).join('، ');
}
let wordIndex = null;
function buildWordIndex() {
  if (wordIndex) return wordIndex;
  wordIndex = new Map();
  for (let s = 1; s <= 114; s++) S.quran[s].forEach((v, i) => {
    for (const w of new Set(norm(simple(s, i + 1)).split(' '))) { if (!w) continue; let l = wordIndex.get(w); if (!l) wordIndex.set(w, l = []); l.push([s, i + 1]); }
  });
  return wordIndex;
}
function similarAyahs(s, a, max = 12) {
  const base = new Set(norm(simple(s, a)).split(' ').filter((w) => w.length > 1));
  if (base.size < 3) return [];
  const res = [];
  for (let s2 = 1; s2 <= 114; s2++) S.quran[s2].forEach((v, i) => {
    if (s2 === s && i + 1 === a) return;
    const ws = new Set(norm(simple(s2, i + 1)).split(' ').filter((w) => w.length > 1));
    let inter = 0; for (const w of ws) if (base.has(w)) inter++;
    const sc = inter / (base.size + ws.size - inter);
    if (sc >= 0.4 && inter >= 3) res.push([sc, s2, i + 1]);
  });
  return res.sort((x, y) => y[0] - x[0]).slice(0, max);
}
function wordDiff(expected, got) {   // which words are missing or added (38)
  const A = norm(expected).split(' ').filter(Boolean), B = norm(got).split(' ').filter(Boolean);
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const miss = [], extra = []; let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) miss.push([i, A[i++]]); else extra.push(B[j++]); }
  while (i < n) miss.push([i, A[i++]]); while (j < m) extra.push(B[j++]);
  return { ok: !miss.length && !extra.length, miss, extra, total: n, right: L[0][0] };
}
async function copyText(t, msg) {
  try { await navigator.clipboard.writeText(t); done(msg || 'تم النسخ'); } catch {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(msg || 'تم النسخ'); } catch { done('تعذّر النسخ', 'err'); } ta.remove();
  }
}
async function shareText(title, text) {
  if (XP.Share) { try { await XP.Share.share({ title, text, dialogTitle: 'مشاركة' }); return; } catch (e) { if (/cancel/i.test(String(e && e.message))) return; } }
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch { return; } }
  copyText(text, 'لا تتوفر المشاركة هنا، فنُسخ النص لتلصقه حيث تريد');
}
function ayahPlain(s, a) { return `﴿${ayahText(s, a)}﴾ [${surah(s).name}: ${a}]`; }

// ------------------------------------------------------------------ أحداث أدوات الآية
async function ayahToolClick(act, btn) {
  const o = st(), s = o.surah, a = o.ayah, k = s + ':' + a;
  switch (act) {
    case 'bookmark': {
      o.bookmarks = o.bookmarks || [];
      const i = o.bookmarks.findIndex((b) => b.s === s && b.a === a);
      if (i >= 0) { o.bookmarks.splice(i, 1); btn.textContent = 'وضع علامة'; btn.setAttribute('aria-pressed', 'false'); done('أُزيلت العلامة'); }
      else {
        const groups = [...new Set(o.bookmarks.map((b) => b.g).filter(Boolean))];
        out(`<h3>وضع علامة على ${esc(ref(s, a))}</h3><p><label for="x-bmg">اسم المجموعة (اختياري)</label> <input id="x-bmg" list="x-bmgl" value="${esc(o.lastBmGroup || 'عام')}">
          <datalist id="x-bmgl">${groups.map((g) => `<option value="${esc(g)}">`).join('')}</datalist> <button type="button" data-x="bm-save" class="primary">حفظ العلامة</button></p>`);
        $('x-bmg').focus();
      }
      break;
    }
    case 'bm-save': {
      const g = ($('x-bmg').value || 'عام').trim(); o.lastBmGroup = g;
      o.bookmarks = (o.bookmarks || []).concat([{ s, a, g, at: today() }]); out('');
      const b = $main.querySelector('[data-x="bookmark"]'); if (b) { b.textContent = 'إزالة العلامة'; b.setAttribute('aria-pressed', 'true'); b.focus(); }
      done(`وُضعت العلامة في مجموعة ${g}`, 'mark'); break;
    }
    case 'fav': {
      o.favs = o.favs || []; const on = !o.favs.includes(k);
      o.favs = on ? o.favs.concat([k]) : o.favs.filter((x) => x !== k);
      btn.textContent = on ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'; btn.setAttribute('aria-pressed', String(on));
      done(on ? 'أضيفت الآية إلى المفضلة' : 'أزيلت من المفضلة', 'mark'); break;
    }
    case 'note': {
      if (!(await unlockNotes())) return;
      out(`<h3>ملاحظة تدبر على ${esc(ref(s, a))}</h3><p><label for="x-note">اكتب ملاحظتك</label><br><textarea id="x-note" rows="5">${esc((o.notes || {})[k] ? o.notes[k].t : '')}</textarea></p>
        <p><button type="button" data-x="note-save" class="primary">حفظ الملاحظة</button> ${(o.notes || {})[k] ? '<button type="button" data-x="note-del">حذف الملاحظة</button>' : ''}</p>`);
      $('x-note').focus(); break;
    }
    case 'note-save': {
      const t = $('x-note').value.trim(); o.notes = o.notes || {};
      if (t) o.notes[k] = { t, at: today() }; else delete o.notes[k];
      out(''); done('حُفظت الملاحظة'); break;
    }
    case 'note-del': { delete o.notes[k]; out(''); done('حُذفت الملاحظة'); break; }
    case 'memo': {
      const on = !isMemo(s, a); setMemo(s, a, on);
      btn.textContent = on ? 'محفوظة، إلغاء' : 'تحديد كمحفوظة'; btn.setAttribute('aria-pressed', String(on));
      done(on ? `سُجّلت الآية محفوظة. محفوظك في السورة ${memoCount(s)} من ${surah(s).ayahs}` : 'أُلغي تحديد الحفظ', 'mark'); break;
    }
    case 'share': shareText('آية', ayahPlain(s, a) + '\n— من تطبيق المنة'); break;
    case 'copy-ayah': copyText(ayahPlain(s, a), 'نُسخت الآية'); break;
    case 'info': {
      const ws = words(s, a), letters = norm(simple(s, a)).replace(/ /g, '').length;
      const ord = globalAyah(s, a);
      out(`<h3>معلومات الآية</h3><ul><li>${esc(positionText(s, a))}.</li><li>ترتيبها في المصحف: ${ar(ord)} من ${ar(TOTAL)}.</li>
        <li>عدد كلماتها ${ar(ws.length)}، وعدد حروفها ${ar(letters)} تقريبًا.</li>
        <li>${isMemo(s, a) ? 'سجّلتها محفوظة.' : 'لم تسجّلها محفوظة بعد.'} محفوظك في السورة ${ar(memoCount(s))} من ${ar(surah(s).ayahs)}.</li>
        ${SAJDA.includes(k) ? '<li>هذه إحدى آيات السجود الخمس عشرة.</li>' : ''}</ul>`); break;
    }
    case 'words': {
      const ws = words(s, a);
      out(`<h3>كلمات الآية (${ar(ws.length)})</h3><p class="src">اضغط على الكلمة لتسمع تهجئتها وعدد مواضعها في القرآن.</p>
        <ol class="x-words">${ws.map((w, i) => `<li><button type="button" data-x="word" data-i="${i}" lang="ar">${esc(w)}</button></li>`).join('')}</ol><div id="x-word" aria-live="polite"></div>`); break;
    }
    case 'word': {
      const w = words(s, a)[+btn.dataset.i];
      const key = norm(simple(s, a)).split(' ')[+btn.dataset.i] || norm(w);
      const list = buildWordIndex().get(key) || [];
      $('x-word').innerHTML = `<h4 tabindex="-1">${esc(w)}</h4><p>تهجئتها: ${esc(spell(w)) || '—'}.</p><p>وردت هذه الكلمة بلفظها في ${ar(list.length)} آية.</p>
        ${list.length > 1 ? `<button type="button" data-x="word-list" data-w="${esc(key)}">عرض مواضعها</button>` : ''}`;
      $('x-word').querySelector('h4').focus(); break;
    }
    case 'word-list': {
      const list = (buildWordIndex().get(btn.dataset.w) || []).slice(0, 100);
      btn.insertAdjacentHTML('afterend', `<ul class="plain">${list.map(([s2, a2]) => `<li><button type="button" data-x="goto" data-s="${s2}" data-a="${a2}">${esc(ref(s2, a2))}</button> ${esc(simple(s2, a2).slice(0, 80))}</li>`).join('')}</ul>`);
      btn.remove(); announce(`${list.length} موضعًا`); break;
    }
    case 'similar': {
      out('<p class="loading">جاري البحث عن الآيات المتشابهة…</p>', false);
      await pause(20);
      const list = similarAyahs(s, a);
      out(`<h3>آيات تشبه هذه الآية في ألفاظها (${ar(list.length)})</h3>${list.length ? `<ul class="plain">${list.map(([sc, s2, a2]) => `<li><p>﴿${esc(ayahText(s2, a2))}﴾</p>
        <button type="button" data-x="goto" data-s="${s2}" data-a="${a2}">${esc(ref(s2, a2))}</button> <span class="src">نسبة التشابه ${ar(Math.round(sc * 100))}٪</span></li>`).join('')}</ul>` : '<p>لم أجد آية قريبة في ألفاظها.</p>'}`); break;
    }
    case 'compare': {
      const inst = allTafsirs().filter((t) => S.installed[t.key] && t.key !== 'tadabbur');
      if (!inst.length) { out('<h3>مقارنة التفاسير</h3><p class="note">لم تحمّل كتب تفسير بعد. حمّلها من «المصادر والمراجع».</p>'); break; }
      let h = `<h3>أقوال المفسرين عند ${esc(ref(s, a))}</h3>`;
      for (const t of inst) {
        const gs = await bookGroups(t.key, s); if (!gs) { h += `<h4>${esc(t.short)}</h4><p class="muted">سورة ${esc(surah(s).name)} غير محمّلة من هذا الكتاب.</p>`; continue; }
        const gi = groupForAyah(gs, a);
        h += `<h4>${esc(t.short)}: «${esc(t.title)}»</h4>${gi < 0 ? '<p class="muted">لا كلام عند هذه الآية.</p>' : `<div class="reader">${paragraphs(gs[gi][2]).slice(0, 6).map(([, p]) => `<p>${richText(p)}</p>`).join('')}</div>`}`;
      }
      out(h); break;
    }
    case 'share-tafsir': { const b = $('tbody'); shareText('آية وتفسيرها', ayahPlain(s, a) + '\n\n' + (b ? b.innerText.slice(0, 6000) : '') + '\n— من تطبيق المنة'); break; }
    case 'copy-section': { const b = $('tbody'); copyText(ayahPlain(s, a) + '\n\n' + (b ? b.innerText : ''), 'نُسخ نص التفسير المعروض'); break; }
    case 'tags': {
      const cur = ((o.tags || {})[k] || []).join('، ');
      const all = [...new Set(Object.values(o.tags || {}).flat())];
      out(`<h3>وسوم ${esc(ref(s, a))}</h3><p><label for="x-tag">الوسوم مفصولة بفاصلة، مثل: صبر، دعاء، أحكام</label><br><input id="x-tag" value="${esc(cur)}" size="30"></p>
        ${all.length ? `<p class="src">وسومك السابقة: ${esc(all.join('، '))}</p>` : ''}<button type="button" data-x="tags-save" class="primary">حفظ</button>`);
      $('x-tag').focus(); break;
    }
    case 'tags-save': {
      const list = $('x-tag').value.split(/[،,]/).map((x) => x.trim()).filter(Boolean);
      o.tags = o.tags || {}; if (list.length) o.tags[k] = list; else delete o.tags[k];
      out(''); done('حُفظت الوسوم'); break;
    }
    case 'range-play': {
      out(`<h3>تلاوة مقطع من سورة ${esc(surah(s).name)}</h3>
        <p><label for="x-rf">من الآية</label> <input id="x-rf" type="number" min="1" max="${surah(s).ayahs}" value="${a}" inputmode="numeric">
        <label for="x-rt">إلى الآية</label> <input id="x-rt" type="number" min="1" max="${surah(s).ayahs}" value="${Math.min(surah(s).ayahs, a + 4)}" inputmode="numeric"></p>
        <p><label for="x-rr">تكرار المقطع كله</label> <input id="x-rr" type="number" min="1" max="50" value="1" inputmode="numeric">
        <label for="x-ra">تكرار كل آية</label> <input id="x-ra" type="number" min="1" max="50" value="${st().repeat || 1}" inputmode="numeric"></p>
        <button type="button" data-x="range-go" class="primary">ابدأ التلاوة</button>`);
      $('x-rf').focus(); break;
    }
    case 'range-go': {
      const n = surah(s).ayahs, f = Math.min(n, Math.max(1, +$('x-rf').value || 1)), t = Math.min(n, Math.max(f, +$('x-rt').value || f));
      o.repeat = Math.max(1, +$('x-ra').value || 1);
      playRange(s, f, t, +$('x-rr').value || 1); announce(`تلاوة الآيات ${f} إلى ${t}`); break;
    }
    case 'report': {
      out(`<h3>إبلاغ عن خطأ علمي في ${esc(ref(s, a))}</h3><p><label for="x-rk">نوع الخطأ</label> <select id="x-rk"><option>خطأ في نص</option><option>خطأ في العزو أو التخريج</option>
        <option>خطأ في الحكم على الحديث</option><option>ربط حديث بآية لا تناسبه</option><option>خطأ في النطق أو العرض</option><option>غير ذلك</option></select></p>
        <p><label for="x-rt2">الوصف</label><br><textarea id="x-rt2" rows="4"></textarea></p><button type="button" data-x="report-save" class="primary">حفظ البلاغ</button>
        <p class="src">تُجمع البلاغات في «الأدوات» لترسلها في ملف واحد.</p>`);
      $('x-rk').focus(); break;
    }
    case 'report-save': {
      o.reports = (o.reports || []).concat([{ s, a, type: $('x-rk').value, text: $('x-rt2').value.trim(), view: o.ttype, at: today() }]);
      out(''); done(`حُفظ البلاغ. عندك ${o.reports.length} من البلاغات`); break;
    }
    case 'prev-surah': if (s > 1) await setAyah(s - 1, 1); break;
    case 'next-surah': if (s < 114) await setAyah(s + 1, 1); break;
    case 'random': { const [s2, a2] = fromGlobal(1 + Math.floor(Math.random() * TOTAL)); await setAyah(s2, a2); break; }
    case 'goto': { if (S.view !== 'ayah') await go('ayah'); await setAyah(+btn.dataset.s, +btn.dataset.a); break; }
    default: return false;
  }
  xsave();
  return true;
}

// ------------------------------------------------------------------ قفل الدفتر (71)
async function sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
let notesOpen = false;
async function unlockNotes() {
  if (!st().notesPin || notesOpen) return true;
  const p = window.prompt('دفتر التدبر مقفل. اكتب كلمة السر');
  if (p == null) return false;
  if (await sha(p) === st().notesPin) { notesOpen = true; return true; }
  done('كلمة السر غير صحيحة', 'err'); return false;
}

// ------------------------------------------------------------------ زر الرجوع في الهاتف (17) والسحب (16)
const backStack = [];
H.afterView = (view) => {
  if (view !== backStack[backStack.length - 1]) backStack.push(view);
  if (backStack.length > 30) backStack.shift();
  closeMenu(true);
  const t = { home: 'الرئيسية' }[view];
  document.title = 'المنة' + (t ? ' — ' + t : '');
};
let lastBack = 0;
async function onBack() {
  if ($('menu') && !$('menu').hidden) { closeMenu(); return; }
  if (S.view === 'reader' && S.readerState && S.readerState.back) { const b = S.readerState.back; await go(b.view); if (b.focus) focusId(b.focus); return; }
  if (backStack.length > 1) { backStack.pop(); const v = backStack.pop(); await go(v); return; }
  if (S.view !== 'home') { await go('home'); return; }
  if (Date.now() - lastBack < 2500) { flushTime(); await xsave(); if (XP.App) XP.App.exitApp(); return; }
  lastBack = Date.now(); say('اضغط رجوع مرة أخرى للخروج من التطبيق');
}
if (XP.App) XP.App.addListener('backButton', onBack);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.view !== 'reader') { if ($('menu') && !$('menu').hidden) { e.preventDefault(); closeMenu(); } } });
let tx0 = null;
$main.addEventListener('touchstart', (e) => { if (st().swipe && e.touches.length === 1) tx0 = [e.touches[0].clientX, e.touches[0].clientY]; else tx0 = null; }, { passive: true });
$main.addEventListener('touchend', (e) => {
  if (!tx0 || S.view !== 'ayah') return;
  const dx = e.changedTouches[0].clientX - tx0[0], dy = e.changedTouches[0].clientY - tx0[1]; tx0 = null;
  if (Math.abs(dx) > 90 && Math.abs(dy) < 50) step(dx > 0 ? 1 : -1);
}, { passive: true });

// ------------------------------------------------------------------ القائمة، أين أنا، قائمة العناوين (20، 73)
function openMenu() { const m = $('menu'); m.hidden = false; $('btn-menu').setAttribute('aria-expanded', 'true'); const b = m.querySelector('[aria-current="page"]') || m.querySelector('button'); if (b) b.focus(); }
function closeMenu(silent) { const m = $('menu'); if (!m || m.hidden) return; m.hidden = true; $('btn-menu').setAttribute('aria-expanded', 'false'); if (!silent) $('btn-menu').focus(); }
function whereAmI() {
  const names = Object.fromEntries([...document.querySelectorAll('#tabs button')].map((b) => [b.dataset.view, b.firstChild.textContent.trim()]));
  let t = `أنت في قسم ${names[S.view] || S.view}.`;
  if (['ayah', 'tadabburi', 'mushaf'].includes(S.view)) t += ' ' + positionText(st().surah, st().ayah) + '.';
  if (S.view === 'ayah') t += ` نوع التفسير: ${TYPE_NAME[st().ttype]}.`;
  if (S.playing) t += ' التلاوة تعمل الآن.';
  if (!navigator.onLine) t += ' لا يوجد اتصال بالإنترنت.';
  alertMsg(t);
}
function headingsList() {
  const hs = [...$main.querySelectorAll('h2, h3')].filter((h) => h.offsetParent !== null);
  const box = $('heads');
  if (!hs.length) { say('لا توجد عناوين في هذه الصفحة'); return; }
  box.innerHTML = `<h2 id="heads-h" tabindex="-1">عناوين الصفحة (${ar(hs.length)})</h2><ul>${hs.map((h, i) => { if (!h.id) h.id = 'xh-' + i; return `<li><button type="button" data-go="${h.id}">${esc(h.textContent.trim().slice(0, 90))}</button></li>`; }).join('')}</ul>
    <button type="button" data-go="">إغلاق القائمة</button>`;
  box.hidden = false; $('heads-h').focus();
}
document.addEventListener('click', (e) => {
  const g = e.target.closest('#heads button[data-go]');
  if (g) { const id = g.dataset.go; $('heads').hidden = true; if (id) focusId(id); else $('btn-heads').focus(); }
});

// ------------------------------------------------------------------ مراقبة الاتصال (100)
window.addEventListener('offline', () => say('انقطع الاتصال بالإنترنت. ما حمّلته من كتب وتلاوات يعمل بلا إنترنت.'));
window.addEventListener('online', () => say('عاد الاتصال بالإنترنت'));

// ------------------------------------------------------------------ النسخ الاحتياطي (96، 97)
function backupData() {
  const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('almenna.')) o[k] = localStorage.getItem(k); }
  return JSON.stringify({ app: 'almenna', version: XE.VERSION, at: new Date().toISOString(), data: o }, null, 1);
}
function restoreData(text) {
  const j = JSON.parse(text);
  if (j.app !== 'almenna' || !j.data) throw new Error('ليس ملف نسخة احتياطية من المنة');
  for (const [k, v] of Object.entries(j.data)) if (k.startsWith('almenna.')) localStorage.setItem(k, v);
}
async function autoBackup() {
  const o = st(); if (o.autoBackup === false || !XP.Filesystem) return;
  if (o.lastAutoBackup && daysBetween(o.lastAutoBackup, today()) < 7) return;
  for (const directory of ['DOCUMENTS', 'DATA']) {
    try {
      await XP.Filesystem.writeFile({ path: 'المنة/نسخة-احتياطية-تلقائية.json', data: backupData(), directory, encoding: 'utf8', recursive: true });
      o.lastAutoBackup = today(); o.lastAutoBackupDir = directory; xsave(); return;
    } catch { /* try next */ }
  }
}

// ------------------------------------------------------------------ بدء التشغيل
H.ready = async () => {
  const o = st();
  if (o.verbose == null) o.verbose = false;
  if (o.tones == null) o.tones = true;
  if (o.follow == null) o.follow = true;
  applyX(); watchMain();
  $('btn-menu').addEventListener('click', () => ($('menu').hidden ? openMenu() : closeMenu()));
  $('btn-where').addEventListener('click', whereAmI);
  $('btn-heads').addEventListener('click', headingsList);
  $('btn-focus').addEventListener('click', () => { S.focusMode = !S.focusMode; applyX(); $('btn-focus').setAttribute('aria-pressed', String(S.focusMode)); say(S.focusMode ? 'وضع التركيز: أُخفيت الأزرار العلوية عدا القائمة' : 'خرجت من وضع التركيز'); });
  $('menu').addEventListener('click', (e) => { if (e.target.closest('button[data-view]')) closeMenu(true); });
  if (!o.seenTour) o.view = 'welcome';
  else if (o.seenVersion !== XE.VERSION) o.view = 'whatsnew';
  else if (o.startHome !== false) o.view = 'home';
  setTimeout(autoBackup, 8000);
  if (!navigator.onLine) setTimeout(() => say('لا يوجد اتصال بالإنترنت الآن. الأحاديث والآثار والتدبر موجودة في التطبيق وتعمل بلا إنترنت.'), 2500);
};
