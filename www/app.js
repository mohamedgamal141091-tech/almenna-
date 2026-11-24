/* المنة في التفسير بالسنة وثقات الأئمة — تطبيق أندرويد */
(function () {
  'use strict';
  const M = window.MENNA;
  const $ = (id) => document.getElementById(id);
  const AC = 'https://api.alquran.cloud/v1';
  const QC = 'https://api.quran.com/api/v4';
  const HAD = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

  /* ---------- التخزين ---------- */
  const store = {
    raw(k, v) {
      try {
        if (v === undefined) { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) { /* التخزين غير متاح */ }
      return v;
    },
    get(k, def) { const v = this.raw('menna:' + profile() + ':' + k); return v == null ? def : v; },
    set(k, v) { return this.raw('menna:' + profile() + ':' + k, v); }
  };
  const global = store.raw('menna:global') || { profiles: ['المستخدم الأول'], current: 'المستخدم الأول' };
  function profile() { return global.current; }
  function saveGlobal() { store.raw('menna:global', global); }

  const defaults = {
    reciter: 'ar.husary', rasm: 'quran-simple', speed: '1', repeat: 1, autoNext: false, autoTafsir: false,
    sleep: 0, level: 'research', font: '1', theme: 'light', tones: true, daily: true
  };
  let S = Object.assign({}, defaults, store.get('settings', {}));

  /* ---------- أدوات عامة ---------- */
  function announce(msg) { const a = $('announcer'); a.textContent = ''; setTimeout(() => { a.textContent = msg; }, 60); }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function expand(t) { M.honorifics.forEach(([re, rep]) => { t = t.replace(re, rep); }); return t.replace(/\s{2,}/g, ' ').trim(); }
  function norm(t) {
    return String(t)
      .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[^ء-ي0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function htmlToParas(html) {
    const t = String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li)>/gi, '\n');
    const d = new DOMParser().parseFromString(t, 'text/html');
    return (d.body.textContent || '').split(/\n+/).map((x) => x.trim()).filter((x) => x.length > 1);
  }
  function arNum(n) { return Number(n).toLocaleString('ar-EG'); }
  function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dayIndex() { return Math.floor(Date.now() / 86400000); }

  async function getJSON(url, useCache = true) {
    let cache = null;
    if (useCache && 'caches' in window) {
      try { cache = await caches.open('menna-v1'); const hit = await cache.match(url); if (hit) return hit.json(); } catch (e) { cache = null; }
    }
    let res;
    try { res = await fetch(url); } catch (e) { throw new Error('تعذر الاتصال بالإنترنت. هذا الجزء يحتاج إنترنت أول مرة فقط.'); }
    if (!res.ok) throw new Error('المصدر لم يستجب (رمز ' + res.status + '). حاول مرة أخرى بعد قليل.');
    if (cache) { try { await cache.put(url, res.clone()); } catch (e) { /* لا مساحة */ } }
    return res.json();
  }

  /* ---------- نغمات تمييز الأقسام ---------- */
  let actx = null;
  function tone(kind) {
    if (!S.tones) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const f = { ayah: 660, sahih: 880, hadith: 520, athar: 440, sajda: 990, ok: 760, bad: 300 }[kind] || 600;
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = f; g.gain.value = 0.08; o.connect(g); g.connect(actx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.18); o.stop(actx.currentTime + 0.2);
    } catch (e) { /* لا صوت */ }
  }

  /* ---------- الشاشات ---------- */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== id; });
    document.querySelectorAll('nav button').forEach((b) => {
      if (b.dataset.go === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const h = document.querySelector('#' + id + ' h2'); if (h) h.focus();
    if (id === 'saved') renderSaved();
    if (id === 'hifz') renderReview();
    if (id === 'wird') renderWird();
    if (id === 'books') renderBooks();
  }
  document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => show(b.dataset.go)));

  /* ---------- فهرس السور ---------- */
  let SURAHS = [];
  async function loadSurahs() {
    const j = await getJSON(AC + '/surah');
    SURAHS = j.data.map((s) => ({ n: s.number, name: s.name.replace(/^سُورَةُ\s*/, '').trim(), count: s.numberOfAyahs, type: s.revelationType }));
    SURAHS.forEach((s) => { s.plain = norm(s.name); });
    renderSurahs();
    const opts = SURAHS.map((s) => `<option value="${s.n}">${s.n}. ${esc(s.name)}</option>`).join('');
    $('hifzSurah').innerHTML = opts;
  }
  function typeAr(t) { return t === 'Meccan' ? 'مكية' : 'مدنية'; }
  function renderSurahs() {
    const f = $('surahFilter').value;
    $('surahList').innerHTML = SURAHS.filter((s) => f === 'all' || s.type === f).map((s) =>
      `<li><button data-s="${s.n}">سورة ${esc(s.name)}، ${typeAr(s.type)}، ${arNum(s.count)} آية</button></li>`).join('');
  }
  $('surahFilter').addEventListener('change', () => { renderSurahs(); announce('عدد السور: ' + arNum($('surahList').children.length)); });
  $('surahList').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) openAyah(+b.dataset.s, 1); });
  function surah(n) { return SURAHS[n - 1] || { n, name: 'سورة ' + n, count: 286, type: '' }; }

  /* ---------- عرض الآية ---------- */
  let cur = { s: 1, a: 1, data: null, audio: '' };
  async function fetchAyah(s, a, withAudio = true) {
    const eds = S.rasm + (withAudio ? ',' + S.reciter : '');
    const j = await getJSON(`${AC}/ayah/${s}:${a}/editions/${eds}`);
    const d = Array.isArray(j.data) ? j.data : [j.data];
    return { text: d[0].text, number: d[0].number, juz: d[0].juz, page: d[0].page, hizb: d[0].hizbQuarter,
      sajda: d[0].sajda, audio: d[1] ? d[1].audio : '' };
  }
  async function openAyah(s, a, opts = {}) {
    const sr = surah(s);
    if (a < 1) { if (s > 1) return openAyah(s - 1, surah(s - 1).count, opts); a = 1; }
    if (a > sr.count) { if (s < 114) return openAyah(s + 1, 1, opts); a = sr.count; }
    cur = { s, a, data: null, audio: '' };
    show('reader');
    $('hReader').textContent = `سورة ${sr.name}، الآية ${arNum(a)}`;
    $('ayahText').textContent = 'جارٍ التحميل…';
    $('tafsirOut').innerHTML = '';
    try {
      const d = await fetchAyah(s, a);
      if (cur.s !== s || cur.a !== a) return;
      cur.data = d; cur.audio = d.audio;
      $('ayahText').textContent = d.text;
      $('ayahMeta').textContent = `السورة ${typeAr(sr.type)} — الجزء ${arNum(d.juz)} — الصفحة ${arNum(d.page)} — ربع الحزب ${arNum(d.hizb)} — الآية ${arNum(a)} من ${arNum(sr.count)}`;
      const sj = $('sajdaNote');
      if (d.sajda) { sj.hidden = false; sj.textContent = 'هنا موضع سجدة تلاوة، يُستحب السجود للقارئ والمستمع.'; tone('sajda'); } else sj.hidden = true;
      store.set('last', { s, a });
      $('btnBookmark').textContent = isBookmarked(s, a) ? 'حذف العلامة' : 'إضافة علامة';
      if (opts.play) play();
    } catch (e) { $('ayahText').textContent = e.message; announce(e.message); }
  }
  $('btnPrev').addEventListener('click', () => openAyah(cur.s, cur.a - 1));
  $('btnNext').addEventListener('click', () => openAyah(cur.s, cur.a + 1));

  /* ---------- التلاوة ---------- */
  const player = $('player');
  let repeatLeft = 0, sleepTimer = null, playMode = 'reader';
  function play() {
    if (!cur.audio) { announce('التلاوة غير متاحة لهذه الآية الآن'); return; }
    playMode = 'reader';
    repeatLeft = Math.max(1, +S.repeat) - 1;
    startAudio(cur.audio);
    $('btnPlay').textContent = 'إيقاف';
    if (+S.sleep > 0 && !sleepTimer) {
      sleepTimer = setTimeout(() => { fadeOut(); sleepTimer = null; announce('انتهى مؤقت التلاوة'); }, S.sleep * 60000);
    }
  }
  function startAudio(url) {
    player.src = url; player.playbackRate = +S.speed; player.volume = 1;
    player.play().catch(() => announce('تعذر تشغيل التلاوة. تأكد من الاتصال بالإنترنت.'));
  }
  function fadeOut() {
    let v = 1; const t = setInterval(() => { v -= 0.1; if (v <= 0) { clearInterval(t); player.pause(); player.volume = 1; $('btnPlay').textContent = 'استماع'; } else player.volume = v; }, 300);
  }
  function stopAudio() { player.pause(); $('btnPlay').textContent = 'استماع'; }
  $('btnPlay').addEventListener('click', () => { if (!player.paused && playMode === 'reader') stopAudio(); else play(); });
  player.addEventListener('ended', () => {
    if (playMode !== 'reader') return;
    if (repeatLeft > 0) { repeatLeft--; player.currentTime = 0; player.play(); return; }
    $('btnPlay').textContent = 'استماع';
    if (S.autoTafsir) showTafsir();
    if (S.autoNext) setTimeout(() => openAyah(cur.s, cur.a + 1, { play: true }), S.autoTafsir ? 400 : 100);
  });

  /* ---------- التفسير ---------- */
  $('tafsirType').innerHTML = M.tafsirs.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  $('tafsirType').value = store.get('tafsirType', 'sunnah');
  $('tafsirType').addEventListener('change', () => store.set('tafsirType', $('tafsirType').value));
  $('btnTafsir').addEventListener('click', showTafsir);

  async function tafsirParas(id, s, a) {
    if (id.startsWith('qc:')) {
      const j = await getJSON(`${QC}/tafsirs/${id.slice(3)}/by_ayah/${s}:${a}`);
      return htmlToParas(j.tafsir && j.tafsir.text);
    }
    const j = await getJSON(`${AC}/ayah/${s}:${a}/${id.slice(3)}`);
    return htmlToParas(j.data.text);
  }
  function detectSource(p) {
    const found = [];
    [['البخاري', 'البخاري'], ['مسلم', 'مسلم'], ['أبو داود', 'أبو داود'], ['الترمذي', 'الترمذي'], ['النسائي', 'النسائي'],
      ['ابن ماجه', 'ابن ماجه'], ['أحمد', 'أحمد'], ['مالك', 'مالك'], ['الدارمي', 'الدارمي'], ['الصحيحين', 'البخاري ومسلم']]
      .forEach(([k, v]) => { if (p.includes(k) && !found.includes(v)) found.push(v); });
    return found;
  }
  function isHadith(p) { return M.hadithMarkers.some((m) => p.includes(m)); }
  function atharOf(p) { return M.atharNames.find((n) => p.includes(n)); }

  async function showTafsir() {
    const id = $('tafsirType').value, def = M.tafsirs.find((t) => t.id === id), out = $('tafsirOut');
    const { s, a } = cur, sr = surah(s);
    out.innerHTML = '<p>جارٍ التحميل…</p>';
    try {
      let html = '', count = 0;
      if (def.kind === 'sunnah' || def.kind === 'athar') {
        const paras = await tafsirParas('qc:14', s, a);
        let items = def.kind === 'sunnah' ? paras.filter(isHadith) : paras.filter((p) => !isHadith(p) && atharOf(p));
        const total = items.length;
        if (S.level === 'basic') items = items.slice(0, 6);
        count = items.length;
        html = items.map((p, i) => {
          const tag = def.kind === 'sunnah'
            ? (detectSource(p).length ? 'ورد عند: ' + detectSource(p).join('، ') : 'حديث لم يُذكر مخرّجه في هذا الموضع')
            : 'قول: ' + atharOf(p);
          return `<div class="item"><h3>${def.kind === 'sunnah' ? 'الحديث' : 'الأثر'} ${arNum(i + 1)}</h3><p>${esc(expand(p))}</p><p class="tag">${esc(tag)} — المصدر: تفسير ابن كثير</p></div>`;
        }).join('');
        const head = def.kind === 'sunnah'
          ? `<h3>الأحاديث في تفسير الآية: ${arNum(total)}${total > count ? '، يُعرض منها ' + arNum(count) : ''}</h3>`
          : `<h3>أقوال الصحابة والتابعين: ${arNum(total)}</h3>`;
        const warn = S.level === 'research'
          ? '<p class="note">تنبيه: الأحاديث والآثار منقولة كما ساقها ابن كثير بأسانيدها، والحكم عليها يُرجع فيه إلى كلامه في الموضع نفسه وإلى كتب التخريج. ما لم يُحكم عليه فهو غير محكوم عليه هنا.</p>' : '';
        html = count ? head + warn + html : `<p>لم يرد في تفسير ابن كثير ${def.kind === 'sunnah' ? 'حديث' : 'أثر'} صريح عند هذه الآية. جرّب «الأحاديث التي ذكرت الآية» للبحث في كتب السنة مباشرة.</p>`;
        tone(def.kind === 'sunnah' ? 'sahih' : 'athar');
      } else {
        const paras = await tafsirParas(id, s, a);
        count = paras.length;
        html = `<h3>${esc(def.name)}</h3>` + paras.map((p) => `<p>${esc(expand(p))}</p>`).join('') +
          `<p class="tag">المصدر: ${esc(def.book)} — سورة ${esc(sr.name)}، الآية ${arNum(a)}</p>`;
      }
      out.innerHTML = html;
      announce('تم عرض ' + def.name.split('—')[0].split(':')[0]);
      const h = out.querySelector('h3'); if (h) { h.tabIndex = -1; h.focus(); }
    } catch (e) { out.innerHTML = `<p>${esc(e.message)}</p>`; announce(e.message); }
  }

  /* ---------- العلامات والملاحظات ---------- */
  function key(s, a) { return s + ':' + a; }
  function isBookmarked(s, a) { return store.get('bookmarks', []).some((b) => b.k === key(s, a)); }
  $('btnBookmark').addEventListener('click', () => {
    let bm = store.get('bookmarks', []); const k = key(cur.s, cur.a);
    if (bm.some((b) => b.k === k)) { bm = bm.filter((b) => b.k !== k); announce('حُذفت العلامة'); $('btnBookmark').textContent = 'إضافة علامة'; }
    else { bm.unshift({ k, s: cur.s, a: cur.a, d: today() }); announce('أُضيفت علامة'); $('btnBookmark').textContent = 'حذف العلامة'; }
    store.set('bookmarks', bm);
  });
  $('btnNote').addEventListener('click', () => {
    const k = key(cur.s, cur.a), notes = store.get('notes', {});
    dialog('تدبري لسورة ' + surah(cur.s).name + ' الآية ' + arNum(cur.a), 'اكتب تدبرك الشخصي', notes[k] ? notes[k].t : '', (txt) => {
      const n = store.get('notes', {});
      if (txt.trim()) n[k] = { t: txt.trim(), d: today() }; else delete n[k];
      store.set('notes', n); announce('حُفظت الملاحظة');
    });
  });
  function cited() { return `${cur.data ? cur.data.text : ''} [سورة ${surah(cur.s).name}: ${cur.a}]`; }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; } ta.remove(); return ok;
    }
  }
  $('btnCopy').addEventListener('click', async () => {
    let t = cited(); const extra = $('tafsirOut').innerText.trim();
    if (extra) t += '\n\n' + extra;
    announce((await copyText(t)) ? 'نُسخ النص مع توثيقه' : 'تعذر النسخ');
  });
  async function share(t) {
    if (navigator.share) { try { await navigator.share({ text: t }); return; } catch (e) { return; } }
    announce((await copyText(t)) ? 'نُسخ النص، الصقه في واتساب أو تيليجرام' : 'تعذرت المشاركة');
  }
  $('btnShare').addEventListener('click', () => {
    const extra = $('tafsirOut').innerText.trim();
    share(cited() + (extra ? '\n\n' + extra.slice(0, 3000) : '') + '\n\nمن تطبيق المنة في التفسير بالسنة وثقات الأئمة');
  });

  function renderSaved() {
    const bm = store.get('bookmarks', []);
    $('bookmarkList').innerHTML = bm.length ? bm.map((b) =>
      `<li>سورة ${esc(surah(b.s).name)}، الآية ${arNum(b.a)} <button data-open="${b.k}">فتح</button></li>`).join('') : '<li>لا توجد علامات بعد.</li>';
    const notes = store.get('notes', {}), keys = Object.keys(notes);
    $('noteList').innerHTML = keys.length ? keys.map((k) => {
      const [s, a] = k.split(':');
      return `<li><strong>سورة ${esc(surah(+s).name)}، الآية ${arNum(a)} (تدبر شخصي):</strong> ${esc(notes[k].t)} <button data-open="${k}">فتح الآية</button></li>`;
    }).join('') : '<li>لم تكتب ملاحظات تدبر بعد.</li>';
  }
  document.getElementById('saved').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-open]'); if (!b) return;
    const [s, a] = b.dataset.open.split(':'); openAyah(+s, +a);
  });
  $('btnExportNotes').addEventListener('click', () => {
    const notes = store.get('notes', {});
    const t = Object.keys(notes).map((k) => { const [s, a] = k.split(':'); return `سورة ${surah(+s).name} — الآية ${a}:\n${notes[k].t}`; }).join('\n\n');
    if (!t) { announce('لا توجد ملاحظات'); return; }
    share('دفتر التدبر\n\n' + t);
  });
  function allData() {
    const out = {}; const pre = 'menna:' + profile() + ':';
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(pre)) out[k.slice(pre.length)] = JSON.parse(localStorage.getItem(k)); } } catch (e) { /* */ }
    return out;
  }
  $('btnBackup').addEventListener('click', async () => {
    const t = JSON.stringify({ menna: 1, profile: profile(), data: allData() });
    const ok = await copyText(t);
    $('savedOut').textContent = ok ? 'نُسخت النسخة الاحتياطية. الصقها في رسالة لنفسك أو ملف لتحفظها، واستعدها من زر «استعادة نسخة» على أي هاتف.' : 'تعذر النسخ.';
    if (navigator.share) share(t);
  });
  $('btnRestore').addEventListener('click', () => {
    dialog('استعادة نسخة احتياطية', 'الصق نص النسخة الاحتياطية هنا', '', (txt) => {
      try {
        const j = JSON.parse(txt); if (!j.menna || !j.data) throw 0;
        Object.keys(j.data).forEach((k) => store.set(k, j.data[k]));
        S = Object.assign({}, defaults, store.get('settings', {})); applySettings(); renderSaved();
        $('savedOut').textContent = 'تمت الاستعادة.'; announce('تمت الاستعادة');
      } catch (e) { $('savedOut').textContent = 'النص غير صالح، تأكد أنك لصقت النسخة كاملة.'; announce('النص غير صالح'); }
    });
  });

  /* ---------- نافذة الإدخال ---------- */
  let dlgCb = null, dlgReturn = null;
  function dialog(title, label, value, cb) {
    dlgReturn = document.activeElement; dlgCb = cb;
    $('dlgTitle').textContent = title; $('dlgLabel').textContent = label; $('dlgText').value = value || '';
    $('dialog').hidden = false; $('dlgText').focus();
  }
  function closeDlg() { $('dialog').hidden = true; if (dlgReturn) dlgReturn.focus(); }
  $('dlgOk').addEventListener('click', () => { const v = $('dlgText').value; closeDlg(); if (dlgCb) dlgCb(v); });
  $('dlgCancel').addEventListener('click', closeDlg);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('dialog').hidden) closeDlg(); });

  /* ---------- الانتقال السريع ---------- */
  $('jumpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('jumpInput').value.trim(); if (!q) return;
    try {
      let m;
      if ((m = q.match(/^(\d{1,3})\s*[:：\-\/ ]\s*(\d{1,3})$/))) return openAyah(+m[1], +m[2]);
      if ((m = q.match(/^(صفحه|صفحة|ص)\s*(\d{1,3})$/))) {
        const j = await getJSON(`${AC}/page/${m[2]}/quran-simple`); const f = j.data.ayahs[0];
        return openAyah(f.surah.number, f.numberInSurah);
      }
      if ((m = q.match(/^(جزء|الجزء)\s*(\d{1,2})$/))) {
        const j = await getJSON(`${AC}/juz/${m[2]}/quran-simple`); const f = j.data.ayahs[0];
        return openAyah(f.surah.number, f.numberInSurah);
      }
      m = q.match(/^(?:سوره|سورة)?\s*(.+?)\s*(\d{1,3})?$/);
      const name = norm(m[1]).replace(/^ال/, '');
      const sr = SURAHS.find((s) => s.plain.replace(/^ال/, '') === name) || SURAHS.find((s) => s.plain.includes(name));
      if (!sr) { announce('لم أتعرف على السورة'); return; }
      openAyah(sr.n, m[2] ? +m[2] : 1);
    } catch (err) { announce(err.message); }
  });
  $('btnContinue').addEventListener('click', () => { const l = store.get('last', { s: 1, a: 1 }); openAyah(l.s, l.a); });

  /* ---------- البحث في القرآن ---------- */
  let QURAN = null;
  async function quranIndex() {
    if (QURAN) return QURAN;
    const j = await getJSON(`${AC}/quran/quran-simple-clean`);
    QURAN = [];
    j.data.surahs.forEach((s) => s.ayahs.forEach((a) => {
      let t = a.text;
      if (s.number !== 1 && a.numberInSurah === 1) t = t.replace(/^بسم الله الرحمن الرحيم\s*/, '');
      QURAN.push({ s: s.number, a: a.numberInSurah, t, n: norm(t) });
    }));
    return QURAN;
  }
  $('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = norm($('searchInput').value); if (!q) return;
    const scope = $('searchScope').value, mode = $('searchMode').value;
    $('searchSummary').textContent = 'جارٍ البحث…';
    try {
      const idx = await quranIndex(); const words = q.split(' ');
      const hits = idx.filter((x) => {
        if (scope !== 'all' && surah(x.s).type !== scope) return false;
        if (mode === 'word') return (' ' + x.n + ' ').includes(' ' + q + ' ');
        if (mode === 'all') return words.every((w) => x.n.includes(w));
        return x.n.includes(q);
      });
      const sc = new Set(hits.map((h) => h.s)).size;
      $('searchSummary').textContent = hits.length
        ? `وُجدت ${arNum(hits.length)} آية في ${arNum(sc)} سورة${hits.length > 200 ? '، تُعرض أول ٢٠٠' : ''}.` : 'لم توجد نتائج.';
      $('searchResults').innerHTML = hits.slice(0, 200).map((h) =>
        `<li>سورة ${esc(surah(h.s).name)} ${arNum(h.a)}: ${esc(h.t)} <button data-k="${h.s}:${h.a}">فتح</button></li>`).join('');
      store.set('lastSearch', $('searchInput').value);
    } catch (err) { $('searchSummary').textContent = err.message; }
  });
  $('searchResults').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const [s, a] = b.dataset.k.split(':'); openAyah(+s, +a); });

  /* ---------- كتب السنة ---------- */
  $('hadithBook').innerHTML = M.hadithBooks.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
  const BOOKS = {};
  async function loadBook(id) {
    if (BOOKS[id]) return BOOKS[id];
    const j = await getJSON(`${HAD}/${id}.min.json`);
    BOOKS[id] = j.hadiths.filter((h) => h.text).map((h) => ({ num: h.hadithnumber, text: h.text, grades: h.grades || [], n: norm(h.text) }));
    return BOOKS[id];
  }
  function gradeText(book, h) {
    if (h.grades && h.grades.length) return h.grades.map((g) => `${g.grade} (${g.name})`).join('، ');
    if (book.sahih) return 'من أحاديث ' + book.name;
    return 'لم يُذكر الحكم عليه في هذه النسخة — غير محكوم عليه هنا';
  }
  function hadithLi(book, h) {
    return `<li><strong>${esc(book.name)} — حديث رقم ${arNum(h.num)}</strong><p>${esc(expand(h.text))}</p><p class="tag">الحكم: ${esc(gradeText(book, h))}</p><button data-copy="${book.id}|${h.num}">نسخ موثق</button></li>`;
  }
  $('hadithForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = norm($('hadithQuery').value); if (!q) return;
    const book = M.hadithBooks.find((b) => b.id === $('hadithBook').value);
    $('hadithSummary').textContent = 'جارٍ تحميل ' + book.name + ' والبحث فيه…';
    try {
      const list = await loadBook(book.id), words = q.split(' ');
      const hits = list.filter((h) => words.every((w) => h.n.includes(w)));
      $('hadithSummary').textContent = hits.length ? `وُجد ${arNum(hits.length)} حديثًا في ${book.name}${hits.length > 50 ? '، يُعرض أول ٥٠' : ''}.` : 'لم توجد نتائج.';
      $('hadithResults').innerHTML = hits.slice(0, 50).map((h) => hadithLi(book, h)).join('');
    } catch (err) { $('hadithSummary').textContent = err.message; }
  });
  $('btnHadithNum').addEventListener('click', async () => {
    const n = +$('hadithNum').value; if (!n) return;
    const book = M.hadithBooks.find((b) => b.id === $('hadithBook').value);
    $('hadithSummary').textContent = 'جارٍ التحميل…';
    try {
      const h = (await loadBook(book.id)).find((x) => +x.num === n);
      $('hadithSummary').textContent = h ? '' : 'لم يوجد حديث بهذا الرقم.';
      $('hadithResults').innerHTML = h ? hadithLi(book, h) : '';
    } catch (err) { $('hadithSummary').textContent = err.message; }
  });
  document.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-copy]'); if (!b) return;
    const [id, num] = b.dataset.copy.split('|'); const book = M.hadithBooks.find((x) => x.id === id);
    const h = BOOKS[id].find((x) => String(x.num) === num);
    announce((await copyText(`${expand(h.text)}\n[${book.name}، حديث رقم ${num}. الحكم: ${gradeText(book, h)}]`)) ? 'نُسخ الحديث مع تخريجه' : 'تعذر النسخ');
  });

  // الأحاديث التي ذكرت الآية في كتب السنة
  $('btnSunnahSearch').addEventListener('click', async () => {
    const out = $('tafsirOut');
    out.innerHTML = '<p>جارٍ البحث في الكتب السبعة عن الأحاديث التي ذكرت هذه الآية. أول مرة تحتاج تحميل الكتب، وقد تستغرق دقيقة.</p>';
    announce('جارٍ البحث في كتب السنة');
    try {
      const idx = await quranIndex();
      const x = idx.find((y) => y.s === cur.s && y.a === cur.a);
      const w = x.n.split(' ');
      const frag = w.slice(0, Math.min(w.length, w.length > 8 ? 5 : 4)).join(' ');
      let html = '', total = 0;
      for (const book of M.hadithBooks) {
        let list;
        try { list = await loadBook(book.id); } catch (err) { html += `<p>${esc(book.name)}: ${esc(err.message)}</p>`; continue; }
        const hits = list.filter((h) => h.n.includes(frag));
        total += hits.length;
        if (hits.length) html += `<h3>${esc(book.name)}: ${arNum(hits.length)}</h3><ol class="list">${hits.slice(0, 15).map((h) => hadithLi(book, h)).join('')}</ol>`;
      }
      out.innerHTML = `<h3 tabindex="-1">الأحاديث التي ذكرت الآية: ${arNum(total)}</h3><p class="note">بُحث بمطلع الآية: «${esc(frag)}». الصحيحان مقدّمان، وما في غيرهما يُنظر حكمه.</p>` + (html || '<p>لم توجد أحاديث تذكر نص هذه الآية في الكتب السبعة.</p>');
      out.querySelector('h3').focus(); tone('sahih');
    } catch (err) { out.innerHTML = `<p>${esc(err.message)}</p>`; }
  });

  /* ---------- الحفظ والمراجعة ---------- */
  let hifzStop = false, testCase = null;
  function playUrlOnce(url, maxMs) {
    return new Promise((resolve) => {
      playMode = 'hifz'; player.src = url; player.playbackRate = +S.speed;
      let t = null;
      const done = () => { player.removeEventListener('ended', done); if (t) clearTimeout(t); resolve(); };
      player.addEventListener('ended', done);
      if (maxMs) t = setTimeout(() => { player.pause(); done(); }, maxMs);
      player.play().catch(done);
    });
  }
  function hifzRange() {
    const s = +$('hifzSurah').value, c = surah(s).count;
    let f = Math.max(1, Math.min(c, +$('hifzFrom').value || 1)), t = Math.max(f, Math.min(c, +$('hifzTo').value || f));
    return { s, f, t };
  }
  $('btnHifzStart').addEventListener('click', async () => {
    const { s, f, t } = hifzRange(), rep = Math.max(1, +$('hifzRepeat').value || 1), cum = $('hifzCumulative').checked;
    hifzStop = false; const out = $('hifzOut');
    try {
      const urls = {};
      for (let a = f; a <= t && !hifzStop; a++) {
        const d = await fetchAyah(s, a); urls[a] = d.audio;
        for (let r = 1; r <= rep && !hifzStop; r++) {
          out.textContent = `الآية ${arNum(a)}، المرة ${arNum(r)} من ${arNum(rep)}: ${d.text}`;
          await playUrlOnce(d.audio);
        }
        if (cum && a > f && !hifzStop) {
          out.textContent = `تكرار تراكمي من الآية ${arNum(f)} إلى ${arNum(a)}`;
          for (let b = f; b <= a && !hifzStop; b++) await playUrlOnce(urls[b]);
        }
      }
      if (!hifzStop) { out.textContent = 'انتهى المقطع. جرّب «اختبار التسميع».'; announce('انتهى المقطع'); }
    } catch (e) { out.textContent = e.message; }
  });
  $('btnHifzStop').addEventListener('click', () => { hifzStop = true; player.pause(); $('hifzOut').textContent = 'توقف.'; });
  async function startTest(next) {
    const { s, f, t } = hifzRange(); if (next && t === f) { announce('اختر مقطعًا من آيتين على الأقل'); return; }
    const a = f + Math.floor(Math.random() * (t - f + (next ? 0 : 1)));
    try {
      const d = await fetchAyah(s, a);
      if (next) {
        const d2 = await fetchAyah(s, a + 1);
        testCase = { s, a: a + 1, audio: d2.audio, text: d2.text, range: `${s}:${f}-${t}` };
        $('hifzOut').textContent = 'استمع إلى الآية، ثم اقرأ الآية التي بعدها من حفظك.';
        await playUrlOnce(d.audio);
      } else {
        testCase = { s, a, audio: d.audio, text: d.text, range: `${s}:${f}-${t}` };
        $('hifzOut').textContent = 'استمع إلى أول الآية، ثم أكملها من حفظك.';
        await playUrlOnce(d.audio, 2800);
      }
      $('testButtons').hidden = false; $('btnReveal').focus();
    } catch (e) { $('hifzOut').textContent = e.message; }
  }
  $('btnHifzTest').addEventListener('click', () => startTest(false));
  $('btnHifzNextTest').addEventListener('click', () => startTest(true));
  $('btnReveal').addEventListener('click', async () => {
    if (!testCase) return; $('hifzOut').textContent = `الصواب — الآية ${arNum(testCase.a)}: ${testCase.text}`; await playUrlOnce(testCase.audio);
  });
  function grade(ok) {
    if (!testCase) return;
    const st = store.get('hifzStats', {}); const r = st[testCase.range] || { ok: 0, bad: 0 };
    ok ? r.ok++ : r.bad++; st[testCase.range] = r; store.set('hifzStats', st);
    const rv = store.get('review', []); const it = rv.find((x) => x.id === testCase.range);
    if (it) { const steps = [1, 3, 7, 14, 30, 60]; it.step = ok ? Math.min(steps.length - 1, (it.step || 0) + 1) : 0; it.due = dayIndex() + steps[it.step]; store.set('review', rv); }
    tone(ok ? 'ok' : 'bad'); $('testButtons').hidden = true;
    $('hifzOut').textContent = ok ? 'أحسنت، بارك الله فيك.' : 'لا بأس، كرر المقطع ثم أعد الاختبار.';
    announce($('hifzOut').textContent); renderReview();
  }
  $('btnRight').addEventListener('click', () => grade(true));
  $('btnWrong').addEventListener('click', () => grade(false));
  $('btnAddReview').addEventListener('click', () => {
    const { s, f, t } = hifzRange(), id = `${s}:${f}-${t}`, rv = store.get('review', []);
    if (!rv.some((x) => x.id === id)) rv.push({ id, s, f, t, step: 0, due: dayIndex() + 1 });
    store.set('review', rv); announce('أُضيف المقطع إلى جدول المراجعة'); renderReview();
  });
  function rangeName(x) { return `سورة ${surah(x.s).name} من الآية ${arNum(x.f)} إلى ${arNum(x.t)}`; }
  function renderReview() {
    const rv = store.get('review', []).sort((a, b) => a.due - b.due), d = dayIndex();
    $('reviewList').innerHTML = rv.length ? rv.map((x) =>
      `<li>${esc(rangeName(x))} — ${x.due <= d ? 'مستحق اليوم' : 'بعد ' + arNum(x.due - d) + ' يوم'} <button data-rv="${x.id}">راجع الآن</button></li>`).join('') : '<li>لا توجد مقاطع في جدول المراجعة.</li>';
    const due = rv.filter((x) => x.due <= d);
    $('homeReview').textContent = due.length ? `لديك اليوم ${arNum(due.length)} مقطع للمراجعة. افتح قسم الحفظ.` : 'لا مراجعة مستحقة اليوم.';
    const st = store.get('hifzStats', {}), strong = rv.filter((x) => (x.step || 0) >= 2);
    let ayat = 0; strong.forEach((x) => { ayat += x.t - x.f + 1; });
    const tests = Object.values(st).reduce((n, r) => n + r.ok + r.bad, 0);
    $('hifzStats').textContent = `مقاطع في المراجعة: ${arNum(rv.length)}، منها ${arNum(strong.length)} متقنة تضم ${arNum(ayat)} آية. عدد الاختبارات: ${arNum(tests)}.`;
  }
  $('reviewList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const x = store.get('review', []).find((y) => y.id === b.dataset.rv);
    $('hifzSurah').value = x.s; $('hifzFrom').value = x.f; $('hifzTo').value = x.t; startTest(false);
  });

  /* ---------- الورد والختمة وخطط التدبر ---------- */
  $('btnKhatma').addEventListener('click', () => {
    const days = Math.max(1, +$('khatmaDays').value || 30);
    store.set('khatma', { days, ppd: Math.ceil(604 / days), last: 0, start: today() }); renderWird(); announce('بدأت خطة الختمة');
  });
  function renderWird() {
    const k = store.get('khatma', null);
    $('wirdOut').textContent = k ? (k.last >= 604
      ? 'أتممت الختمة، تقبل الله منك. كان أنس بن مالك رضي الله عنه إذا ختم القرآن جمع أهله فدعا لهم (أثر موقوف رواه الدارمي).'
      : `خطة الختمة في ${arNum(k.days)} يومًا: ورد اليوم من الصفحة ${arNum(k.last + 1)} إلى ${arNum(Math.min(604, k.last + k.ppd))}. المقروء ${arNum(k.last)} صفحة من ٦٠٤.`) : 'لم تبدأ خطة ختمة بعد.';
    const ap = store.get('plan', null);
    $('tadabburPlans').innerHTML = M.plans.map((p, i) => {
      let st = '';
      if (ap && ap.i === i) st = ` — اليوم ${arNum(Math.min(p.days, dayIndex() - ap.start + 1))} من ${arNum(p.days)}`;
      return `<li>${esc(p.name)}${st} <button data-plan="${i}">${ap && ap.i === i ? 'افتح مقطع اليوم' : 'ابدأ الخطة'}</button></li>`;
    }).join('');
  }
  $('btnReadWird').addEventListener('click', async () => {
    const k = store.get('khatma', null); if (!k) { announce('ابدأ خطة الختمة أولًا'); return; }
    try { const j = await getJSON(`${AC}/page/${Math.min(604, k.last + 1)}/quran-simple`); const f = j.data.ayahs[0]; openAyah(f.surah.number, f.numberInSurah); } catch (e) { announce(e.message); }
  });
  $('btnWirdDone').addEventListener('click', () => {
    const k = store.get('khatma', null); if (!k) return; k.last = Math.min(604, k.last + k.ppd); store.set('khatma', k); renderWird(); announce($('wirdOut').textContent);
  });
  $('tadabburPlans').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const i = +b.dataset.plan, p = M.plans[i]; let ap = store.get('plan', null);
    if (!ap || ap.i !== i) { ap = { i, start: dayIndex() }; store.set('plan', ap); renderWird(); announce('بدأت ' + p.name); return; }
    // تقسيم المقطع على الأيام
    const flat = [];
    for (let s = p.from[0]; s <= p.to[0]; s++) {
      const a0 = s === p.from[0] ? p.from[1] : 1, a1 = s === p.to[0] ? p.to[1] : surah(s).count;
      for (let a = a0; a <= a1; a++) flat.push([s, a]);
    }
    const day = Math.min(p.days, dayIndex() - ap.start + 1), per = Math.ceil(flat.length / p.days);
    const start = flat[Math.min(flat.length - 1, (day - 1) * per)];
    $('tafsirType').value = 'qc:91';
    openAyah(start[0], start[1]).then(() => announce(`مقطع اليوم ${arNum(per)} آيات تقريبًا، ابدأ بالتدبر مع تفسير السعدي`));
  });
  $('btnPrayer').addEventListener('click', async () => {
    const city = $('prayerCity').value.trim(), country = $('prayerCountry').value.trim();
    store.set('prayerPlace', { city, country });
    $('prayerOut').textContent = 'جارٍ التحميل…';
    try {
      const j = await getJSON(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=5&date=${today().split('-').reverse().join('-')}`, false);
      const t = j.data.timings;
      $('prayerOut').textContent = `الفجر ${t.Fajr}، الشروق ${t.Sunrise}، الظهر ${t.Dhuhr}، العصر ${t.Asr}، المغرب ${t.Maghrib}، العشاء ${t.Isha}.`;
    } catch (e) { $('prayerOut').textContent = e.message; }
  });

  /* ---------- المصادر والمراجع ---------- */
  function renderBooks() {
    const src = M.sources;
    $('booksOut').innerHTML =
      '<h3>المصادر المتاحة في التطبيق الآن</h3><ol class="list">' + src.available.map((b) => `<li>${esc(b)}</li>`).join('') + '</ol>' +
      '<h3>مكتبة التدبر — عشرون كتابًا</h3><p class="note">هذه الكتب مدرجة في خطة التطبيق. يُضاف نص كل كتاب عند توفر نسخة رقمية مسموح بنشرها، ويصلك عبر التحديث. المتاح الآن للتدبر: تفسير السعدي وتفاسير ابن كثير والطبري والقرطبي.</p>' +
      src.tadabbur.map(([g, list]) => `<h4>${esc(g)}</h4><ol class="list">${list.map((b) => `<li>${esc(b)}</li>`).join('')}</ol>`).join('');
  }

  /* ---------- آية اليوم ---------- */
  async function loadDaily() {
    if (!S.daily) { $('dailyAyah').textContent = 'آية اليوم متوقفة من الإعدادات.'; return; }
    const k = M.dailyAyat[dayIndex() % M.dailyAyat.length]; const [s, a] = k.split(':').map(Number);
    try {
      const d = await fetchAyah(s, a, false);
      let tf = '';
      try { tf = (await tafsirParas('qc:91', s, a)).join(' '); } catch (e) { tf = ''; }
      $('dailyAyah').innerHTML = `<p class="ayah">${esc(d.text)}</p><p class="tag">سورة ${esc(surah(s).name)}، الآية ${arNum(a)}</p>` +
        (tf ? `<p><strong>وقفة تدبر من تفسير السعدي:</strong> ${esc(expand(tf.slice(0, 700)))}${tf.length > 700 ? '…' : ''}</p>` : '') +
        `<button id="btnDailyOpen">فتح الآية</button>`;
      $('btnDailyOpen').addEventListener('click', () => openAyah(s, a));
    } catch (e) { $('dailyAyah').textContent = e.message; }
  }

  /* ---------- الإعدادات والمستخدمون ---------- */
  function applySettings() {
    const r = document.documentElement;
    r.style.setProperty('--fs', S.font); r.dataset.theme = S.theme;
    $('setReciter').value = S.reciter; $('setRasm').value = S.rasm; $('setSpeed').value = S.speed; $('setRepeat').value = S.repeat;
    $('setAutoNext').checked = S.autoNext; $('setAutoTafsir').checked = S.autoTafsir; $('setSleep').value = S.sleep;
    $('setLevel').value = S.level; $('setFont').value = S.font; $('setTheme').value = S.theme; $('setTones').checked = S.tones; $('setDaily').checked = S.daily;
    $('setProfile').innerHTML = global.profiles.map((p) => `<option ${p === global.current ? 'selected' : ''}>${esc(p)}</option>`).join('');
    const pp = store.get('prayerPlace', null); if (pp) { $('prayerCity').value = pp.city; $('prayerCountry').value = pp.country; }
  }
  $('btnSaveSettings').addEventListener('click', () => {
    S = { reciter: $('setReciter').value, rasm: $('setRasm').value, speed: $('setSpeed').value, repeat: Math.max(1, +$('setRepeat').value || 1),
      autoNext: $('setAutoNext').checked, autoTafsir: $('setAutoTafsir').checked, sleep: Math.max(0, +$('setSleep').value || 0), level: $('setLevel').value,
      font: $('setFont').value, theme: $('setTheme').value, tones: $('setTones').checked, daily: $('setDaily').checked };
    store.set('settings', S); applySettings(); $('settingsOut').textContent = 'حُفظت الإعدادات.'; announce('حُفظت الإعدادات');
  });
  $('setProfile').addEventListener('change', () => {
    global.current = $('setProfile').value; saveGlobal();
    S = Object.assign({}, defaults, store.get('settings', {})); applySettings(); renderReview(); loadDaily(); announce('المستخدم الحالي: ' + global.current);
  });
  $('btnNewProfile').addEventListener('click', () => dialog('مستخدم جديد', 'اسم المستخدم', '', (n) => {
    n = n.trim(); if (!n || global.profiles.includes(n)) return;
    global.profiles.push(n); global.current = n; saveGlobal(); S = Object.assign({}, defaults); applySettings(); announce('أُضيف المستخدم ' + n);
  }));
  $('btnClearCache').addEventListener('click', async () => {
    try { await caches.delete('menna-v1'); } catch (e) { /* */ }
    Object.keys(BOOKS).forEach((k) => delete BOOKS[k]); QURAN = null;
    $('settingsOut').textContent = 'حُذفت الكتب والتلاوات المحفوظة. ملاحظاتك وعلاماتك باقية.';
  });
  $('btnTour').addEventListener('click', tour);
  function tour() {
    $('settingsOut').innerHTML = '<h3 tabindex="-1">جولة تعريفية</h3><ol class="list">' + [
      'في أعلى الشاشة قائمة الأقسام: الرئيسية، السور، البحث، كتب السنة، الحفظ، الورد، العلامات، المصادر، الإعدادات.',
      'في الرئيسية خانة «انتقال سريع»: اكتب «البقرة 255» أو «2:255» أو «صفحة 300» أو «جزء 30».',
      'في شاشة الآية: زر الاستماع، والسابقة والتالية، ثم «نوع التفسير». أول خيار هو التفسير بالسنة.',
      'زر «الأحاديث التي ذكرت الآية» يبحث في البخاري ومسلم والسنن والموطأ عن كل حديث ذكر نص الآية.',
      'كل حديث معه حكمه أو تنبيه بأنه غير محكوم عليه، وكل نص معه مصدره.',
      'في قسم الحفظ: اختر السورة والآيات، ثم «ابدأ الحفظ» للتكرار، ثم «اختبار التسميع».',
      'زر «ملاحظة تدبر» يحفظ تدبرك الشخصي منفصلًا عن كلام العلماء.',
      'نغمات قصيرة تميز الآية والحديث والأثر وموضع السجدة، ويمكن إيقافها من الإعدادات.'
    ].map((x) => `<li>${esc(x)}</li>`).join('') + '</ol>';
    $('settingsOut').querySelector('h3').focus();
  }

  /* ---------- التشغيل ---------- */
  applySettings();
  loadSurahs().then(() => { renderReview(); loadDaily(); }).catch((e) => {
    $('dailyAyah').textContent = e.message + ' افتح التطبيق مع الإنترنت أول مرة.';
  });
  if (!store.raw('menna:toured')) { store.raw('menna:toured', true); setTimeout(() => announce('مرحبًا بك في تطبيق المنة. للجولة التعريفية افتح الإعدادات ثم «جولة تعريفية».'), 1200); }
  show('home');
})();
