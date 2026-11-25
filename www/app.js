'use strict';
/* المنة في التفسير بالسنة وثقات الأئمة — interface (shared by Windows and Android) */
const { norm, groups, groupForAyah, ar, esc, richText, plainText, paragraphs } = window.U;
const $main = document.getElementById('main');
const $status = document.getElementById('status');
const $alert = document.getElementById('alert');
const $dlbar = document.getElementById('dlbar');

const S = {
  meta: null, quran: null, settings: {}, installed: {}, view: 'ayah',
  hadith: {}, links: {}, tad: {}, ath: {}, parts: {}, downloads: {}, catalog: null, readerState: null,
  imlai: null, playing: false,
};
const { CATS, INTRO, EXTRA } = window.BOOKS21;
const TYPES = [
  ['sunnah', 'التفسير بالسنة: الأحاديث وأقوال الصحابة والتابعين'],
  ['asbab', 'أسباب النزول'],
  ['qiraat', 'القراءات القرآنية'],
  ['irab', 'إعراب القرآن'],
  ['maani', 'معاني القرآن وغريبه'],
  ['mufassirun', 'أقوال المفسرين'],
  ['tadabbur', 'التدبر'],
];
const TYPE_NAME = Object.fromEntries(TYPES);
const OLD_VIEW = { tafsir: 'sunnah', tadabbur: 'tadabbur', mufassirun: 'mufassirun' };
function extra(key) { return EXTRA.find((b) => b.key === key); }
function catBooks(cat) { return EXTRA.filter((b) => b.cat === cat || b.also === cat); }
function ayahText(s, a) {
  const im = S.settings.script !== 'uthmani' && S.imlai && S.imlai[s] && S.imlai[s][a - 1];
  return im || S.quran[s][a - 1][0];
}
function globalAyah(s, a) { let g = 0; for (let i = 1; i < s; i++) g += surah(i).ayahs; return g + a; }
const CAT = {
  imani: 'تدبر إيماني وتربوي', lugh: 'تدبر لغوي وبلاغي', tanasub: 'تناسب الآيات وترتيبها', ilmi: 'إشارات علمية',
  amal: 'توجيهات وعمل',
};
const CAT_ORDER = ['imani', 'lugh', 'tanasub', 'ilmi', 'amal'];
const VIEWS = {};
const SRC_NAME = (k) => (taf(k) ? taf(k).short : k);

function announce(msg) { $status.textContent = ''; setTimeout(() => { $status.textContent = msg; }, 30); }
function alertMsg(msg) { $alert.textContent = ''; setTimeout(() => { $alert.textContent = msg; }, 30); }
async function json(rel) { const t = await window.api.data(rel); return t ? JSON.parse(t) : null; }
function save() { return window.api.saveSettings(S.settings); }
function taf(key) { return (S.meta.tafsirs.find((t) => t.key === key)) || (S.settings.extraBooks || []).find((b) => b.key === key && b.kind === 'tafsir') || EXTRA.find((b) => b.key === key && b.slug); }
function allTafsirs() { return S.meta.tafsirs.concat((S.settings.extraBooks || []).filter((b) => b.kind === 'tafsir')); }
function surah(n) { return S.meta.surahs[n - 1]; }
function bookTitle(code) { const b = S.meta.books.find((x) => x.code === code); return b ? b.title : code; }
function bookShort(code) { const b = S.meta.books.find((x) => x.code === code); return b ? b.short : code; }

// ---------------------------------------------------------------- startup
(async function init() {
  try {
    S.settings = (await window.api.settings()) || {};
    S.settings.edits = S.settings.edits || { excluded: {}, added: {} };
    S.settings.surah = S.settings.surah || 1;
    S.settings.ayah = S.settings.ayah || 1;
    applyLook();
    S.meta = await json('meta.json.gz');
    S.settings.surah = Math.min(114, Math.max(1, parseInt(S.settings.surah, 10) || 1));
    S.settings.ayah = Math.min(S.meta.surahs[S.settings.surah - 1].ayahs, Math.max(1, parseInt(S.settings.ayah, 10) || 1));
    S.quran = await json('quran.json.gz');
    if (OLD_VIEW[S.settings.view]) { S.settings.ttype = S.settings.ttype || OLD_VIEW[S.settings.view]; S.settings.view = 'ayah'; }
    if (!TYPE_NAME[S.settings.ttype]) S.settings.ttype = 'sunnah';
    try { const t = await window.api.imlai(false); if (t) S.imlai = JSON.parse(t); } catch { /* not yet */ }
    if (!S.imlai && S.settings.script !== 'uthmani') loadImlai(false);
    S.installed = await window.api.books();
    window.api.onProgress(onProgress);
    document.getElementById('tabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-view]'); if (b) go(b.dataset.view);
    });
    document.addEventListener('keydown', onKey);
    $main.addEventListener('click', onClick);
    $main.addEventListener('change', onChange);
    $main.addEventListener('submit', onSubmit);
    if (window.MennaHooks && window.MennaHooks.ready) await window.MennaHooks.ready();
    await go(VIEWS[S.settings.view] ? S.settings.view : 'ayah', true);
  } catch (err) {
    $main.innerHTML = `<p class="bad">تعذّر تشغيل البرنامج: ${esc(err.message)}</p>`;
  }
})();

function applyLook() {
  document.documentElement.style.setProperty('--fs', (S.settings.fontSize || 20) + 'px');
  document.documentElement.dataset.theme = S.settings.theme || 'light';
}

function onKey(e) {
  if (e.altKey && !e.ctrlKey && /^[1-6]$/.test(e.key)) {
    e.preventDefault();
    go(['ayah', 'tadabburi', 'search', 'sources', 'update', 'settings'][+e.key - 1]);
  } else if (e.ctrlKey && !e.altKey && /^[1-7]$/.test(e.key)) {
    e.preventDefault(); setType(TYPES[+e.key - 1][0]);
  } else if (e.ctrlKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
    e.preventDefault(); togglePlay();
  } else if (e.ctrlKey && (e.key === 't' || e.key === 'T' || e.code === 'KeyT')) {
    e.preventDefault(); if (S.view !== 'ayah') go('ayah').then(() => focusId('sel-type')); else focusId('sel-type');
  } else if (e.altKey && (e.key === 'PageDown' || e.key === 'PageUp')) {
    e.preventDefault(); step(e.key === 'PageDown' ? 1 : -1);
  } else if (e.ctrlKey && (e.key === 'g' || e.key === 'G')) {
    e.preventDefault(); const s = document.getElementById('sel-surah'); if (s) s.focus();
  } else if (e.key === 'Escape' && S.view === 'reader' && S.readerState && S.readerState.back) {
    e.preventDefault(); const b = S.readerState.back; go(b.view).then(() => b.focus && focusId(b.focus));
  }
}

async function go(view, first) {
  S.view = view;
  if (view !== 'reader') { S.settings.view = view; save(); }
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
  const fn = VIEWS[view];
  $main.innerHTML = '<p class="loading">جاري التحميل…</p>';
  await fn();
  if (window.MennaHooks && window.MennaHooks.afterView) window.MennaHooks.afterView(view);
  if (!first) { const h = $main.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus(); } }
}
function focusId(id) { const el = document.getElementById(id); if (el) { el.tabIndex = el.tabIndex < 0 ? -1 : el.tabIndex; el.focus(); el.scrollIntoView({ block: 'center' }); } }

// ---------------------------------------------------------------- data loading
async function hadithBook(code) {
  if (!S.hadith[code]) {
    let d = await json(`hadith/${code}.json.gz`);
    if (!d) {   // an extra hadith book downloaded through the update section
      const t = await window.api.bookPart(code, 'all');
      if (!t) return null;
      const raw = JSON.parse(t);
      const extra = (S.settings.extraBooks || []).find((b) => b.key === code) || {};
      d = { book: code, title: extra.title || code, short: extra.title || code,
        hadiths: raw.hadiths.map((h) => ({ id: `${code}:${h.hadithnumber}`, n: h.hadithnumber, t: h.text, k: '', g: [], s: 'U' })) };
    }
    d.byId = new Map(d.hadiths.map((h) => [h.id, h]));
    S.hadith[code] = d;
  }
  return S.hadith[code];
}
async function hadith(id) {
  const b = await hadithBook(id.split(':')[0]);
  return b ? b.byId.get(id) : null;
}
async function links(s) { if (!S.links[s]) S.links[s] = (await json(`links/${s}.json.gz`)) || {}; return S.links[s]; }
async function tadData(s) { if (!S.tad[s]) S.tad[s] = (await json(`tadabbur/${s}.json.gz`)) || {}; return S.tad[s]; }
async function athData(s) { if (!S.ath[s]) S.ath[s] = (await json(`athar/${s}.json.gz`)) || {}; return S.ath[s]; }
async function bookGroups(key, s) {
  const id = key + ':' + s;
  if (!S.parts[id]) {
    const t = await window.api.bookPart(key, s);
    if (!t) return null;
    S.parts[id] = groups(JSON.parse(t));
  }
  return S.parts[id];
}
function isInstalled(key, part) {
  const b = S.installed[key];
  if (!b) return false;
  if (part == null) return b.complete;
  return true;   // checked precisely by bookPart returning null
}

// ---------------------------------------------------------------- downloads
function tafsirSpec(t, parts) {
  const c = S.meta.commits.tafsir;
  const ref = t.branch ? t.branch : c;
  const urls = {};
  const ps = parts || Array.from({ length: 114 }, (_, i) => i + 1);
  for (const p of ps) {
    urls[p] = [
      `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@${ref}/tafsir/${t.slug}/${p}.json`,
      `https://raw.githubusercontent.com/spa5k/tafsir_api/${ref}/tafsir/${t.slug}/${p}.json`,
      `https://fastly.jsdelivr.net/gh/spa5k/tafsir_api@${ref}/tafsir/${t.slug}/${p}.json`,
    ];
  }
  const all = Array.from({ length: 114 }, (_, i) => i + 1);
  return { key: t.key, title: t.title, kind: 'tafsir', parts: all, fetch: ps, urls, meta: { slug: t.slug } };
}
function hadithSpec(b) {
  return { key: b.key, title: b.title, kind: 'hadith', parts: ['all'], meta: { edition: b.edition },
    urls: { all: [
      `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${b.edition}.min.json`,
      `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${b.edition}.min.json`,
    ] } };
}
async function download(spec) {
  S.downloads[spec.key] = { done: 0, total: (spec.fetch || spec.parts).length, title: spec.title };
  showDlBar();
  announce(`بدأ تحميل ${spec.title}`);
  const r = await window.api.downloadBook(spec);
  S.installed = await window.api.books();
  delete S.downloads[spec.key];
  showDlBar();
  return r;
}
function onProgress(m) {
  const d = S.downloads[m.key];
  if (d) { d.done = m.done; d.total = m.total; }
  showDlBar();
  const el = document.getElementById('prog-' + m.key);
  if (el) el.textContent = `تم ${ar(m.done)} من ${ar(m.total)}`;
  if (m.finished) {
    const t = (d && d.title) || m.key;
    if (m.complete) announce(`اكتمل تحميل ${t}`);
    else if (m.cancelled) announce(`أُلغي تحميل ${t}`);
    else if (m.total > 1) alertMsg(`لم يكتمل تحميل ${t}: تعذّر تحميل ${ar(m.failed)} من الأجزاء. تحقق من الإنترنت ثم اضغط «إكمال التحميل».`);
  }
}
function showDlBar() {
  const ks = Object.keys(S.downloads);
  $dlbar.hidden = ks.length === 0;
  $dlbar.textContent = ks.map((k) => `جاري تحميل ${S.downloads[k].title}: ${ar(S.downloads[k].done)} من ${ar(S.downloads[k].total)}`).join(' — ');
}

// ---------------------------------------------------------------- ayah navigator
function navHtml() {
  const s = S.settings.surah, a = S.settings.ayah;
  const so = S.meta.surahs.map((x) => `<option value="${x.n}"${x.n === s ? ' selected' : ''}>${ar(x.n)}. ${esc(x.name)}</option>`).join('');
  const ao = Array.from({ length: surah(s).ayahs }, (_, i) => `<option value="${i + 1}"${i + 1 === a ? ' selected' : ''}>${ar(i + 1)}</option>`).join('');
  return `<div class="nav-ayah" role="group" aria-label="اختيار الآية">
    <label for="sel-surah">السورة</label><select id="sel-surah" data-act="surah">${so}</select>
    <label for="sel-ayah">الآية</label><select id="sel-ayah" data-act="ayah">${ao}</select>
    <button type="button" data-act="prev" title="Alt+PageUp">الآية السابقة</button>
    <button type="button" data-act="next" title="Alt+PageDown">الآية التالية</button>
  </div>`;
}
function ayahBox() {
  const s = S.settings.surah, a = S.settings.ayah;
  const t = ayahText(s, a);
  return `<div class="ayah-box"><p class="ayah-text" id="ayah-text" lang="ar">﴿${esc(t)}﴾</p>
    <p class="ayah-ref">سورة ${esc(surah(s).name)} (${surah(s).type})، الآية ${ar(a)}</p></div>`;
}
async function setAyah(s, a, keepFocus, fromPlayer) {
  if (!fromPlayer) stopPlay(true);
  s = Math.min(114, Math.max(1, parseInt(s, 10) || 1));
  a = Math.min(surah(s).ayahs, Math.max(1, parseInt(a, 10) || 1));
  S.settings.surah = s; S.settings.ayah = a; save();
  if (window.MennaHooks && window.MennaHooks.onAyah) window.MennaHooks.onAyah(s, a);
  await VIEWS[S.view]();
  const h = $main.querySelector(keepFocus || 'h2');
  if (h) { if (!h.matches('select,button')) h.tabIndex = -1; h.focus(); }
}
function step(d) {
  if (S.view !== 'ayah') return;
  let s = S.settings.surah, a = S.settings.ayah + d;
  if (a < 1) { if (s === 1) return; s -= 1; a = surah(s).ayahs; }
  if (a > surah(s).ayahs) { if (s === 114) return; s += 1; a = 1; }
  setAyah(s, a);
}

// ---------------------------------------------------------------- view: التفسير بالسنة
function edKey() { return S.settings.surah + ':' + S.settings.ayah; }
async function entriesFor(s, a) {
  const L = await links(s);
  let list = (L[String(a)] || []).slice();
  const ex = S.settings.edits.excluded[s + ':' + a] || [];
  list = list.filter((e) => !e.h.some((id) => ex.includes(id)));
  for (const id of S.settings.edits.added[s + ':' + a] || []) {
    const h = await hadith(id);
    if (h) list.unshift({ h: [id], s: h.s, d: null, r: [], n: 0, manual: true });
  }
  return list;
}
function gradeLabel(h, code) {
  if (code === 'bukhari' && h) return 'صحيح (رواه البخاري)';
  if (code === 'muslim' && h) return 'صحيح (رواه مسلم)';
  if (h && h.g && h.g.length) return h.g.map((g) => `${g[1]} (${g[0]})`).join('، ');
  return 'لم يُحكم عليه في قاعدة البرنامج';
}
async function takhrijHtml(ids) {
  const items = [];
  for (const id of ids) {
    const code = id.split(':')[0]; const h = await hadith(id);
    if (!h) continue;
    items.push(`<li>${esc(bookTitle(code))}${h.k ? '، ' + esc(h.k) : ''}، رقم ${ar(h.n)} — <span class="src">${esc(gradeLabel(h, code))}</span>
      <button type="button" data-act="open-hadith" data-id="${esc(id)}">افتح الحديث في ${esc(bookShort(code))}</button></li>`);
  }
  return `<ul class="plain">${items.join('')}</ul>`;
}
function reasonHtml(r, idx) {
  const t = taf(r[0]);
  const [, before, lead, after, g, off, page, q] = r;
  const where = page ? ` <span class="src">(ص ${ar(page)})</span>` : '';
  let h = `<section class="reason" aria-label="سبب الربط عند ${esc(t ? t.short : r[0])}">
    <h5>قال ${esc(t ? t.short : r[0])} في «${esc(t ? t.title : '')}»${where}</h5>`;
  if (q) h += `<p><span class="lbl">كان يفسّر قوله تعالى:</span> ﴿${esc(q)}﴾</p>`;
  if (before) h += `<p><span class="lbl">قبل ذكر الحديث:</span> ${esc(before)}</p>`;
  h += `<p><span class="lbl">موضع ذكر الحديث في كلامه:</span> ${esc(lead)}</p>`;
  if (after) h += `<p><span class="lbl">تعليقه بعد الحديث:</span> ${esc(after)}</p>`;
  if (!before && !after) h += `<p class="note">ذكر المفسر هذا الحديث عند الآية دون كلام صريح قبله أو بعده يبيّن وجه الربط؛ فوجه الربط هو إيراده الحديث في تفسير الآية.</p>`;
  h += `<button type="button" data-act="open-source" data-key="${esc(r[0])}" data-s="${S.settings.surah}" data-g="${g}" data-o="${off}">تحقق من المصدر: افتح هذا الموضع في ${esc(t ? t.short : r[0])}</button></section>`;
  return h;
}
async function hadithArticle(e, num) {
  const first = await hadith(e.h[0]);
  if (!first) return '';
  const code = e.h[0].split(':')[0];
  const cls = e.s === 'W' ? ' weak' : '';
  const glabel = { S: 'صحيح أو حسن', U: 'لم يُحكم عليه', W: 'ضعيف' }[e.s];
  let h = `<article class="item${cls}" id="h-${num}">
    <h3>الحديث ${ar(num)}: رواه ${esc(e.h.map((i) => bookShort(i.split(':')[0])).join(' و'))} <span class="grade ${e.s}">${glabel}</span></h3>
    <p class="matn">${esc(first.t)}</p>
    <h4>التخريج والحكم</h4>${await takhrijHtml(e.h)}
    <h4>سبب الربط بالآية</h4>`;
  if (e.manual) h += `<p class="note">أضفت هذا الحديث يدويًا إلى هذه الآية.</p>`;
  else if (e.d) h += `<p><span class="lbl">ربط صريح:</span> ورد لفظ الآية في متن الحديث: «${esc(e.d)}».</p>`;
  else h += `<p><span class="lbl">ربط غير مباشر:</span> لم يرد لفظ الآية في متن الحديث، وإنما أورده ${ar(e.r.length)} من المفسرين عند هذه الآية. وهذا كلامهم بنصّه:</p>`;
  const rs = e.r.slice(0, 4);
  rs.forEach((r, i) => { h += reasonHtml(r, i); });
  if (e.r.length > 4) {
    h += `<p class="src">وذكره أيضًا عند الآية: ${esc(e.r.slice(4).map((r) => SRC_NAME(r[0])).join('، '))}.
      <button type="button" data-act="more-reasons" data-num="${num}">عرض كلامهم</button></p><div id="more-${num}" hidden>${e.r.slice(4).map((r, i) => reasonHtml(r, i + 4)).join('')}</div>`;
  }
  h += `<div class="actions"><button type="button" data-act="copy-hadith" data-num="${num}">نسخ الحديث مع تخريجه</button>
    <button type="button" data-act="exclude" data-id="${esc(e.h[0])}">استبعاد هذا الحديث من هذه الآية</button></div></article>`;
  return h;
}
function atharArticle(x, i) {
  const graded = x.g ? `<span class="src">الحكم الوارد في الموسوعة: ${esc(x.g)}</span>` : `<span class="grade U">لم يُحكم عليه</span>`;
  return `<article class="item"><h4>${ar(i)}. ${esc(x.w || 'أثر')} ${x.tp ? `<span class="src">(${esc(x.tp)})</span>` : ''}</h4>
    <p class="matn">${esc(x.t)}</p><p>${graded}</p>${x.x ? `<p class="src">التخريج: ${esc(x.x)}</p>` : ''}
    <p class="src">المصدر: موسوعة التفسير المأثور، الأثر رقم ${esc(x.n)}</p></article>`;
}
const TYPE_VIEWS = {};
TYPE_VIEWS.sunnah = async function () {
  const s = S.settings.surah, a = S.settings.ayah;
  const list = await entriesFor(s, a);
  const groupsOf = { dS: [], iS: [], U: [], W: [] };
  list.forEach((e) => {
    if (e.s === 'S') (e.d || e.manual ? groupsOf.dS : groupsOf.iS).push(e);
    else groupsOf[e.s].push(e);
  });
  const A = await athData(s);
  const ath = A[String(a)] || [];
  const sah = ath.filter((x) => x.c === 'sahabi'), tab = ath.filter((x) => x.c === 'tabii' || x.c === 'other');
  let n = 0;
  const parts = [];
  async function sec(title, arr, intro) {
    if (!arr.length) return;
    let h = `<h2 id="sec-${parts.length}">${title} (${ar(arr.length)})</h2>${intro || ''}`;
    for (const e of arr) h += await hadithArticle(e, ++n);
    parts.push(h);
  }
  await sec('أحاديث صحيحة صريحة في الآية', groupsOf.dS, '<p class="summary">أحاديث صحيحة أو حسنة ورد فيها لفظ الآية نفسه.</p>');
  await sec('أحاديث صحيحة ذكرها المفسرون عند الآية', groupsOf.iS, '<p class="summary">أحاديث صحيحة أو حسنة لم يرد فيها لفظ الآية، وأوردها المفسرون في تفسيرها. سبب الربط منقول بنص كلامهم.</p>');
  await sec('أحاديث لم يُحكم عليها في البرنامج', groupsOf.U, '<p class="note">أحاديث من مسند أحمد وموطأ مالك وسنن الدارمي، لم يرد عليها حكم في قاعدة البرنامج. وليس معنى ذلك أنها ضعيفة، فينبغي مراجعة حكمها قبل الاحتجاج بها.</p>');
  if (groupsOf.W.length) {
    parts.push(`<h2>أحاديث ضعيفة رويت في الآية (${ar(groupsOf.W.length)})</h2>
      <p class="bad">تنبيه: هذه الأحاديث حُكم عليها بالضعف، وتُذكر للبيان لا للاحتجاج.</p>
      <button type="button" data-act="toggle" data-target="weak-box" aria-expanded="false">إظهار الأحاديث الضعيفة</button><div id="weak-box" hidden></div>`);
  }
  const atharPart = (title, arr, intro) => arr.length ? `<h2>${title} (${ar(arr.length)})</h2>${intro}${arr.map((x, i) => atharArticle(x, i + 1)).join('')}` : '';
  const atharIntro = '<p class="note">الآثار منقولة من «موسوعة التفسير المأثور» بتخريجها. وما لم يُذكر له حكم فهو غير محكوم عليه، فلينتبه القارئ.</p>';
  const total = list.length;
  S.weakList = groupsOf.W; S.weakStart = n;
  S.currentList = list;
  return `<h2 id="type-h">التفسير بالسنة</h2>
    <p class="summary">${total ? `عند هذه الآية ${ar(total)} من الأحاديث` : 'لم يجد البرنامج حديثًا من الكتب التسعة في تفسير هذه الآية'}${ath.length ? `، و${ar(ath.length)} من آثار الصحابة والتابعين` : ''}.
    <button type="button" data-act="add-hadith">إضافة حديث يدويًا</button> <button type="button" data-act="export-surah">حفظ تفسير السورة كلها في ملف</button></p>
    ${parts.join('')}
    ${atharPart('أقوال الصحابة رضي الله عنهم', sah, atharIntro)}
    ${atharPart('أقوال التابعين ومن بعدهم', tab, sah.length ? '' : atharIntro)}`;
};

// ---------------------------------------------------------------- view: التدبر
function tadItem(x, i) {
  let src = '';
  if (x.src === 'tadabbur') src = x.w ? `${esc(x.w)}${x.p ? '، ' + esc(x.p) : ''} — نقلًا عن كتاب «تدبر وعمل»` : 'كتاب «تدبر وعمل»';
  else { const t = taf(x.src); src = `${esc(t ? t.short : x.src)}، «${esc(t ? t.title : '')}»${x.p ? '، ص ' + ar(x.p) : ''}`; }
  const btn = x.src !== 'tadabbur' ? `<button type="button" data-act="open-source" data-key="${esc(x.src)}" data-s="${S.settings.surah}" data-g="${x.g}" data-o="${x.o}">تحقق من المصدر: افتح الموضع في الكتاب</button>` : '';
  return `<article class="item"><h4>${ar(i)}. ${x.k ? esc(x.k) : (x.f ? `عند قوله تعالى: ﴿${esc(x.f)}﴾` : 'وقفة')}</h4>
    ${x.f && x.k ? `<p>﴿${esc(x.f)}﴾</p>` : ''}<p class="matn">${esc(x.t)}</p>
    ${x.q ? `<p class="src">سؤال للتأمل: ${esc(x.q)}</p>` : ''}<p class="src">المصدر: ${src}</p>${btn}</article>`;
}
TYPE_VIEWS.tadabbur = async function () {
  const s = S.settings.surah, a = S.settings.ayah;
  const T = await tadData(s);
  const list = T[String(a)] || [];
  let h = '<h2 id="type-h">التدبر</h2>';
  if (!list.length) h += '<p class="summary">لا توجد وقفات تدبرية مسجلة عند هذه الآية بعينها، وقد تكون الوقفة عند آية مجاورة. جرّب الآية السابقة أو التالية، أو قسم «التفسير التدبري» لقراءة تدبر السورة كاملة.</p>';
  for (const c of CAT_ORDER) {
    const arr = list.filter((x) => x.c === c);
    if (!arr.length) continue;
    h += `<h2>${CAT[c]} (${ar(arr.length)})</h2>`;
    if (c === 'ilmi') h += '<p class="note">هذه إشارات ذكرها المفسرون فيما يتصل بالعلوم الكونية، وهي اجتهاد منهم في الفهم، لا قطع بمراد الآية.</p>';
    h += arr.map((x, i) => tadItem(x, i + 1)).join('');
  }
  return h;
};
VIEWS.tadabburi = async function () {
  const s = S.settings.surah;
  const T = await tadData(s);
  const on = S.settings.tadFilter || { imani: true, lugh: true, tanasub: false, ilmi: true, amal: true };
  S.settings.tadFilter = on;
  const so = S.meta.surahs.map((x) => `<option value="${x.n}"${x.n === s ? ' selected' : ''}>${ar(x.n)}. ${esc(x.name)}</option>`).join('');
  let h = `<div class="nav-ayah"><label for="sel-surah">السورة</label><select id="sel-surah" data-act="surah">${so}</select></div>
    <h2>التفسير التدبري لسورة ${esc(surah(s).name)}</h2>
    <p class="summary">تدبر السورة آيةً آية، مجموعًا من «تدبر وعمل» ومن أمهات التفاسير. اختر أنواع التدبر التي تريد عرضها:</p>
    <div class="filters" role="group" aria-label="أنواع التدبر">${CAT_ORDER.map((c) => `<label><input type="checkbox" data-act="tadfilter" value="${c}"${on[c] ? ' checked' : ''}> ${CAT[c]}</label>`).join('')}</div>`;
  let count = 0;
  for (let a = 1; a <= surah(s).ayahs; a++) {
    const arr = (T[String(a)] || []).filter((x) => on[x.c]);
    if (!arr.length) continue;
    h += `<h3 id="ta-${a}">الآية ${ar(a)}: ﴿${esc(ayahText(s, a))}﴾</h3>`;
    h += arr.map((x, i) => tadItem(x, i + 1).replace('<article class="item">', `<article class="item"><p class="src">${CAT[x.c]}</p>`)).join('');
    count += arr.length;
  }
  if (!count) h += '<p class="summary">لا توجد وقفات من الأنواع المختارة في هذه السورة.</p>';
  $main.innerHTML = h;
};

// ---------------------------------------------------------------- view: أقوال المفسرين
TYPE_VIEWS.mufassirun = async function () {
  const s = S.settings.surah, a = S.settings.ayah;
  const books = allTafsirs().filter((t) => t.key !== 'tadabbur');
  const inst = books.filter((t) => S.installed[t.key]);
  let sel = S.settings.mufBook && inst.find((t) => t.key === S.settings.mufBook) ? S.settings.mufBook : (inst[0] && inst[0].key);
  let h = '<h2 id="type-h">أقوال المفسرين</h2>';
  if (!inst.length) {
    h += '<p class="note">لم تحمّل أي كتاب تفسير بعد. حمّل الكتب من قسم «المصادر والمراجع» (Alt+4)، ثم ارجع إلى هنا لترى كلام كل مفسر عند الآية.</p>';
    return h;
  }
  h += `<p><label for="muf-book">الكتاب</label> <select id="muf-book" data-act="mufbook">${inst.map((t) => `<option value="${t.key}"${t.key === sel ? ' selected' : ''}>${esc(t.short)}: ${esc(t.title)}</option>`).join('')}</select></p>`;
  const t = taf(sel);
  const gs = await bookGroups(sel, s);
  if (!gs) {
    h += `<p class="note">هذا الجزء من «${esc(t.title)}» لم يُحمّل بعد.</p><button type="button" data-act="dl-part" data-key="${sel}" data-s="${s}">تحميل تفسير هذه السورة الآن</button>`;
  } else {
    const gi = groupForAyah(gs, a);
    if (gi < 0) h += '<p class="summary">لا يوجد كلام لهذا المفسر عند هذه الآية في النسخة المتاحة.</p>';
    else {
      const [a1, a2, text] = gs[gi];
      h += `<h3>${esc(t.short)}${a1 !== a2 ? ` — الآيات ${ar(a1)} إلى ${ar(a2)}` : ''}</h3><div class="reader">${paragraphs(text).map(([, p]) => `<p>${richText(p)}</p>`).join('')}</div>`;
    }
  }
  return h;
};

// ---------------------------------------------------------------- 2.1.0: أسباب النزول، القراءات، الإعراب، المعاني
function qpText(t) { return paragraphs(String(t).replace(/\n(?!\n)/g, '\n\n')).map(([, p]) => p.trim() ? `<p>${esc(p.trim())}</p>` : '').join(''); }
async function ensurePart(b, s) {
  let gs = await bookGroups(b.key, s);
  if (gs) return gs;
  try {
    await window.api.downloadBook({ ...tafsirSpec(b, [s]), title: b.title });
    S.installed = await window.api.books();
  } catch { /* offline */ }
  return bookGroups(b.key, s);
}
async function bookAtAyah(b, s, a) {
  let h = `<section class="book" aria-labelledby="bk-${b.key}"><h3 id="bk-${b.key}">${esc(b.short)}: «${esc(b.title)}»</h3>`;
  if (b.author) h += `<p class="src">${esc(b.author)}</p>`;
  if (b.qp) {
    let t = null, err = false;
    try { t = await window.api.qpAyah(b.qp, s, a, false); } catch { err = true; }
    if (err || !t) {
      h += `<p class="bad">تعذّر جلب هذا الكتاب من الإنترنت. تحقق من الاتصال ثم أعد المحاولة.</p><button type="button" data-act="retype">إعادة المحاولة</button>`;
    } else {
      const c = JSON.parse(t).content || [];
      if (!c.length) h += '<p class="summary">لم يذكر هذا الكتاب شيئًا عند هذه الآية.</p>';
      else h += c.map((x) => `<div class="reader">${qpText(x.text)}</div>${x.page ? `<p class="src">${x.part ? `الجزء ${ar(x.part)}، ` : ''}الصفحة ${ar(x.page)}</p>` : ''}`).join('');
    }
  } else {
    const gs = await ensurePart(b, s);
    if (!gs) {
      h += `<p class="bad">لم يُحمّل هذا الكتاب لسورة ${esc(surah(s).name)} بعد، وتعذّر تحميله الآن. تحقق من الإنترنت.</p>
        <button type="button" data-act="dl-part" data-key="${b.key}" data-s="${s}">تحميل ${esc(b.short)} لهذه السورة</button>`;
    } else {
      const gi = groupForAyah(gs, a);
      if (gi < 0) h += '<p class="summary">لم يذكر هذا الكتاب شيئًا عند هذه الآية.</p>';
      else {
        const [a1, a2, text] = gs[gi];
        if (a1 !== a2) h += `<p class="src">كلامه عن الآيات ${ar(a1)} إلى ${ar(a2)}</p>`;
        h += `<div class="reader">${paragraphs(text).map(([, p]) => `<p>${richText(p)}</p>`).join('')}</div>
          <button type="button" data-act="open-source" data-key="${b.key}" data-s="${s}" data-g="${gi}" data-o="0">افتح الموضع في الكتاب</button>`;
      }
    }
  }
  return h + '</section>';
}
async function catView(cat) {
  const s = S.settings.surah, a = S.settings.ayah;
  const books = catBooks(cat);
  const pick = (S.settings.catBook || {})[cat] || 'all';
  const chosen = pick === 'all' ? books : books.filter((b) => b.key === pick);
  let h = `<h2 id="type-h">${CATS[cat]}</h2><p class="summary">${INTRO[cat]}</p>
    <p><label for="cat-book">الكتاب</label> <select id="cat-book" data-act="catbook" data-cat="${cat}">
      <option value="all"${pick === 'all' ? ' selected' : ''}>كل الكتب (${ar(books.length)})</option>
      ${books.map((b) => `<option value="${b.key}"${b.key === pick ? ' selected' : ''}>${esc(b.short)}: ${esc(b.title)}</option>`).join('')}
    </select></p>`;
  const parts = await Promise.all((chosen.length ? chosen : books).map((b) => bookAtAyah(b, s, a)));
  return h + parts.join('');
}
TYPE_VIEWS.asbab = () => catView('asbab');
TYPE_VIEWS.qiraat = () => catView('qiraat');
TYPE_VIEWS.irab = () => catView('irab');
TYPE_VIEWS.maani = () => catView('maani');

// ---------------------------------------------------------------- 2.1.0: الآية ثم اختيار نوع التفسير
function audioHtml() {
  return `<div class="audio" role="group" aria-label="الاستماع إلى الآية">
    <button type="button" id="btn-play" data-act="play" title="Ctrl+M">${S.playing ? 'إيقاف التلاوة' : (window.MennaHooks && window.MennaHooks.playLabel ? window.MennaHooks.playLabel() : 'استمع إلى الآية مرتّلة')}</button>
    <label><input type="checkbox" id="chk-follow" data-act="follow"${S.settings.follow ? ' checked' : ''}> متابعة التلاوة إلى الآيات التالية</label></div>`;
}
VIEWS.ayah = async function () {
  const s = S.settings.surah, a = S.settings.ayah, tt = S.settings.ttype || 'sunnah';
  const sel = `<p class="ttype"><label for="sel-type">نوع التفسير</label> <select id="sel-type" data-act="ttype">
    ${TYPES.map(([k, l], i) => `<option value="${k}"${k === tt ? ' selected' : ''}>${l} (Ctrl+${i + 1})</option>`).join('')}</select></p>`;
  $main.innerHTML = `${navHtml()}<h2 id="top-h">سورة ${esc(surah(s).name)}، الآية ${ar(a)}</h2>${ayahBox()}${audioHtml()}${window.MennaHooks && window.MennaHooks.ayahTools ? window.MennaHooks.ayahTools(s, a) : ''}${sel}<div id="tbody"><p class="loading">جاري التحميل…</p></div>`;
  const body = await TYPE_VIEWS[tt]();
  if (S.view !== 'ayah' || S.settings.surah !== s || S.settings.ayah !== a || S.settings.ttype !== tt) return;   // moved on meanwhile
  document.getElementById('tbody').innerHTML = body;
};
async function setType(tt, focusSelect) {
  if (!TYPE_NAME[tt]) return;
  S.settings.ttype = tt; save();
  if (S.view !== 'ayah') { await go('ayah'); return; }
  await VIEWS.ayah();
  if (focusSelect) focusId('sel-type');
  else { const h = document.getElementById('type-h'); if (h) { h.tabIndex = -1; h.focus(); } }
  announce(TYPE_NAME[tt]);
}

// ---------------------------------------------------------------- 2.1.0: تلاوة الحصري
const player = new Audio();
let playUrl = null;
function setPlayLabel() { const b = document.getElementById('btn-play'); if (b) b.textContent = S.playing ? 'إيقاف التلاوة' : (window.MennaHooks && window.MennaHooks.playLabel ? window.MennaHooks.playLabel() : 'استمع إلى الآية مرتّلة'); }
function stopPlay(quiet) {
  if (!S.playing) return;
  S.playing = false; player.pause(); setPlayLabel();
  if (!quiet) announce('توقفت التلاوة');
}
async function playAyah(s, a) {
  S.playing = true; setPlayLabel();
  let buf;
  try { buf = await window.api.audioAyah(s, a, globalAyah(s, a)); } catch {
    S.playing = false; setPlayLabel(); alertMsg('تعذّر تحميل التلاوة. تحقق من اتصال الإنترنت. والآيات التي استمعت إليها من قبل تعمل بلا إنترنت.'); return;
  }
  if (!S.playing) return;
  if (playUrl) { URL.revokeObjectURL(playUrl); playUrl = null; }
  if (typeof buf === 'string') player.src = buf;   // on the phone: a saved file or an online address
  else { playUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' })); player.src = playUrl; }
  if (window.MennaHooks && window.MennaHooks.beforePlay) window.MennaHooks.beforePlay(player, s, a);
  try { await player.play(); } catch { S.playing = false; setPlayLabel(); alertMsg('تعذّر تشغيل التلاوة. تحقق من اتصال الإنترنت، والآيات المحفوظة على الهاتف تعمل بلا إنترنت.'); return; }
  // prepare the next ayah so the recitation continues without a gap
  if (S.settings.follow) { const n = nextAyah(s, a); if (n) window.api.audioAyah(n[0], n[1], globalAyah(n[0], n[1])).catch(() => {}); }
  if (window.MennaHooks && window.MennaHooks.afterPlay) window.MennaHooks.afterPlay(s, a);
}
function nextAyah(s, a) { if (a < surah(s).ayahs) return [s, a + 1]; if (s < 114) return [s + 1, 1]; return null; }
player.addEventListener('ended', async () => {
  if (!S.playing) return;
  if (window.MennaHooks && window.MennaHooks.onEnded && await window.MennaHooks.onEnded(player)) return;
  const n = S.settings.follow && nextAyah(S.settings.surah, S.settings.ayah);
  if (!n) { S.playing = false; setPlayLabel(); return; }
  const going = playAyah(n[0], n[1]);   // start the next ayah at once, then show it
  if (S.view === 'ayah') await setAyah(n[0], n[1], '#btn-play', true);
  else { S.settings.surah = n[0]; S.settings.ayah = n[1]; save(); }
  await going; setPlayLabel();
});
function togglePlay() {
  if (S.playing) { stopPlay(); return; }
  playAyah(S.settings.surah, S.settings.ayah);
}

// ---------------------------------------------------------------- 2.1.0: رسم المكتبة الشاملة
async function loadImlai(loud) {
  if (loud) announce('جاري تحميل نص القرآن بالرسم الإملائي…');
  try {
    S.imlai = JSON.parse(await window.api.imlai(true));
    const el = document.getElementById('ayah-text');
    if (el) el.textContent = `﴿${ayahText(S.settings.surah, S.settings.ayah)}﴾`;
    if (loud) announce('تم تحميل نص القرآن بالرسم الإملائي');
  } catch { if (loud) alertMsg('تعذّر تحميل نص القرآن بالرسم الإملائي. تحقق من الإنترنت، وسيبقى النص بالرسم العثماني حتى يتم التحميل.'); }
}

// ---------------------------------------------------------------- reader (tafsir part / hadith book)
async function openSource(key, s, g, o) {
  const t = taf(key);
  let gs = await bookGroups(key, s);
  if (!gs) {
    announce(`جاري تحميل تفسير سورة ${surah(s).name} من «${t.title}»`);
    const r = await download({ ...tafsirSpec(t, [s]), title: `${t.title} (سورة ${surah(s).name})` });
    gs = await bookGroups(key, s);
    if (!gs) { alertMsg('تعذّر تحميل الكتاب. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.'); return; }
  }
  const back = { view: S.view, focus: document.activeElement && document.activeElement.id };
  S.readerState = { kind: 'tafsir', key, s, g: +g, o: +o, back };
  await go('reader');
}
async function openHadith(id) {
  const code = id.split(':')[0];
  const b = await hadithBook(code);
  const idx = b.hadiths.findIndex((h) => h.id === id);
  S.readerState = { kind: 'hadith', code, page: Math.floor(Math.max(0, idx) / 25), target: id, back: { view: S.view } };
  await go('reader');
}
VIEWS.reader = async function () {
  const R = S.readerState;
  const backBtn = `<button type="button" data-act="back">رجوع (Escape)</button>`;
  if (R.kind === 'tafsir') {
    const t = taf(R.key);
    const gs = await bookGroups(R.key, R.s);
    const [a1, a2, text] = gs[R.g] || gs[0];
    const ps = paragraphs(text);
    let h = `${backBtn}<h2>«${esc(t.title)}» — ${esc(t.short)}</h2><p class="src">${esc(t.author || '')}</p>
      <h3>سورة ${esc(surah(R.s).name)}، ${a1 === a2 ? 'الآية ' + ar(a1) : `الآيات ${ar(a1)} إلى ${ar(a2)}`}</h3><div class="reader">`;
    for (const [off, p] of ps) {
      const hit = off === R.o;
      h += `<p id="p-${off}"${hit ? ' class="hl"' : ''}>${hit ? '<span class="sr-only">الموضع المطلوب: </span>' : ''}${richText(p)}</p>`;
    }
    h += `</div><p><button type="button" data-act="grp" data-d="-1"${R.g <= 0 ? ' disabled' : ''}>المقطع السابق</button>
      <button type="button" data-act="grp" data-d="1"${R.g >= gs.length - 1 ? ' disabled' : ''}>المقطع التالي</button> ${backBtn}</p>`;
    $main.innerHTML = h;
    const target = document.getElementById('p-' + R.o);
    if (target) setTimeout(() => { target.tabIndex = -1; target.focus(); target.scrollIntoView({ block: 'center' }); }, 60);
    return;
  }
  if (R.kind === 'tafsir-browse') {
    const t = taf(R.key);
    const gs = await bookGroups(R.key, R.s);
    const so = S.meta.surahs.map((x) => `<option value="${x.n}"${x.n === R.s ? ' selected' : ''}>${ar(x.n)}. ${esc(x.name)}</option>`).join('');
    let h = `${backBtn}<h2>قراءة «${esc(t.title)}»</h2><p class="src">${esc(t.author || '')}</p>
      <p><label for="rd-surah">السورة</label> <select id="rd-surah" data-act="rd-surah">${so}</select></p>`;
    if (!gs) h += `<p class="note">تفسير هذه السورة لم يُحمّل بعد.</p><button type="button" data-act="dl-part" data-key="${R.key}" data-s="${R.s}">تحميله الآن</button>`;
    else h += gs.map(([a1, a2, text]) => `<h3>${a1 === a2 ? 'الآية ' + ar(a1) : `الآيات ${ar(a1)} إلى ${ar(a2)}`}</h3><div class="reader">${paragraphs(text).map(([, p]) => `<p>${richText(p)}</p>`).join('')}</div>`).join('');
    $main.innerHTML = h;
    return;
  }
  // hadith book
  const b = await hadithBook(R.code);
  const per = 25, pages = Math.ceil(b.hadiths.length / per);
  R.page = Math.min(Math.max(0, R.page), pages - 1);
  const slice = b.hadiths.slice(R.page * per, R.page * per + per);
  let h = `${backBtn}<h2>${esc(b.title)}</h2>
    <form data-form="goto-num"><label for="num">انتقل إلى رقم الحديث</label> <input id="num" type="text" inputmode="numeric" size="8"> <button type="submit">انتقال</button></form>
    <p class="src">الصفحة ${ar(R.page + 1)} من ${ar(pages)}، الأحاديث ${ar(slice[0].n)} إلى ${ar(slice[slice.length - 1].n)}</p>`;
  for (const x of slice) {
    const hit = x.id === R.target;
    h += `<article class="item" id="hd-${esc(x.id.replace(/[:.]/g, '_'))}"${hit ? ' style="outline:3px dashed var(--focus)"' : ''}>
      <h3>${hit ? '<span class="sr-only">الحديث المطلوب: </span>' : ''}حديث رقم ${ar(x.n)}${x.k ? ` — ${esc(x.k)}` : ''}</h3>
      <p class="matn">${esc(x.t)}</p><p class="src">${esc(gradeLabel(x, R.code))}</p></article>`;
  }
  h += `<p><button type="button" data-act="hpage" data-d="-1"${R.page <= 0 ? ' disabled' : ''}>الصفحة السابقة</button>
    <button type="button" data-act="hpage" data-d="1"${R.page >= pages - 1 ? ' disabled' : ''}>الصفحة التالية</button> ${backBtn}</p>`;
  $main.innerHTML = h;
  if (R.target) {
    const el = document.getElementById('hd-' + R.target.replace(/[:.]/g, '_'));
    if (el) setTimeout(() => { const hh = el.querySelector('h3'); hh.tabIndex = -1; hh.focus(); el.scrollIntoView({ block: 'center' }); }, 60);
  }
};

// ---------------------------------------------------------------- search
VIEWS.search = async function () {
  const q = S.lastSearch || { text: '', where: 'quran' };
  const extraHadith = (S.settings.extraBooks || []).filter((b) => b.kind === 'hadith' && S.installed[b.key]);
  const instT = allTafsirs().concat(EXTRA.filter((b) => b.slug)).filter((t) => S.installed[t.key]);
  $main.innerHTML = `<h2>البحث</h2>
    <form data-form="search"><p><label for="q">كلمة البحث</label> <input id="q" type="search" size="40" value="${esc(q.text)}">
    <label for="where">في</label> <select id="where">
      <option value="quran"${q.where === 'quran' ? ' selected' : ''}>القرآن الكريم</option>
      <option value="hadith"${q.where === 'hadith' ? ' selected' : ''}>الكتب التسعة${extraHadith.length ? ' وكتب الحديث المضافة' : ''}</option>
      ${instT.map((t) => `<option value="taf:${t.key}"${q.where === 'taf:' + t.key ? ' selected' : ''}>${esc(t.short)}: ${esc(t.title)}</option>`).join('')}
    </select> <button type="submit" class="primary">بحث</button></p>
    <p class="src">البحث لا يتأثر بالتشكيل ولا بالهمزات. يمكنك كتابة أكثر من كلمة، فتظهر النتائج التي فيها الكلمات كلها.</p></form>
    <div id="results" aria-live="polite"></div>`;
  document.getElementById('q').focus();
};
async function runSearch(text, where) {
  S.lastSearch = { text, where };
  const terms = norm(text).split(' ').filter(Boolean);
  const $r = document.getElementById('results');
  if (!terms.length) { $r.innerHTML = '<p>اكتب كلمة للبحث.</p>'; return; }
  $r.innerHTML = '<p class="loading">جاري البحث…</p>';
  const out = []; const LIMIT = 300;
  const ok = (n) => terms.every((t) => n.includes(t));
  if (where === 'quran') {
    for (let s = 1; s <= 114 && out.length < LIMIT; s++) S.quran[s].forEach((v, i) => {
      if (out.length < LIMIT && ok(v[1])) out.push(`<div class="result"><p>﴿${esc(ayahText(s, i + 1))}﴾</p><p class="src">${esc(surah(s).name)}: ${ar(i + 1)}
        <button type="button" data-act="goto-ayah" data-s="${s}" data-a="${i + 1}">التفسير بالسنة</button>
        <button type="button" data-act="goto-tad" data-s="${s}" data-a="${i + 1}">التدبر</button></p></div>`);
    });
  } else if (where === 'hadith') {
    const codes = S.meta.books.map((b) => b.code).concat((S.settings.extraBooks || []).filter((b) => b.kind === 'hadith' && S.installed[b.key]).map((b) => b.key));
    for (const code of codes) {
      const b = await hadithBook(code); if (!b) continue;
      for (const h of b.hadiths) {
        if (out.length >= LIMIT) break;
        if (!h._n) h._n = norm(h.t);
        if (ok(h._n)) out.push(`<div class="result"><h3>${esc(b.title)}، رقم ${ar(h.n)}</h3><p>${esc(h.t.length > 500 ? h.t.slice(0, 500) + ' …' : h.t)}</p>
          <button type="button" data-act="open-hadith" data-id="${esc(h.id)}">افتح الحديث في كتابه</button></div>`);
      }
    }
  } else if (where.startsWith('taf:')) {
    const key = where.slice(4); const t = taf(key);
    for (let s = 1; s <= 114 && out.length < LIMIT; s++) {
      const gs = await bookGroups(key, s); if (!gs) continue;
      gs.forEach(([a1, a2, text], g) => {
        for (const [off, p] of paragraphs(text)) {
          if (out.length >= LIMIT) return;
          if (ok(norm(p))) out.push(`<div class="result"><h3>${esc(t.short)} — ${esc(surah(s).name)}: ${ar(a1)}${a2 !== a1 ? '–' + ar(a2) : ''}</h3>
            <p>${esc(plainText(p).slice(0, 400))}…</p><button type="button" data-act="open-source" data-key="${key}" data-s="${s}" data-g="${g}" data-o="${off}">افتح الموضع</button></div>`);
        }
      });
    }
  }
  $r.innerHTML = `<h2>النتائج (${ar(out.length)}${out.length >= LIMIT ? ' — أول ' + ar(LIMIT) + ' نتيجة' : ''})</h2>${out.join('') || '<p>لا توجد نتائج.</p>'}`;
  announce(`عدد النتائج ${out.length}`);
}

// ---------------------------------------------------------------- sources
function bookStatus(key) {
  const b = S.installed[key];
  if (S.downloads[key]) return `<span class="progress" id="prog-${key}">جاري التحميل…</span>`;
  if (!b) return '<span class="muted">غير محمّل</span>';
  if (b.complete) return '<span>محمّل كاملًا</span>';
  return `<span class="progress">محمّل جزئيًا (${ar(b.parts)} من ${ar(b.total || 114)})</span>`;
}
function tafRow(t) {
  const b = S.installed[t.key];
  return `<div class="book-row"><div class="t"><strong>${esc(t.title)}</strong> — ${esc(t.author || t.short)}<br>${bookStatus(t.key)}</div>
    ${b ? `<button type="button" data-act="read-taf" data-key="${t.key}">قراءة</button>` : ''}
    ${!b || !b.complete ? `<button type="button" data-act="dl-book" data-key="${t.key}">${b ? 'إكمال التحميل' : 'تحميل'}</button>` : ''}
    ${S.downloads[t.key] ? `<button type="button" data-act="cancel" data-key="${t.key}">إيقاف</button>` : ''}
    ${b ? `<button type="button" data-act="rm-book" data-key="${t.key}">حذف من الجهاز</button>` : ''}</div>`;
}
VIEWS.sources = async function () {
  S.installed = await window.api.books();
  const main = S.meta.tafsirs.filter((t) => t.role === 'main'), extra = S.meta.tafsirs.filter((t) => t.role === 'extra');
  const added = (S.settings.extraBooks || []);
  $main.innerHTML = `<h2>المصادر والمراجع</h2>
    <p class="summary">هذه الكتب التي اعتمد عليها البرنامج، تقرؤها كاملة داخله. كتب التفسير تُحمّل من الإنترنت مرة واحدة ثم تعمل بلا إنترنت. وكتب الحديث التسعة موجودة في البرنامج.</p>
    <p><button type="button" data-act="dl-all" class="primary">تحميل كل كتب التفسير غير المحمّلة</button></p>
    <h2>كتب التفسير (${ar(main.length)})</h2>${main.map(tafRow).join('')}
    <h2>كتب مساعدة: المأثور والتدبر</h2>${extra.map(tafRow).join('')}
    ${await extraSourcesHtml()}
    <h2>كتب الحديث التسعة</h2>
    ${S.meta.books.map((b) => `<div class="book-row"><div class="t"><strong>${esc(b.title)}</strong><br><span>موجود في البرنامج</span></div>
      <button type="button" data-act="read-hadith" data-code="${b.code}">قراءة</button></div>`).join('')}
    ${added.length ? `<h2>كتب أضفتها من قسم التحديث</h2>${added.map((b) => b.kind === 'tafsir' ? tafRow(b) : `<div class="book-row"><div class="t"><strong>${esc(b.title)}</strong><br>${bookStatus(b.key)}</div>
      ${S.installed[b.key] ? `<button type="button" data-act="read-hadith" data-code="${b.key}">قراءة</button>` : `<button type="button" data-act="dl-extra" data-key="${b.key}">تحميل</button>`}
      ${S.installed[b.key] ? `<button type="button" data-act="rm-book" data-key="${b.key}">حذف من الجهاز</button>` : ''}</div>`).join('')}` : ''}`;
};

async function extraSourcesHtml() {
  let h = '';
  for (const cat of Object.keys(CATS)) {
    const list = EXTRA.filter((b) => b.cat === cat);
    h += `<h2>كتب ${CATS[cat]} (${ar(list.length)})</h2>`;
    for (const b of list) {
      if (b.slug) { h += tafRow(b); continue; }
      const n = await window.api.qpCount(b.qp);
      h += `<div class="book-row"><div class="t"><strong>${esc(b.title)}</strong> — ${esc(b.author || b.short)}<br>
        <span class="muted">يُجلب من موقع قرآنبيديا آيةً آية عند فتحها، ويُحفظ على جهازك فيعمل بعدها بلا إنترنت.${n ? ` المحفوظ الآن: ${ar(n)} آية.` : ''}</span>
        ${S.downloads[b.key] ? `<span class="progress" id="prog-${b.key}">جاري الحفظ…</span>` : ''}</div>
        <button type="button" data-act="qp-surah" data-key="${b.key}" data-s="${S.settings.surah}">حفظ سورة ${esc(surah(S.settings.surah).name)} للعمل بلا إنترنت</button>
        ${n ? `<button type="button" data-act="qp-rm" data-id="${b.qp}">حذف المحفوظ من الجهاز</button>` : ''}</div>`;
    }
  }
  h += '<p class="src">«الدر المصون» للسمين الحلبي يجمع القراءات والإعراب، فيظهر في القسمين.</p>';
  return h;
}

// ---------------------------------------------------------------- update and add books
VIEWS.update = async function () {
  const c = S.catalog;
  let h = `<h2>التحديث وإضافة الكتب</h2>
    <p class="summary">يتصل البرنامج بالمصادر المفتوحة التي أُخذت منها الكتب، فيعرض كل كتاب تفسير أو حديث جديد أضيف إليها، فتحمّله ويظهر في «المصادر والمراجع» و«أقوال المفسرين» والبحث.</p>
    <p><button type="button" class="primary" data-act="check-updates">البحث عن كتب جديدة وتحديثات</button>
    <button type="button" data-act="resume-all">إكمال تحميل الكتب الناقصة</button></p><div id="upd" aria-live="polite">`;
  if (c) {
    const known = new Set(allTafsirs().concat(EXTRA).map((t) => t.slug).filter(Boolean));
    const newT = c.tafsirs.filter((t) => !known.has(t.slug));
    const knownH = new Set(['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik'].map((x) => 'ara-' + x)
      .concat((S.settings.extraBooks || []).filter((b) => b.kind === 'hadith').map((b) => b.edition)));
    const newH = c.hadith.filter((x) => !knownH.has(x.edition));
    h += `<h2>كتب تفسير يمكن إضافتها (${ar(newT.length)})</h2>${newT.map((t) => `<div class="book-row"><div class="t"><strong>${esc(t.title)}</strong></div>
      <button type="button" data-act="add-taf" data-slug="${esc(t.slug)}">إضافة وتحميل</button></div>`).join('') || '<p>لا توجد كتب تفسير جديدة.</p>'}
      <h2>كتب حديث يمكن إضافتها (${ar(newH.length)})</h2>${newH.map((x) => `<div class="book-row"><div class="t"><strong>${esc(x.title)}</strong></div>
      <button type="button" data-act="add-hadith-book" data-ed="${esc(x.edition)}">إضافة وتحميل</button></div>`).join('') || '<p>لا توجد كتب حديث جديدة.</p>'}
      <p class="src">آخر بحث: ${esc(c.at)}</p>`;
  }
  h += `</div><h2>تحديث البرنامج نفسه</h2>
    <p>ربط الأحاديث بالآيات والتدبر محسوبان مسبقًا داخل البرنامج من الكتب الثمانية عشر. فالكتب التي تضيفها من هنا تقرؤها وتبحث فيها وتراها في «أقوال المفسرين»، أما إدخالها في الربط الآلي فيحتاج إصدارًا جديدًا من البرنامج.</p>`;
  $main.innerHTML = h;
};
const HADITH_TITLES = { 'ara-nawawi': 'الأربعون النووية', 'ara-qudsi': 'الأحاديث القدسية (الأربعون القدسية)', 'ara-dehlawi': 'الأربعون للدهلوي' };
async function checkUpdates() {
  const $u = document.getElementById('upd');
  $u.innerHTML = '<p class="loading">جاري الاتصال بالمصادر…</p>';
  try {
    const ed = JSON.parse(await window.api.netJson([
      'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/editions.json',
      'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/editions.json']));
    const tafsirs = ed.filter((x) => String(x.language_name || '').toLowerCase() === 'arabic' && !/i-?rab|irab|qira|gharib|dependency|tahlil|nashr|jadwal/i.test(x.slug))
      .map((x) => ({ slug: x.slug, title: x.name, author: x.author_name }));
    let hadith = [];
    try {
      const he = JSON.parse(await window.api.netJson([
        'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json',
        'https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions.json']));
      for (const k of Object.keys(he)) for (const c of he[k].collection || []) {
        if (c.language === 'Arabic' || /^ara-/.test(c.name)) hadith.push({ edition: c.name, title: HADITH_TITLES[c.name] || he[k].name || c.name });
      }
    } catch { /* hadith catalog unavailable */ }
    S.catalog = { tafsirs, hadith, at: new Date().toLocaleString('ar-EG') };
    await VIEWS.update();
    announce('اكتمل البحث عن الكتب الجديدة');
  } catch (err) {
    $u.innerHTML = '<p class="bad">تعذّر الاتصال بالمصادر. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.</p>';
    alertMsg('تعذّر الاتصال بالمصادر');
  }
}

// ---------------------------------------------------------------- settings and method
VIEWS.settings = async function () {
  const info = await window.api.info();
  const fs = S.settings.fontSize || 20, th = S.settings.theme || 'light';
  const aud = await window.api.audioSize();
  $main.innerHTML = `<h2>الإعدادات</h2>
    <p><label for="fs">حجم الخط</label> <select id="fs" data-act="fontsize">${[16, 18, 20, 22, 24, 28, 32].map((v) => `<option value="${v}"${v === fs ? ' selected' : ''}>${ar(v)}</option>`).join('')}</select>
    <label for="th">المظهر</label> <select id="th" data-act="theme">
      <option value="light"${th === 'light' ? ' selected' : ''}>فاتح</option><option value="dark"${th === 'dark' ? ' selected' : ''}>داكن</option>
      <option value="contrast"${th === 'contrast' ? ' selected' : ''}>تباين عالٍ</option></select></p>
    <p><label for="script">رسم الآية</label> <select id="script" data-act="script">
      <option value="imlai"${S.settings.script !== 'uthmani' ? ' selected' : ''}>الرسم الإملائي المشكول كالمكتبة الشاملة (أوضح مع قارئ الشاشة)</option>
      <option value="uthmani"${S.settings.script === 'uthmani' ? ' selected' : ''}>الرسم العثماني</option></select>
      ${S.imlai ? '' : '<button type="button" data-act="imlai-load">تحميل النص الإملائي الآن</button>'}</p>
    <h2>التلاوة</h2>
    <p>التلاوة بصوت الشيخ محمود خليل الحصري، مرتّلة برواية حفص عن عاصم. كل آية تستمع إليها تُحفظ على جهازك، فتعمل بعد ذلك بلا إنترنت.
      ${aud.files ? `المحفوظ الآن: ${ar(aud.files)} آية (${ar(Math.round(aud.bytes / 1048576))} ميجابايت). <button type="button" data-act="audio-clear">حذف التلاوات المحفوظة</button>` : ''}</p>
    <p><button type="button" data-act="reset-edits">إلغاء كل تعديلاتي اليدوية على الأحاديث</button></p>
    <h2>اختصارات لوحة المفاتيح</h2>
    <ul><li>Alt مع الأرقام من 1 إلى 6: التنقل بين الأقسام.</li><li>Alt مع Page Down: الآية التالية، وAlt مع Page Up: الآية السابقة.</li>
    <li>Ctrl مع الأرقام من 1 إلى 7: اختيار نوع التفسير (بالسنة، أسباب النزول، القراءات، الإعراب، المعاني، أقوال المفسرين، التدبر). وCtrl مع T: الانتقال إلى قائمة نوع التفسير.</li>
    <li>Ctrl مع M: تشغيل تلاوة الآية بصوت الحصري أو إيقافها.</li>
    <li>Ctrl مع G: الانتقال إلى اختيار السورة.</li><li>Escape في صفحة الكتاب: الرجوع إلى حيث كنت.</li>
    <li>كل حديث وكل وقفة لها عنوان مستقل، فتنتقل بينها بحرف H في قارئ الشاشة، وبين الأقسام بالرقم 2.</li></ul>
    <h2>منهج البرنامج</h2>
    <h3>الأحاديث</h3><p>الأحاديث من الكتب التسعة: صحيح البخاري، وصحيح مسلم، وسنن أبي داود، وجامع الترمذي، وسنن النسائي، وسنن ابن ماجه، وموطأ مالك، ومسند أحمد، وسنن الدارمي. ما في الصحيحين صحيح، وأحكام السنن الأربعة للشيخ الألباني وغيره كما وردت في قاعدة البيانات. وأحاديث المسند والموطأ والدارمي لا أحكام لها في القاعدة، فتظهر في قسم مستقل بعنوان «لم يُحكم عليها»، والضعيف في قسم مستقل مع التنبيه.</p>
    <h3>الربط بين الآية والحديث</h3><p>يُربط الحديث بالآية بطريقين: أن يرد لفظ الآية في متن الحديث (ربط صريح)، أو أن يذكره أحد المفسرين الستة عشر أو موسوعة التفسير المأثور عند الآية (ربط غير مباشر)، فيُطابَق كلام المفسر بنص الحديث في الكتب التسعة. وسبب الربط منقول بنص كلام المفسر قبل الحديث وبعده، دون صياغة من البرنامج. وزر «تحقق من المصدر» يفتح الكتاب على الموضع نفسه، ويذكر رقم الصفحة المطبوعة حيث توجد في النسخة.</p>
    <h3>التدبر</h3><p>الوقفات التدبرية من كتاب «تدبر وعمل»، وكل وقفة منسوبة إلى مفسرها بالجزء والصفحة، ومن كلام ابن القيم والبقاعي وابن عاشور والسعدي والآلوسي والقرطبي والشنقيطي، مستخرجة بالعبارات التي يستعملونها في الفوائد واللطائف والنكات والمناسبات، ومصنفة إلى إيماني ولغوي وتناسب وعلمي. والتصنيف آلي قد يخطئ أحيانًا، والإشارات العلمية اجتهاد من المفسرين.</p>
    <h3>أسباب النزول والقراءات والإعراب ومعاني القرآن</h3><p>تُعرض الآية أولًا، ثم تختار نوع التفسير من القائمة. وكل ما في هذه الأقسام منقول بنصه من كتبه دون صياغة من البرنامج: أسباب النزول من «أسباب النزول» للواحدي و«المحرر في أسباب النزول من خلال الكتب التسعة» للمزيني، والقراءات من «النشر» لابن الجزري و«القراءات» من الموسوعة القرآنية و«الدر المصون» للسمين الحلبي، والإعراب من الدرويش والدعاس و«الإعراب الميسر» و«الجدول» والنحاس والخراط و«الدر المصون»، ومعاني القرآن من «السراج في بيان غريب القرآن» و«الميسر في الغريب» و«تحليل كلمات القرآن» و«التفسير الميسر» و«معاني القرآن» للفراء.</p>
    <h3>تنبيه</h3><p>الربط والاستخراج آليان، فينبغي مراجعة طالب علم متخصص قبل النشر العام، وزر «استبعاد» عند كل حديث لتصحيح ما يقع من خطأ.</p>
    <h3>مصادر النصوص</h3><p>نصوص التفاسير من مستودع tafsir_api المفتوح، والأحاديث من hadith-api وOpen-Hadith-Data، ونص القرآن من quran-api (والرسم الإملائي من نسخة Tanzil المشكولة)، وكتب أسباب النزول وبعض كتب الإعراب والمعاني من موقع قرآنبيديا (quranpedia.net)، والتلاوة من موقع EveryAyah.</p>
    <p class="src">الإصدار ${esc(info.version)} — مجلد بياناتك: ${esc(info.userData)}</p>`;
};

// ---------------------------------------------------------------- events
async function onChange(e) {
  const t = e.target, act = t.dataset.act;
  if (act === 'surah') { const s = +t.value; if (S.view === 'tadabburi') { S.settings.surah = s; S.settings.ayah = 1; save(); await VIEWS.tadabburi(); focusId('sel-surah'); } else setAyah(s, 1, '#sel-surah'); }
  else if (act === 'ayah') setAyah(S.settings.surah, +t.value, '#sel-ayah');
  else if (act === 'mufbook') { S.settings.mufBook = t.value; save(); await VIEWS.ayah(); focusId('muf-book'); }
  else if (act === 'ttype') setType(t.value, true);
  else if (act === 'catbook') { S.settings.catBook = S.settings.catBook || {}; S.settings.catBook[t.dataset.cat] = t.value; save(); await VIEWS.ayah(); focusId('cat-book'); }
  else if (act === 'follow') { S.settings.follow = t.checked; save(); }
  else if (act === 'script') { S.settings.script = t.value; save(); if (t.value !== 'uthmani' && !S.imlai) loadImlai(true); }
  else if (act === 'tadfilter') { S.settings.tadFilter[t.value] = t.checked; save(); const v = t.value; await VIEWS.tadabburi(); const cb = $main.querySelector(`input[value="${v}"]`); if (cb) cb.focus(); }
  else if (act === 'fontsize') { S.settings.fontSize = +t.value; applyLook(); save(); }
  else if (act === 'theme') { S.settings.theme = t.value; applyLook(); save(); }
  else if (act === 'rd-surah') { S.readerState.s = +t.value; await VIEWS.reader(); focusId('rd-surah'); }
}
async function onSubmit(e) {
  e.preventDefault();
  const f = e.target.dataset.form;
  if (f === 'search') runSearch(document.getElementById('q').value, document.getElementById('where').value);
  else if (f === 'goto-num') {
    const v = document.getElementById('num').value.trim().replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    const b = await hadithBook(S.readerState.code);
    const i = b.hadiths.findIndex((h) => String(h.n) === v || String(Math.floor(h.n)) === v);
    if (i < 0) { alertMsg('لا يوجد حديث بهذا الرقم'); return; }
    S.readerState.page = Math.floor(i / 25); S.readerState.target = b.hadiths[i].id; await VIEWS.reader();
  }
}
async function onClick(e) {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const d = b.dataset, act = d.act;
  switch (act) {
    case 'prev': step(-1); break;
    case 'next': step(1); break;
    case 'open-source': openSource(d.key, +d.s, d.g, d.o); break;
    case 'open-hadith': openHadith(d.id); break;
    case 'back': { const bk = S.readerState.back; await go(bk.view); if (bk.focus) focusId(bk.focus); break; }
    case 'grp': S.readerState.g += +d.d; S.readerState.o = -1; await VIEWS.reader(); $main.querySelector('h3').tabIndex = -1; $main.querySelector('h3').focus(); break;
    case 'hpage': S.readerState.page += +d.d; S.readerState.target = null; await VIEWS.reader(); $main.querySelector('.src').tabIndex = -1; $main.querySelector('.src').focus(); break;
    case 'more-reasons': { const box = document.getElementById('more-' + d.num); box.hidden = false; b.remove(); const h = box.querySelector('h5'); if (h) { h.tabIndex = -1; h.focus(); } break; }
    case 'toggle': {
      const box = document.getElementById(d.target); const open = box.hidden;
      if (open && !box.dataset.filled) {
        let n = S.weakStart, h = '';
        for (const en of S.weakList) h += await hadithArticle(en, ++n);
        box.innerHTML = h; box.dataset.filled = '1';
      }
      box.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'إخفاء الأحاديث الضعيفة' : 'إظهار الأحاديث الضعيفة';
      break;
    }
    case 'copy-hadith': {
      const art = document.getElementById('h-' + d.num);
      const txt = Array.from(art.querySelectorAll('h3, .matn, ul.plain li')).map((x) => x.innerText.replace(/افتح الحديث في.*$/, '').trim()).join('\n');
      await navigator.clipboard.writeText(`﴿${ayahText(S.settings.surah, S.settings.ayah)}﴾ [${surah(S.settings.surah).name}: ${S.settings.ayah}]\n${txt}`);
      announce('تم نسخ الحديث مع تخريجه'); break;
    }
    case 'exclude': {
      const k = edKey(); (S.settings.edits.excluded[k] = S.settings.edits.excluded[k] || []).push(d.id);
      await save(); announce('تم استبعاد الحديث من هذه الآية'); await VIEWS.ayah(); focusId('type-h'); break;
    }
    case 'add-hadith': addHadithDialog(); break;
    case 'do-add': {
      const code = document.getElementById('add-book').value; const num = document.getElementById('add-num').value.trim().replace(/[٠-٩]/g, (x) => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
      const bk = await hadithBook(code); const h = bk.hadiths.find((x) => String(x.n) === num);
      if (!h) { alertMsg('لا يوجد حديث بهذا الرقم في هذا الكتاب'); return; }
      const k = edKey(); (S.settings.edits.added[k] = S.settings.edits.added[k] || []).push(h.id);
      await save(); announce('تمت إضافة الحديث إلى هذه الآية'); await VIEWS.ayah(); focusId('type-h'); break;
    }
    case 'export-surah': exportSurah(); break;
    case 'goto-ayah': S.settings.ttype = 'sunnah'; await go('ayah'); await setAyah(+d.s, +d.a); break;
    case 'goto-tad': S.settings.ttype = 'tadabbur'; await go('ayah'); await setAyah(+d.s, +d.a); break;
    case 'play': togglePlay(); break;
    case 'retype': await VIEWS.ayah(); focusId('type-h'); break;
    case 'qp-surah': {
      const bk = extra(d.key); const s = +d.s;
      S.downloads[bk.key] = { done: 0, total: surah(s).ayahs, title: `${bk.title} (سورة ${surah(s).name})` }; showDlBar(); announce(`بدأ حفظ ${bk.short} لسورة ${surah(s).name}`);
      await window.api.qpSurah(bk.qp, s, surah(s).ayahs); delete S.downloads[bk.key]; showDlBar(); if (S.view === 'sources') await VIEWS.sources(); break;
    }
    case 'qp-rm': await window.api.qpRemove(+d.id); announce('تم حذف الكتاب من الجهاز'); await VIEWS.sources(); break;
    case 'audio-clear': await window.api.audioClear(); announce('تم حذف التلاوات المحفوظة'); await VIEWS.settings(); break;
    case 'imlai-load': await loadImlai(true); break;
    case 'read-taf': S.readerState = { kind: 'tafsir-browse', key: d.key, s: S.settings.surah, back: { view: S.view } }; await go('reader'); break;
    case 'read-hadith': S.readerState = { kind: 'hadith', code: d.code, page: 0, back: { view: S.view } }; await go('reader'); break;
    case 'dl-book': { const t = taf(d.key); const p = download(tafsirSpec(t)); await refreshAfter(p); break; }
    case 'dl-part': { const t = taf(d.key); await download({ ...tafsirSpec(t, [+d.s]), title: t.title }); await VIEWS[S.view](); if (S.view === 'ayah') focusId('type-h'); break; }
    case 'dl-all': {
      const ts = allTafsirs().filter((t) => !(S.installed[t.key] && S.installed[t.key].complete));
      if (!ts.length) { announce('كل كتب التفسير محمّلة'); break; }
      announce(`سيتم تحميل ${ts.length} من الكتب واحدًا بعد الآخر`);
      VIEWS.sources();
      for (const t of ts) { await download(tafsirSpec(t)); if (S.view === 'sources') await VIEWS.sources(); }
      announce('انتهى تحميل الكتب'); break;
    }
    case 'cancel': await window.api.cancelBook(d.key); break;
    case 'rm-book': {
      await window.api.removeBook(d.key); Object.keys(S.parts).forEach((k) => { if (k.startsWith(d.key + ':')) delete S.parts[k]; });
      delete S.hadith[d.key]; S.installed = await window.api.books(); announce('تم حذف الكتاب من الجهاز'); await VIEWS.sources(); break;
    }
    case 'dl-extra': { const bk = (S.settings.extraBooks || []).find((x) => x.key === d.key); await download(hadithSpec(bk)); await VIEWS.sources(); break; }
    case 'check-updates': checkUpdates(); break;
    case 'resume-all': {
      const ts = allTafsirs().filter((t) => S.installed[t.key] && !S.installed[t.key].complete);
      if (!ts.length) { announce('لا توجد كتب ناقصة'); break; }
      for (const t of ts) await download(tafsirSpec(t));
      announce('انتهى إكمال التحميل'); break;
    }
    case 'add-taf': {
      const c = S.catalog.tafsirs.find((x) => x.slug === d.slug);
      const key = 'x-' + d.slug.replace(/[^a-z0-9-]/gi, '').slice(0, 40);
      const bk = { key, slug: d.slug, title: c.title, author: c.author || '', short: c.title, kind: 'tafsir', branch: 'main' };
      S.settings.extraBooks = (S.settings.extraBooks || []).filter((x) => x.key !== key).concat([bk]); await save();
      b.disabled = true; announce(`أضيف ${c.title}، وبدأ تحميله`);
      download(tafsirSpec(bk)).then(() => { if (S.view === 'update') VIEWS.update(); }); break;
    }
    case 'add-hadith-book': {
      const c = S.catalog.hadith.find((x) => x.edition === d.ed);
      const key = 'h-' + d.ed.replace(/[^a-z0-9-]/gi, '');
      const bk = { key, edition: d.ed, title: c.title, kind: 'hadith' };
      S.settings.extraBooks = (S.settings.extraBooks || []).filter((x) => x.key !== key).concat([bk]); await save();
      b.disabled = true; await download(hadithSpec(bk)); if (S.view === 'update') VIEWS.update(); break;
    }
    case 'reset-edits': S.settings.edits = { excluded: {}, added: {} }; await save(); announce('أُلغيت كل التعديلات اليدوية'); break;
    default: break;
  }
}
async function refreshAfter(p) { if (S.view === 'sources') await VIEWS.sources(); await p; if (S.view === 'sources') await VIEWS.sources(); }
function addHadithDialog() {
  const box = document.createElement('div');
  box.className = 'item';
  box.innerHTML = `<h3 id="add-h">إضافة حديث إلى هذه الآية</h3>
    <p><label for="add-book">الكتاب</label> <select id="add-book">${S.meta.books.map((b) => `<option value="${b.code}">${esc(b.title)}</option>`).join('')}</select>
    <label for="add-num">رقم الحديث</label> <input id="add-num" type="text" inputmode="numeric" size="8">
    <button type="button" data-act="do-add" class="primary">إضافة</button></p>`;
  const sum = document.querySelector('#tbody .summary');
  sum.after(box);
  document.getElementById('add-book').focus();
}
async function exportSurah() {
  const s = S.settings.surah;
  announce('جاري إعداد الملف…');
  let html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تفسير سورة ${esc(surah(s).name)} بالسنة</title>
    <style>body{font-family:"Traditional Arabic",serif;font-size:20px;line-height:1.9;max-width:900px;margin:auto;padding:1rem}h2{color:#0f5c4a}.src{color:#555;font-size:.85em}</style>
    <h1>تفسير سورة ${esc(surah(s).name)} بالسنة</h1><p>من برنامج «المنة في التفسير بالسنة وثقات الأئمة»</p>`;
  for (let a = 1; a <= surah(s).ayahs; a++) {
    const list = (await entriesFor(s, a)).filter((e) => e.s !== 'W');
    if (!list.length) continue;
    html += `<h2>الآية ${ar(a)}: ﴿${esc(ayahText(s, a))}﴾</h2>`;
    let n = 0;
    for (const e of list) {
      const h = await hadith(e.h[0]); if (!h) continue;
      const tk = [];
      for (const id of e.h) { const x = await hadith(id); if (x) tk.push(`${bookTitle(id.split(':')[0])} (${ar(x.n)}) — ${gradeLabel(x, id.split(':')[0])}`); }
      html += `<h3>${ar(++n)}.</h3><p>${esc(h.t)}</p><p class="src">${esc(tk.join('؛ '))}</p>`;
      if (e.d) html += `<p class="src">ربط صريح: ورد لفظ الآية في الحديث.</p>`;
      else if (e.r[0]) html += `<p class="src">ذكره ${esc(e.r.map((r) => SRC_NAME(r[0])).join('، '))} عند الآية.</p>`;
    }
  }
  const p = await window.api.saveText(`تفسير سورة ${surah(s).name} بالسنة.html`, html);
  if (p) announce('تم حفظ الملف'); else announce('لم يُحفظ الملف');
}
