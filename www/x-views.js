'use strict';
/* المنة للأندرويد — الأقسام الجديدة: الرئيسية، الفهرس، القراءة المتصلة، الحفظ، الورد والختمة، الملاحظات والعلامات، الأدوات، الميزات، المساعدة. */
const QURAN_SHA = '0e70ca504bc5572e1ed9b647747d04eddc63b048fc7e34054cd1f242b63133e2';
const REVIEW_STEPS = [1, 3, 7, 14, 30, 60, 120];
const DHIKR = ['سبحان الله', 'الحمد لله', 'الله أكبر', 'لا إله إلا الله', 'أستغفر الله', 'اللهم صل وسلم على نبينا محمد', 'سبحان الله وبحمده، سبحان الله العظيم', 'لا حول ولا قوة إلا بالله'];
const RTITLE = (s, a, b) => `سورة ${surah(s).name}، ${a === b ? 'الآية ' + ar(a) : `من الآية ${ar(a)} إلى ${ar(b)}`}`;
const gref = (g) => { const [s, a] = fromGlobal(g); return ref(s, a); };
function hijri(d = new Date(), opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', opts).format(d); } catch { return ''; }
}
function hijriParts(d) {
  try {
    const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const g = (t) => +p.find((x) => x.type === t).value;
    return { d: g('day'), m: g('month'), y: g('year') };
  } catch { return null; }
}
function minutesToday() { return Math.round(((st().minutes || {})[today()] || 0)); }

// ================================================================== الرئيسية (1، 2، 3، 6، 52، 53)
VIEWS.home = async function () {
  const o = st(), s = o.surah, a = o.ayah;
  const g = (dayNumber() * 7919) % TOTAL + 1; const [ds, da] = fromGlobal(g);
  const T = await tadData(ds); const tad = (T[String(da)] || [])[0];
  const bk = await hadithBook('bukhari'); const hd = bk.hadiths[(dayNumber() * 104729) % bk.hadiths.length];
  const due = dueReviews().length;
  const kh = (o.khatmas || []).filter((k) => !k.finished);
  $main.innerHTML = `<h2>الرئيسية</h2>
    <p class="summary">${esc(hijri())} — ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p><button type="button" class="primary big" data-x="continue">متابعة القراءة: ${esc(ref(s, a))}</button></p>
    <form data-xf="jump" class="x-jump"><label for="x-jump">انتقال سريع: اكتب السورة والآية، مثل ٢:٢٥٥ أو البقرة ٢٥٥ أو اسم سورة</label>
      <input id="x-jump" type="text" autocomplete="off" enterkeyhint="go"> <button type="submit">انتقال</button></form>
    <p><label for="x-juz">الانتقال إلى جزء</label> <select id="x-juz" data-xc="juz"><option value="">اختر الجزء</option>${JUZ.map(([js, ja], i) => `<option value="${i + 1}">الجزء ${ar(i + 1)}: ${esc(ref(js, ja))}</option>`).join('')}</select>
      <button type="button" data-x="random">آية عشوائية</button></p>
    <h2>إنجازك</h2><ul>
      <li>سلسلة الأيام المتتالية: ${ar(streak())} يومًا.</li>
      <li>المحفوظ: ${ar(memoTotal())} آية من ${ar(TOTAL)} (${ar((memoTotal() / TOTAL * 100).toFixed(1))}٪)، وحفظت اليوم ${ar((o.memoLog || {})[today()] || 0)} من هدفك ${ar(o.dailyGoal || 5)}.</li>
      <li>وقت القراءة اليوم: ${ar(minutesToday())} دقيقة.</li>
      <li>${due ? `<button type="button" data-view-go="hifz" data-then="review">عندك ${ar(due)} مقطع للمراجعة اليوم</button>` : 'لا مراجعة مستحقة اليوم.'}</li>
      ${kh.map((k) => `<li>${esc(k.name)}: اليوم ${ar(Math.min(k.days, daysBetween(k.start, today()) + 1))} من ${ar(k.days)}، أنجزت ${ar(k.done.length)} وردًا. <button type="button" data-x="wird-open" data-id="${k.id}">ورد اليوم</button></li>`).join('')}
    </ul>
    <h2>آية اليوم</h2><div class="ayah-box"><p class="ayah-text x-ayah">﴿${esc(ayahText(ds, da))}﴾</p><p class="ayah-ref">${esc(ref(ds, da))}</p></div>
    ${tad ? `<p class="matn">${esc(tad.t.slice(0, 700))}${tad.t.length > 700 ? '…' : ''}</p><p class="src">${tad.src === 'tadabbur' ? 'من «تدبر وعمل»' : 'من ' + esc(SRC_NAME(tad.src))}</p>` : ''}
    <button type="button" data-x="goto" data-s="${ds}" data-a="${da}">افتح الآية وتفسيرها</button>
    <h2>حديث اليوم</h2><p class="matn">${esc(hd.t.length > 900 ? hd.t.slice(0, 900) + '…' : hd.t)}</p>
    <p class="src">صحيح البخاري، ${esc(hd.k || '')}، رقم ${ar(hd.n)}</p><button type="button" data-act="open-hadith" data-id="${esc(hd.id)}">افتح الحديث في صحيح البخاري</button>`;
};
function parseJump(q) {
  q = q.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
  let m = q.match(/^(\d{1,3})\s*[:/.\-\s]\s*(\d{1,3})$/);
  if (m) return [+m[1], +m[2]];
  if (/^\d{1,3}$/.test(q)) return [+q, 1];
  m = q.match(/^(.*?)\s*(\d{1,3})?$/);
  const name = norm(m[1]).replace(/^سوره /, '').replace(/^ال/, '');
  if (!name) return null;
  const hit = S.meta.surahs.find((x) => norm(x.name).replace(/^ال/, '') === name) || S.meta.surahs.find((x) => norm(x.name).replace(/^ال/, '').startsWith(name));
  return hit ? [hit.n, m[2] ? +m[2] : 1] : null;
}

// ================================================================== فهرس السور (4، 5، 34)
VIEWS.index = async function () {
  const o = st();
  $main.innerHTML = `<h2>فهرس السور</h2>
    <p><label for="x-filter">ابحث باسم السورة أو رقمها</label> <input id="x-filter" type="search" data-xc="sfilter" autocomplete="off">
    <label for="x-type">النوع</label> <select id="x-type" data-xc="sfilter"><option value="">الكل</option><option>مكية</option><option>مدنية</option></select></p>
    <p class="src">المحفوظ في القرآن كله ${ar(memoTotal())} آية. السورة التي فيها علامة «آخر موضع» تفتح حيث توقفت.</p>
    <ul class="x-index" id="x-list"></ul>`;
  renderIndex();
};
function renderIndex() {
  const q = norm(($('x-filter') || {}).value || ''), ty = ($('x-type') || {}).value || '';
  const qd = q.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const list = S.meta.surahs.filter((x) => (!ty || x.type === ty) && (!q || norm(x.name).includes(q) || String(x.n) === qd));
  const last = st().lastIn || {};
  $('x-list').innerHTML = list.map((x) => {
    const m = memoCount(x.n);
    return `<li><button type="button" data-x="goto" data-s="${x.n}" data-a="${last[x.n] || 1}">${ar(x.n)}. سورة ${esc(x.name)}، ${x.type}، ${ar(x.ayahs)} آية${m ? `، محفوظ ${ar(m)} (${ar(Math.round(m / x.ayahs * 100))}٪)` : ''}${last[x.n] > 1 ? `، آخر موضع الآية ${ar(last[x.n])}` : ''}</button>
      <button type="button" data-x="read-surah" data-s="${x.n}">قراءة متصلة</button></li>`;
  }).join('') || '<li>لا توجد سورة بهذا الاسم.</li>';
  announce(`${list.length} سورة`);
}

// ================================================================== القراءة المتصلة (11، 18، 49)
VIEWS.mushaf = async function () {
  const o = st(), s = o.surah, rng = S.xRange && S.xRange.s === s ? S.xRange : null;
  const from = rng ? rng.from : 1, to = rng ? rng.to : surah(s).ayahs;
  let h = `<div class="nav-ayah"><label for="x-ms">السورة</label> <select id="x-ms" data-xc="msurah">${surahOptions(s)}</select>
    <button type="button" data-x="ms-play">تلاوة ${rng ? 'الورد' : 'السورة'} كاملة</button> <button type="button" data-x="ms-save-audio">حفظ تلاوة السورة للعمل بلا إنترنت</button></div>
    <h2>${rng ? esc(rng.title) : `سورة ${esc(surah(s).name)}`}</h2><p class="src">${surah(s).type}، ${ar(surah(s).ayahs)} آية. كل آية سطر مستقل يبدأ برقمها، واضغط على الآية لفتح تفسيرها.</p>
    <form data-xf="insurah"><label for="x-insurah">البحث في هذه السورة</label> <input id="x-insurah" type="search"> <button type="submit">بحث</button></form><div id="x-insurah-r" aria-live="polite"></div>
    <div class="x-mushaf">`;
  for (let a = from; a <= to; a++) {
    if (s !== 1 && s !== 9 && a === 1) h += '<p class="x-basmala">بسم الله الرحمن الرحيم</p>';
    h += `<p id="ms-${a}"><button type="button" class="x-ayah-btn" data-x="goto" data-s="${s}" data-a="${a}"><span class="x-num">${ar(a)}.</span> <span class="x-ayah">${esc(ayahText(s, a))}</span>${SAJDA.includes(s + ':' + a) ? ' <span class="src">(سجدة)</span>' : ''}</button></p>`;
  }
  h += '</div>';
  if (rng && rng.kid) h += `<p><button type="button" class="primary" data-x="wird-done" data-id="${rng.kid}" data-day="${rng.day}">أتممت هذا الورد</button></p>`;
  if (rng && rng.next) h += `<p><button type="button" data-x="wird-next">أكمل الورد في سورة ${esc(surah(rng.next.s).name)}</button></p>`;
  $main.innerHTML = h;
};

// ================================================================== الحفظ والمراجعة (33–46)
function dueReviews() { const r = st().review || {}; return Object.entries(r).filter(([, v]) => v.due <= today()).map(([k, v]) => ({ k, ...v })); }
function rangeOf(k) { const [s, ab] = k.split(':'); const [f, t] = ab.split('-').map(Number); return { s: +s, from: f, to: t || f }; }
VIEWS.hifz = async function () {
  const o = st(), H2 = o.hifz || { s: o.surah, from: 1, to: Math.min(5, surah(o.surah).ayahs), mode: 'hide' };
  o.hifz = H2;
  const due = dueReviews();
  const goal = o.dailyGoal || 5, todayN = (o.memoLog || {})[today()] || 0;
  $main.innerHTML = `<h2>الحفظ والمراجعة</h2>
    <p class="summary">محفوظك ${ar(memoTotal())} آية. حفظت اليوم ${ar(todayN)} من هدفك ${ar(goal)} آيات${todayN >= goal ? '، أحسنت فقد بلغت هدفك' : ''}. سلسلة الأيام ${ar(streak())}.</p>
    <h2>المقطع</h2>
    <p><label for="x-hs">السورة</label> <select id="x-hs" data-xc="hs">${surahOptions(H2.s)}</select></p>
    <p><label for="x-hf">من الآية</label> <input id="x-hf" type="number" inputmode="numeric" min="1" value="${H2.from}">
       <label for="x-ht">إلى الآية</label> <input id="x-ht" type="number" inputmode="numeric" min="1" value="${H2.to}"></p>
    <h2>الاستماع والتكرار</h2>
    <p><label for="x-hr">تكرار كل آية</label> <input id="x-hr" type="number" inputmode="numeric" min="1" max="50" value="${o.repeat || 3}">
       <label for="x-hrr">تكرار المقطع</label> <input id="x-hrr" type="number" inputmode="numeric" min="1" max="50" value="${o.rangeRepeat || 1}"></p>
    <p><label><input type="checkbox" id="x-hcum"${o.cumulative ? ' checked' : ''}> تكرار تراكمي: الآية الأولى، ثم الأولى والثانية، وهكذا</label></p>
    <p><label for="x-hgap">مهلة بعد كل آية لترددها خلف القارئ</label> <select id="x-hgap" data-xc="gap">
      ${[['0', 'بلا مهلة'], ['auto', 'بقدر طول الآية'], ['2', 'ثانيتان'], ['4', '٤ ثوانٍ'], ['8', '٨ ثوانٍ']].map(([v, l]) => `<option value="${v}"${(o.gapAuto ? 'auto' : String(o.gap || 0)) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></p>
    <p><button type="button" class="primary" data-x="h-listen">ابدأ الاستماع للحفظ</button> <button type="button" data-x="h-stop">إيقاف</button></p>
    <h2>اختبار الحفظ</h2>
    <p><label for="x-hm">طريقة الاختبار</label> <select id="x-hm" data-xc="hmode">
      ${[['hide', 'إخفاء الآيات وإظهار كل آية عند الطلب'], ['letters', 'أول حرف من كل كلمة'], ['first', 'أول كلمة من كل آية'], ['type', 'التسميع بالكتابة'], ['next', 'اختبار الآية التالية'], ['which', 'في أي سورة هذه الآية؟'], ['makki', 'السورة مكية أم مدنية؟']]
        .map(([v, l]) => `<option value="${v}"${H2.mode === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="primary" data-x="h-test">ابدأ الاختبار</button></p>
    <div id="x-test" aria-live="polite"></div>
    <h2 id="x-rev-h">المراجعة المتباعدة (${ar(due.length)} مستحقة اليوم)</h2>
    <p class="src">أضف المقطع بعد حفظه، فيذكّرك التطبيق بمراجعته بعد يوم ثم ٣ ثم ٧ ثم ١٤ ثم ٣٠ يومًا، وكلما أخطأت أعاده من البداية.</p>
    <p><button type="button" data-x="h-add-review">أضف المقطع الحالي إلى المراجعة</button> <button type="button" data-x="h-mark-range">سجّل آيات المقطع كلها محفوظة</button></p>
    <ul class="plain" id="x-rev">${due.map((r) => { const g = rangeOf(r.k); return `<li>${esc(RTITLE(g.s, g.from, g.to))}
      <button type="button" data-x="rv-open" data-k="${r.k}">راجعه</button> <button type="button" data-x="rv-ok" data-k="${r.k}">أتقنته</button> <button type="button" data-x="rv-bad" data-k="${r.k}">أخطأت فيه</button></li>`; }).join('') || '<li>لا مراجعة مستحقة اليوم.</li>'}</ul>
    <h2>هدفك ونتائجك</h2>
    <p><label for="x-goal">الهدف اليومي (آيات)</label> <input id="x-goal" type="number" inputmode="numeric" min="1" max="300" value="${goal}" data-xc="goal"></p>
    <p>${(o.quizLog || []).length ? `آخر نتائج الاختبارات: ${(o.quizLog || []).slice(-5).reverse().map((q) => `${esc(q.kind)} ${ar(q.right)} من ${ar(q.total)} (${esc(q.at)})`).join('؛ ')}` : 'لم تختبر نفسك بعد.'}</p>
    <p><button type="button" data-x="h-export">تصدير سجل الحفظ في ملف</button></p>
    <h3>المحفوظ في كل سورة</h3><ul class="plain">${S.meta.surahs.filter((x) => memoCount(x.n)).map((x) => `<li>${esc(x.name)}: ${ar(memoCount(x.n))} من ${ar(x.ayahs)}</li>`).join('') || '<li>لم تسجّل شيئًا محفوظًا بعد. استعمل زر «تحديد كمحفوظة» تحت الآية، أو زر تسجيل المقطع هنا.</li>'}</ul>`;
};
function readRange() {
  const o = st(), s = +$('x-hs').value, n = surah(s).ayahs;
  const f = Math.min(n, Math.max(1, +$('x-hf').value || 1)), t = Math.min(n, Math.max(f, +$('x-ht').value || f));
  o.hifz = { ...o.hifz, s, from: f, to: t, mode: ($('x-hm') || {}).value || o.hifz.mode };
  o.repeat = Math.max(1, +$('x-hr').value || 1); o.rangeRepeat = Math.max(1, +$('x-hrr').value || 1); o.cumulative = $('x-hcum').checked;
  xsave(); return o.hifz;
}
let cumStep = 0;
async function hifzListen() {
  const r = readRange(), o = st();
  if (o.cumulative) { cumStep = r.from; playCumulative(); return; }
  playRange(r.s, r.from, r.to, o.rangeRepeat);
  announce(`الاستماع للحفظ: ${RTITLE(r.s, r.from, r.to)}، تكرار كل آية ${o.repeat}`);
}
function playCumulative() {   // الأولى، ثم الأولى والثانية …
  const r = st().hifz;
  if (cumStep > r.to) { done('انتهى التكرار التراكمي'); return; }
  playRange(r.s, r.from, cumStep, 1);
  let started = false;
  const wait = setInterval(() => { if (S.playing) { started = true; return; } if (!started) return; { clearInterval(wait); if (R.stopped) return; cumStep++; if (cumStep <= r.to) setTimeout(playCumulative, 600); else done('انتهى التكرار التراكمي'); } }, 500);
}
const T = { list: [], i: 0, right: 0, kind: '' };
function testItem() { return T.list[T.i]; }
function finishQuiz() {
  const o = st();
  o.quizLog = (o.quizLog || []).concat([{ kind: T.kind, right: T.right, total: T.list.length, at: today() }]).slice(-50); markActivity(); xsave();
  $('x-test').innerHTML = `<h3 tabindex="-1">انتهى الاختبار</h3><p>نتيجتك ${ar(T.right)} من ${ar(T.list.length)}.</p><button type="button" data-x="h-test">اختبار جديد</button>`;
  $('x-test').querySelector('h3').focus(); tone(T.right === T.list.length ? 'mark' : 'ok');
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function startTest() {
  const r = readRange(); const mode = r.mode; T.i = 0; T.right = 0;
  const ay = []; for (let a = r.from; a <= r.to; a++) ay.push(a);
  if (['hide', 'letters', 'first'].includes(mode)) {
    T.kind = 'إخفاء';
    $('x-test').innerHTML = `<h3 tabindex="-1">${esc(RTITLE(r.s, r.from, r.to))}</h3><p class="src">اقرأ الآية من حفظك، ثم اضغط عليها لتظهر وتتحقق.</p><ol class="x-test">${ay.map((a) => {
      const ws = words(r.s, a); const hint = mode === 'letters' ? ws.map((w) => [...w].find((c) => LETTERS[c]) || '').join(' ') : mode === 'first' ? ws[0] + ' …' : 'الآية ' + ar(a) + ' مخفية';
      return `<li><button type="button" data-x="reveal" data-s="${r.s}" data-a="${a}" aria-expanded="false"><span class="x-ayah">${esc(hint)}</span></button></li>`;
    }).join('')}</ol><p><button type="button" data-x="h-mark-range">حفظتها كلها: سجّلها محفوظة</button> <button type="button" data-x="h-add-review">أضفها إلى المراجعة</button></p>`;
  } else if (mode === 'type') {
    T.kind = 'تسميع بالكتابة'; T.list = ay.map((a) => [r.s, a]); renderType();
    return;
  } else if (mode === 'next') {
    T.kind = 'الآية التالية'; T.list = shuffle(ay.filter((a) => a < surah(r.s).ayahs).map((a) => [r.s, a])).slice(0, 10); renderChoice();
    return;
  } else if (mode === 'which') {
    T.kind = 'في أي سورة'; const pool = memoTotal() > 10 ? Object.entries(st().memo).flatMap(([s, l]) => l.map((a) => [+s, a])) : Array.from({ length: 200 }, () => fromGlobal(1 + Math.floor(Math.random() * TOTAL)));
    T.list = shuffle(pool).slice(0, 10); renderChoice(); return;
  } else if (mode === 'makki') {
    T.kind = 'مكي ومدني'; T.list = shuffle(S.meta.surahs.slice()).slice(0, 10).map((x) => [x.n, 0]); renderChoice(); return;
  }
  const h = $('x-test').querySelector('h3'); h.focus();
}
function renderType() {
  const [s, a] = testItem();
  $('x-test').innerHTML = `<h3 tabindex="-1">التسميع بالكتابة: ${esc(ref(s, a))} (${ar(T.i + 1)} من ${ar(T.list.length)})</h3>
    ${a > 1 ? `<p class="src">الآية السابقة: ﴿${esc(ayahText(s, a - 1))}﴾</p>` : ''}
    <p><label for="x-typed">اكتب الآية من حفظك، والتشكيل غير مطلوب</label><br><textarea id="x-typed" rows="4"></textarea></p>
    <button type="button" class="primary" data-x="typed-check">تحقق</button> <button type="button" data-x="typed-skip">تخطَّ</button><div id="x-typed-r" aria-live="assertive"></div>`;
  $('x-test').querySelector('h3').focus();
}
function renderChoice() {
  if (T.i >= T.list.length) { finishQuiz(); return; }
  const [s, a] = testItem(); let q, opts, right;
  if (T.kind === 'الآية التالية') {
    q = `ما الآية التي بعد قوله تعالى: ﴿${ayahText(s, a)}﴾؟`;
    right = words(s, a + 1).slice(0, 5).join(' ') + ' …';
    const others = shuffle(Array.from({ length: surah(s).ayahs }, (_, i) => i + 1).filter((x) => x !== a + 1)).slice(0, 3).map((x) => words(s, x).slice(0, 5).join(' ') + ' …');
    opts = shuffle([right, ...others.filter((x) => x !== right)]);
  } else if (T.kind === 'في أي سورة') {
    q = `في أي سورة قوله تعالى: ﴿${ayahText(s, a)}﴾؟`; right = surah(s).name;
    opts = shuffle([right, ...shuffle(S.meta.surahs.filter((x) => x.n !== s)).slice(0, 3).map((x) => x.name)]);
  } else { q = `سورة ${surah(s).name}: مكية أم مدنية؟`; right = surah(s).type; opts = ['مكية', 'مدنية']; }
  T.right_ = right;
  $('x-test').innerHTML = `<h3 tabindex="-1">السؤال ${ar(T.i + 1)} من ${ar(T.list.length)}</h3><p class="x-ayah">${esc(q)}</p>
    <ul class="plain">${opts.map((x, i) => `<li><button type="button" data-x="choice" data-i="${i}">${esc(x)}</button></li>`).join('')}</ul><div id="x-choice-r" aria-live="assertive"></div>`;
  T.opts = opts; $('x-test').querySelector('h3').focus();
}
function addReview(k) { const o = st(); o.review = o.review || {}; o.review[k] = { step: 0, due: addDays(today(), REVIEW_STEPS[0]) }; }

// ================================================================== الورد والختمة والتدبر (47–51)
function portion(k, day) {   // day: 0-based
  const n = k.toG - k.fromG + 1;
  return [k.fromG + Math.floor(day * n / k.days), k.fromG + Math.floor((day + 1) * n / k.days) - 1];
}
VIEWS.wird = async function () {
  const o = st(); const ks = o.khatmas || [];
  $main.innerHTML = `<h2>الورد والختمة وخطط التدبر</h2>
    ${ks.map((k) => {
      const day = Math.min(k.days - 1, Math.max(0, daysBetween(k.start, today())));
      const [g1, g2] = portion(k, day);
      const pct = Math.round(k.done.length / k.days * 100);
      return `<section class="item" aria-labelledby="kh-${k.id}"><h3 id="kh-${k.id}">${esc(k.name)}${k.finished ? ' (تمت بحمد الله)' : ''}</h3>
        <p>${k.kind === 'tadabbur' ? 'خطة تدبر' : 'ختمة'} في ${ar(k.days)} يومًا، بدأت ${esc(k.start)}. أنجزت ${ar(k.done.length)} وردًا (${ar(pct)}٪).</p>
        <p>ورد اليوم (${ar(day + 1)}): من ${esc(gref(g1))} إلى ${esc(gref(g2))}، ${ar(g2 - g1 + 1)} آية${k.done.includes(day) ? '، وقد أتممته' : ''}.</p>
        <button type="button" class="primary" data-x="wird-open" data-id="${k.id}">${k.kind === 'tadabbur' ? 'ابدأ تدبر ورد اليوم' : 'اقرأ ورد اليوم'}</button>
        <button type="button" data-x="wird-done" data-id="${k.id}" data-day="${day}">أتممت ورد اليوم</button>
        <button type="button" data-x="kh-del" data-id="${k.id}">حذف</button></section>`;
    }).join('') || '<p>لا توجد ختمة ولا خطة بعد.</p>'}
    <h2>ختمة أو خطة جديدة</h2>
    <p><label for="x-kn">الاسم</label> <input id="x-kn" value="${ks.length ? 'ختمة ' + ar(ks.length + 1) : 'ختمتي'}"></p>
    <p><label for="x-kk">النوع</label> <select id="x-kk"><option value="read">ختمة قراءة</option><option value="tadabbur">خطة تدبر (يفتح الورد على التدبر)</option></select></p>
    <p><label for="x-kf">من سورة</label> <select id="x-kf">${surahOptions(1)}</select> <label for="x-kt">إلى سورة</label> <select id="x-kt">${surahOptions(114)}</select></p>
    <p><label for="x-kd">عدد الأيام</label> <select id="x-kd">${[7, 10, 15, 20, 30, 40, 60, 90, 120, 180, 365].map((d) => `<option${d === 30 ? ' selected' : ''}>${d}</option>`).join('')}</select>
      <button type="button" class="primary" data-x="kh-new">إنشاء</button></p>
    <p class="src">مثال لخطة تدبر: من سورة النبأ إلى سورة الناس في ٣٠ يومًا.</p>
    <h2>التذكير اليومي</h2>
    <p><label for="x-rem">وقت التذكير بالورد</label> <input id="x-rem" type="time" value="${esc(o.reminder || '')}"> <button type="button" data-x="rem-set">تفعيل التذكير</button>
      ${o.reminder ? '<button type="button" data-x="rem-off">إيقاف التذكير</button>' : ''}</p>`;
};
async function openWird(id) {
  const k = (st().khatmas || []).find((x) => x.id === id); if (!k) return;
  const day = Math.min(k.days - 1, Math.max(0, daysBetween(k.start, today())));
  const [g1, g2] = portion(k, day); const [s1, a1] = fromGlobal(g1); const [s2, a2] = fromGlobal(g2);
  if (k.kind === 'tadabbur') { S.settings.ttype = 'tadabbur'; await go('ayah'); await setAyah(s1, a1); say(`ورد التدبر من ${ref(s1, a1)} إلى ${ref(s2, a2)}. انتقل بالآية التالية حتى تبلغ آخره.`); return; }
  st().surah = s1; st().ayah = a1;
  S.xRange = { s: s1, from: a1, to: s1 === s2 ? a2 : surah(s1).ayahs, title: `ورد اليوم ${day + 1} من ${k.name}`, kid: id, day, next: s1 === s2 ? null : { s: s1 + 1, endS: s2, endA: a2 } };
  await go('mushaf');
}
async function scheduleReminder(hhmm) {
  const LN = XP.LocalNotifications;
  if (!LN) { done('التذكير يعمل في تطبيق الهاتف فقط', 'err'); return false; }
  try {
    const p = await LN.requestPermissions(); if (p.display !== 'granted') { done('لم يُسمح بالإشعارات. اسمح بها من إعدادات الهاتف ثم أعد المحاولة.', 'err'); return false; }
    await LN.cancel({ notifications: [{ id: 7001 }] }).catch(() => {});
    if (!hhmm) return true;
    const [h, m] = hhmm.split(':').map(Number);
    await LN.schedule({ notifications: [{ id: 7001, title: 'المنة', body: 'حان وقت وردك من القرآن وتدبره', schedule: { on: { hour: h, minute: m }, allowWhileIdle: true } }] });
    return true;
  } catch (e) { logError('reminder ' + e.message); done('تعذّر ضبط التذكير', 'err'); return false; }
}

// ================================================================== العلامات والمفضلة والملاحظات (65–72)
VIEWS.notes = async function () {
  const o = st();
  const bms = o.bookmarks || [], groups = [...new Set(bms.map((b) => b.g || 'عام'))];
  const notes = Object.entries(o.notes || {}); const tags = o.tags || {};
  const allTags = [...new Set(Object.values(tags).flat())];
  const hist = (o.history || []).slice(0, 20);
  $main.innerHTML = `<h2>العلامات والملاحظات</h2>
    <h2>العلامات (${ar(bms.length)})</h2>${groups.map((g) => `<h3>${esc(g)}</h3><ul class="plain">${bms.filter((b) => (b.g || 'عام') === g).map((b) => `<li><button type="button" data-x="goto" data-s="${b.s}" data-a="${b.a}">${esc(ref(b.s, b.a))}</button>
      ${esc(simple(b.s, b.a).slice(0, 70))} <button type="button" data-x="bm-del" data-s="${b.s}" data-a="${b.a}" aria-label="حذف علامة ${esc(ref(b.s, b.a))}">حذف</button></li>`).join('')}</ul>`).join('') || '<p>لا علامات بعد. ضع علامة من زر «وضع علامة» تحت الآية.</p>'}
    <h2>المفضلة (${ar((o.favs || []).length)})</h2><ul class="plain">${(o.favs || []).map((k) => { const [s, a] = k.split(':').map(Number); return `<li><p class="x-ayah">﴿${esc(ayahText(s, a))}﴾</p><button type="button" data-x="goto" data-s="${s}" data-a="${a}">${esc(ref(s, a))}</button></li>`; }).join('') || '<li>لا آيات في المفضلة.</li>'}</ul>
    <h2>دفتر التدبر (${ar(notes.length)})</h2>
    ${o.notesPin && !notesOpen ? '<p>الدفتر مقفل بكلمة سر. <button type="button" data-x="notes-unlock">فتح الدفتر</button></p>' : `
    <form data-xf="nsearch"><label for="x-ns">البحث في ملاحظاتك</label> <input id="x-ns" type="search"> <button type="submit">بحث</button></form>
    <ul class="plain" id="x-notes">${notesHtml(notes)}</ul>
    <p><button type="button" data-x="notes-export">تصدير الملاحظات في ملف</button>
    <button type="button" data-x="notes-pin">${o.notesPin ? 'تغيير كلمة السر أو إزالتها' : 'قفل الدفتر بكلمة سر'}</button></p>`}
    <h2>الوسوم (${ar(allTags.length)})</h2>${allTags.map((t) => `<h3>${esc(t)}</h3><ul class="plain">${Object.entries(tags).filter(([, l]) => l.includes(t)).map(([k]) => { const [s, a] = k.split(':').map(Number); return `<li><button type="button" data-x="goto" data-s="${s}" data-a="${a}">${esc(ref(s, a))}</button></li>`; }).join('')}</ul>`).join('') || '<p>لا وسوم بعد.</p>'}
    <h2>آخر ما فتحت (${ar(hist.length)})</h2><ul class="plain">${hist.map((k) => { const [s, a] = k.split(':').map(Number); return `<li><button type="button" data-x="goto" data-s="${s}" data-a="${a}">${esc(ref(s, a))}</button></li>`; }).join('')}</ul>`;
};
function notesHtml(list) {
  return list.map(([k, v]) => { const [s, a] = k.split(':').map(Number); return `<li><h3>${esc(ref(s, a))}</h3><p>${esc(v.t)}</p><p class="src">${esc(v.at || '')}</p><button type="button" data-x="goto" data-s="${s}" data-a="${a}">افتح الآية</button></li>`; }).join('') || '<li>لا ملاحظات.</li>';
}

// ================================================================== الأدوات (91–100)
VIEWS.tools = async function () {
  const o = st(), hp = hijriParts(new Date());
  const profiles = JSON.parse(localStorage.getItem('almenna.profiles') || '["default"]');
  const pname = (p) => (p === 'default' ? 'المستخدم الأول' : p);
  $main.innerHTML = `<h2>الأدوات</h2>
    <h2>التاريخ والمناسبات</h2><p>اليوم ${esc(hijri())}${hp ? '' : ''}، الموافق ${new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
    <ul>${occasions().map((x) => `<li>${esc(x.name)}: ${x.days === 0 ? 'اليوم' : `بعد ${ar(x.days)} يومًا`} (${esc(x.date)})</li>`).join('')}</ul>
    <p class="src">التاريخ الهجري بحساب أم القرى، وقد يختلف يومًا عن رؤية الهلال في بلدك.</p>
    <h2>مواقيت الصلاة</h2>
    <p><label for="x-city">المدينة بالإنجليزية</label> <input id="x-city" value="${esc(o.city || 'Asyut')}" size="14">
    <label for="x-country">الدولة</label> <input id="x-country" value="${esc(o.country || 'Egypt')}" size="10"> <button type="button" data-x="prayer">عرض المواقيت</button></p><div id="x-prayer" aria-live="polite"></div>
    <h2>المسبحة</h2>
    <p><label for="x-dh">الذكر</label> <select id="x-dh" data-xc="dhikr">${DHIKR.map((d, i) => `<option value="${i}"${(o.dhikr || 0) === i ? ' selected' : ''}>${d}</option>`).join('')}</select>
      <label for="x-dt">الهدف</label> <select id="x-dt" data-xc="dtarget">${[33, 34, 99, 100, 1000].map((n) => `<option${(o.dtarget || 33) === n ? ' selected' : ''}>${n}</option>`).join('')}</select></p>
    <p><button type="button" class="primary big" data-x="tasbih" id="x-tasbih">${esc(DHIKR[o.dhikr || 0])}: ${ar(o.tcount || 0)}</button> <button type="button" data-x="tasbih-reset">تصفير العداد</button></p>
    <h2>المستخدمون</h2><p>لكل مستخدم علاماته وملاحظاته وحفظه وإعداداته، والكتب المحملة مشتركة بينهم. المستخدم الحالي: ${esc(pname(XE.profile()))}.</p>
    <ul class="plain">${profiles.map((p) => `<li>${esc(pname(p))} ${p === XE.profile() ? '(الحالي)' : `<button type="button" data-x="profile" data-p="${esc(p)}">التحويل إليه</button>`}</li>`).join('')}</ul>
    <p><label for="x-newp">اسم مستخدم جديد</label> <input id="x-newp"> <button type="button" data-x="profile-new">إضافة</button></p>
    <h2>النسخ الاحتياطي</h2>
    <p><button type="button" data-x="backup">حفظ نسخة احتياطية في ملف</button> <label for="x-restore">استعادة نسخة احتياطية</label> <input id="x-restore" type="file" accept=".json,application/json" data-xc="restore"></p>
    <p><label><input type="checkbox" data-xc="autobackup"${o.autoBackup !== false ? ' checked' : ''}> نسخة احتياطية تلقائية كل أسبوع في مجلد المستندات/المنة</label>${o.lastAutoBackup ? ` <span class="src">آخرها ${esc(o.lastAutoBackup)}</span>` : ''}</p>
    <h2>مدير التخزين</h2><div id="x-storage"><button type="button" data-x="storage">احسب المساحة المستخدمة</button></div>
    <h2>البلاغات والأعطال</h2>
    <p>بلاغاتك العلمية: ${ar((o.reports || []).length)}. سجل الأعطال التقنية: ${ar(JSON.parse(localStorage.getItem('almenna.log') || '[]').length)}.</p>
    <p><button type="button" data-x="reports-export">إرسال البلاغات وسجل الأعطال في ملف</button> <button type="button" data-x="reports-clear">مسح البلاغات والسجل</button></p>
    <h2>التحديث والسلامة</h2>
    <p><button type="button" data-x="app-update">البحث عن إصدار أحدث من التطبيق</button> <button type="button" data-x="integrity">التحقق من سلامة نص القرآن</button></p><div id="x-upd" aria-live="polite"></div>
    <h2>الخصوصية</h2><p>لا يرسل التطبيق أي بيانات عنك. ملاحظاتك وعلاماتك وحفظك محفوظة على هاتفك فقط، ولا يتصل بالإنترنت إلا لتحميل الكتب والتلاوات والمواقيت عند طلبك.</p>`;
};
function occasions() {
  const list = [[9, 1, 'بداية شهر رمضان'], [10, 1, 'عيد الفطر'], [12, 9, 'يوم عرفة'], [12, 10, 'عيد الأضحى'], [1, 1, 'رأس السنة الهجرية'], [1, 10, 'يوم عاشوراء'], [8, 15, 'منتصف شعبان']];
  const res = []; const d = new Date();
  for (let i = 0; i < 400 && res.length < list.length; i++) {
    const x = new Date(d.getTime() + i * 86400000); const p = hijriParts(x); if (!p) break;
    for (const [m, dd, name] of list) if (p.m === m && p.d === dd && !res.find((r) => r.name === name)) res.push({ name, days: i, date: x.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) });
  }
  return res.sort((a, b) => a.days - b.days);
}

// ================================================================== الميزات المئة
const FEATURES = [
  ['التنقل والقراءة', [
    ['الشاشة الرئيسية ومتابعة القراءة من آخر موضع', 'home'], ['الانتقال السريع بكتابة السورة والآية مثل ٢:٢٥٥ أو «البقرة ٢٥٥»', 'home'], ['الانتقال إلى أول أي جزء من الأجزاء الثلاثين', 'home'],
    ['فهرس السور مع البحث بالاسم أو الرقم', 'index'], ['تصفية الفهرس بالمكي والمدني', 'index'], ['آية عشوائية', 'home'], ['سجل آخر خمسين آية فتحتها', 'notes'],
    ['السورة السابقة والتالية من أدوات الآية', 'ayah'], ['بطاقة معلومات الآية: الجزء والترتيب وعدد الكلمات والحروف', 'ayah'], ['تنبيه منطوق عند آيات السجود الخمس عشرة', 'ayah'],
    ['قراءة السورة متصلة آيةً آية', 'mushaf'], ['تقطيع الآية كلمة كلمة لسهولة التنقل بقارئ الشاشة', 'ayah'], ['تهجئة الكلمة حرفًا حرفًا بحركاتها', 'ayah'],
    ['عدد مواضع الكلمة في القرآن وعرض مواضعها', 'ayah'], ['الآيات المتشابهة لفظًا لمراجعة الحفاظ', 'ayah'], ['التنقل بالسحب يمينًا ويسارًا (لمن لا يستعمل TalkBack)', 'settings'],
    ['زر الرجوع في الهاتف يرجع داخل التطبيق، وضغطتان للخروج', ''], ['البحث داخل السورة الحالية فقط', 'mushaf'], ['سجل عمليات البحث الأخيرة', 'search'], ['قائمة عناوين الصفحة للقفز إلى أي قسم', '']]],
  ['التلاوة', [
    ['عشرة قراء، منهم الحصري مرتلًا ومجودًا ومعلمًا والمنشاوي وعبد الباسط', 'settings'], ['سرعة التلاوة', 'settings'], ['تكرار الآية عددًا تحدده', 'hifz'],
    ['تلاوة مقطع من آية إلى آية', 'ayah'], ['تكرار المقطع كله', 'hifz'], ['مهلة بعد الآية لترددها خلف القارئ', 'hifz'], ['مؤقت إيقاف التلاوة', 'settings'],
    ['مستوى صوت التلاوة', 'settings'], ['حفظ تلاوة سورة كاملة للعمل بلا إنترنت', 'mushaf'], ['التحكم في التلاوة من شاشة القفل والسماعة', ''],
    ['إبقاء الشاشة مضاءة أثناء التلاوة', 'settings'], ['إعلان اسم السورة ورقم الآية قبل تلاوتها', 'settings']]],
  ['الحفظ والمراجعة', [
    ['تحديد الآيات المحفوظة', 'ayah'], ['نسبة الحفظ لكل سورة وللقرآن كله', 'index'], ['اختبار الحفظ بإخفاء الآيات', 'hifz'], ['تلميح بأول حرف من كل كلمة', 'hifz'],
    ['تلميح بأول كلمة من الآية', 'hifz'], ['التسميع بالكتابة ومقارنة ما كتبت بالآية كلمة كلمة', 'hifz'], ['اختبار الآية التالية', 'hifz'], ['اختبار: في أي سورة هذه الآية؟', 'hifz'],
    ['اختبار المكي والمدني', 'hifz'], ['المراجعة المتباعدة بمواعيد تزيد كلما أتقنت', 'hifz'], ['هدف يومي للحفظ', 'hifz'], ['سلسلة الأيام المتتالية', 'home'],
    ['تصدير سجل الحفظ في ملف', 'hifz'], ['سجل نتائج الاختبارات', 'hifz']]],
  ['الورد والختمة والتدبر', [
    ['خطة ختمة بعدد الأيام الذي تختاره', 'wird'], ['أكثر من ختمة في وقت واحد', 'wird'], ['ورد اليوم بزر واحد', 'wird'], ['تذكير يومي بالإشعار في الوقت الذي تحدده', 'wird'],
    ['خطط تدبر لسورة أو مجموعة سور', 'wird'], ['آية اليوم مع وقفة تدبرية', 'home'], ['حديث اليوم من صحيح البخاري', 'home'], ['إحصاء وقت القراءة اليومي', 'home']]],
  ['التفسير والسنة', [
    ['ملخص أحاديث السورة بدرجاتها', 'ayah'], ['فهرس الآيات التي ورد عندها حديث في السورة', 'ayah'], ['عرض الصحيح والحسن فقط', 'ayah'], ['عرض الربط الصريح فقط', 'ayah'],
    ['عرض أحاديث كتاب واحد من الكتب التسعة', 'ayah'], ['مقارنة كل التفاسير المحمّلة عند الآية في صفحة واحدة', 'ayah'], ['نسخ نص التفسير المعروض', 'ayah'],
    ['مشاركة الآية مع تفسيرها', 'ayah'], ['حفظ الملفات في مجلد المستندات ومشاركتها', 'ayah'], ['وضع التركيز يخفي الأزرار العلوية', '']]],
  ['العلامات والملاحظات', [
    ['علامات في مجموعات تسميها', 'notes'], ['قائمة المفضلة', 'notes'], ['دفتر تدبر لكل آية', 'notes'], ['البحث في الملاحظات', 'notes'], ['وسوم شخصية للآيات', 'notes'],
    ['تصدير الملاحظات في ملف', 'notes'], ['قفل الدفتر بكلمة سر', 'notes'], ['آخر موضع في كل سورة', 'index']]],
  ['قارئ الشاشة وسهولة الاستخدام', [
    ['زر «أين أنا» يعلن القسم والسورة والآية والجزء', ''], ['إعلان مفصل عند تغيير الآية', 'settings'], ['نطق «صلى الله عليه وسلم» والترضي والترحم كاملة', 'settings'],
    ['إخفاء الأقواس المزخرفة حول الآية', 'settings'], ['الأرقام العربية أو الهندية', 'settings'], ['نغمات مميزة للأحداث', 'settings'], ['الاهتزاز عند الأفعال', 'settings'],
    ['أزرار كبيرة سهلة اللمس', 'settings'], ['مظاهر تباين: أصفر على أسود، وأبيض على أسود، وبني هادئ', 'settings'], ['تباعد الأسطر', 'settings'], ['حجم خط الآية مستقلًا', 'settings'],
    ['تباعد الكلمات', 'settings'], ['تقليل الحركة', 'settings'], ['الواجهة المبسطة', 'settings'], ['جولة تعريفية عند أول تشغيل', 'welcome'], ['صفحة المساعدة', 'help'],
    ['الرسائل بنبرة عاجلة أو هادئة', 'settings'], ['إخفاء التشكيل من نص الآية عند الحاجة', 'settings']]],
  ['الأدوات', [
    ['مواقيت الصلاة بمدينتك', 'tools'], ['التاريخ الهجري', 'tools'], ['العد التنازلي لرمضان والعيدين وعرفة وعاشوراء', 'tools'], ['المسبحة مع تنبيه عند بلوغ العدد', 'tools'],
    ['أكثر من مستخدم على الهاتف نفسه', 'tools'], ['النسخ الاحتياطي والاستعادة', 'tools'], ['نسخة احتياطية تلقائية كل أسبوع', 'tools'], ['مدير التخزين', 'tools'],
    ['الإبلاغ عن خطأ علمي وسجل الأعطال', 'tools'], ['التحقق من التحديثات وسلامة نص القرآن والتنبيه عند انقطاع الإنترنت', 'tools']]],
];
VIEWS.features = async function () {
  let n = 0;
  $main.innerHTML = `<h2>الميزات الجديدة في نسخة الأندرويد (١٠٠ ميزة)</h2>
    <p class="summary">هذه الميزات المئة مضافة فوق ما في برنامج الويندوز. وكلها تعمل مع قارئ الشاشة TalkBack. اضغط على الميزة لتذهب إلى مكانها.</p>
    ${FEATURES.map(([g, list]) => `<h2>${esc(g)}</h2><ol start="${n + 1}">${list.map(([t, v]) => { n++; return `<li>${v ? `<button type="button" data-view-go="${v}">${esc(t)}</button>` : esc(t)}</li>`; }).join('')}</ol>`).join('')}`;
};

// ================================================================== المساعدة، والجولة التعريفية، وما الجديد (87، 88)
const HELP = `<h3>الأقسام</h3><p>زر «القائمة» أعلى الشاشة يفتح كل الأقسام: الرئيسية، والآية وتفسيرها، وفهرس السور، والقراءة المتصلة، والحفظ، والورد، والعلامات والملاحظات، والتفسير التدبري، والبحث، والمصادر والمراجع، والتحديث، والأدوات، والإعدادات، والميزات، والمساعدة.</p>
  <h3>الآية وتفسيرها</h3><p>تظهر الآية أولًا، ثم زر الاستماع، ثم أدوات الآية، ثم قائمة «نوع التفسير»: التفسير بالسنة، وأسباب النزول، والقراءات، والإعراب، ومعاني القرآن، وأقوال المفسرين، والتدبر. كل حديث وكل وقفة لها عنوان، فانتقل بينها بالعناوين في TalkBack.</p>
  <h3>أزرار أعلى الشاشة</h3><p>«أين أنا» يعلن موضعك. «العناوين» يعرض عناوين الصفحة لتقفز إلى أيها. «التركيز» يخفي ما سوى القائمة.</p>
  <h3>لوحة مفاتيح خارجية</h3><ul><li>Alt مع الأرقام من 1 إلى 6: الأقسام الأصلية.</li><li>Alt مع Page Down أو Page Up: الآية التالية أو السابقة.</li><li>Ctrl مع 1 إلى 7: نوع التفسير، وCtrl مع M: التلاوة، وCtrl مع G: اختيار السورة.</li></ul>
  <h3>بلا إنترنت</h3><p>الأحاديث التسعة وربطها بالآيات وأقوال الصحابة والتابعين والتدبر ونص القرآن كلها داخل التطبيق. أما كتب التفسير والتلاوات فتُحمّل مرة ثم تعمل بلا إنترنت.</p>`;
VIEWS.help = async function () { $main.innerHTML = `<h2>المساعدة</h2>${HELP}<p><button type="button" data-view-go="features">قائمة الميزات المئة</button></p>`; };
VIEWS.welcome = async function () {
  $main.innerHTML = `<h2>مرحبًا بك في «المنة في التفسير بالسنة وثقات الأئمة»</h2>
    <p class="summary">تطبيق يفسر القرآن الكريم بالأحاديث من الكتب التسعة، مع أقوال الصحابة والتابعين، وأسباب النزول والقراءات والإعراب ومعاني القرآن والتدبر، وأدوات للحفظ والورد. صُمم ليعمل كاملًا مع TalkBack.</p>
    ${HELP}<p><button type="button" class="primary big" data-x="tour-done">ابدأ</button></p>`;
};
VIEWS.whatsnew = async function () {
  $main.innerHTML = `<h2>ما الجديد في الإصدار ${esc(XE.VERSION)}</h2><ul>
    <li>صار التطبيق واحدًا يجمع برنامج الويندوز كاملًا (الإصدار ٢٫١٫٠) مع بياناته، وميزات نسخة الأندرويد السابقة.</li>
    <li>الأحاديث من الكتب التسعة مربوطة بالآيات، مع سبب الربط من كلام المفسرين، وأقوال الصحابة والتابعين، والتدبر، كلها بلا إنترنت.</li>
    <li>أسباب النزول والقراءات والإعراب ومعاني القرآن، وكتب التفسير تُحمّل عند الطلب.</li>
    <li>مئة ميزة جديدة، تجدها في قسم «الميزات».</li></ul>
    <p><button type="button" class="primary" data-x="whatsnew-done">متابعة</button> <button type="button" data-view-go="features">عرض الميزات المئة</button></p>`;
};

// ================================================================== إعدادات الأندرويد تُضاف إلى صفحة الإعدادات
const _settingsView = VIEWS.settings;
VIEWS.settings = async function () {
  await _settingsView();
  const o = st(), R0 = window.MennaReciters, cur = window.MennaAudio.reciter();
  const sel = (id, key, opts, def) => `<select id="${id}" data-xs="${key}">${opts.map(([v, l]) => `<option value="${v}"${String(o[key] == null ? def : o[key]) === String(v) ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const chk = (key, label, def) => `<p><label><input type="checkbox" data-xs="${key}"${(o[key] == null ? def : o[key]) ? ' checked' : ''}> ${label}</label></p>`;
  const html = `<h2>إعدادات الهاتف</h2>
    <h3>التلاوة</h3>
    <p><label for="x-rec">القارئ</label> <select id="x-rec" data-xs="reciter">${Object.entries(R0).map(([k, r]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></p>
    <p><label for="x-rate">السرعة</label> ${sel('x-rate', 'rate', [[0.75, 'بطيئة'], [0.9, 'أبطأ قليلًا'], [1, 'عادية'], [1.15, 'أسرع قليلًا'], [1.3, 'سريعة']], 1)}
       <label for="x-vol">مستوى الصوت</label> ${sel('x-vol', 'volume', [[0.4, '٤٠٪'], [0.6, '٦٠٪'], [0.8, '٨٠٪'], [1, '١٠٠٪']], 1)}</p>
    <p><label for="x-rep">تكرار كل آية</label> ${sel('x-rep', 'repeat', [1, 2, 3, 5, 7, 10, 20].map((n) => [n, ar(n)]), 1)}
       <label for="x-sleep">مؤقت الإيقاف</label> <select id="x-sleep" data-xc="sleep"><option value="0">بلا مؤقت</option>${[5, 10, 15, 30, 45, 60, 90].map((m) => `<option value="${m}">بعد ${ar(m)} دقيقة</option>`).join('')}</select></p>
    ${chk('saveAudio', 'حفظ كل آية أستمع إليها على الهاتف لتعمل بلا إنترنت', true)}${chk('keepAwake', 'إبقاء الشاشة مضاءة أثناء التلاوة', true)}${chk('announcePlay', 'إعلان السورة ورقم الآية قبل تلاوتها', false)}
    <h3>قارئ الشاشة</h3>
    ${chk('verbose', 'إعلان مفصل عند تغيير الآية: السورة ونوعها ورقم الآية والجزء', false)}${chk('honorifics', 'نطق «صلى الله عليه وسلم» و«رضي الله عنه» كاملة بدل الرموز', true)}
    ${chk('noBrackets', 'إخفاء الأقواس المزخرفة ﴿﴾ حول الآيات', false)}${chk('westDigits', 'الأرقام 1 2 3 بدل ١ ٢ ٣', false)}${chk('noTashkil', 'نص الآية بلا تشكيل', false)}
    ${chk('sajdaNote', 'التنبيه عند آيات السجدة', true)}${chk('urgentMsgs', 'قراءة كل الرسائل فورًا بنبرة عاجلة', false)}${chk('tones', 'نغمات قصيرة عند الانتقال والحفظ والخطأ', true)}${chk('haptics', 'الاهتزاز عند الأفعال', true)}
    <h3>العرض</h3>
    <p><label for="x-theme2">مظاهر إضافية</label> ${sel('x-theme2', 'theme', [['light', 'فاتح'], ['dark', 'داكن'], ['contrast', 'تباين عالٍ'], ['yellow', 'أصفر على أسود'], ['whiteblack', 'أبيض على أسود'], ['sepia', 'بني هادئ']], 'light')}</p>
    <p><label for="x-asz">حجم خط الآية</label> ${sel('x-asz', 'ayahSize', [[22, '٢٢'], [26, '٢٦'], [30, '٣٠'], [34, '٣٤'], [40, '٤٠'], [48, '٤٨']], 30)}
       <label for="x-lh">تباعد الأسطر</label> ${sel('x-lh', 'lineHeight', [[1.6, 'ضيق'], [1.9, 'عادي'], [2.3, 'واسع'], [2.8, 'واسع جدًا']], 1.9)}
       <label for="x-wsp">تباعد الكلمات</label> ${sel('x-wsp', 'wordSpacing', [[0, 'عادي'], [0.15, 'متوسط'], [0.35, 'واسع']], 0)}</p>
    ${chk('bigTargets', 'أزرار كبيرة سهلة اللمس', false)}${chk('reduceMotion', 'تقليل الحركة', false)}${chk('simpleUi', 'الواجهة المبسطة: إخفاء الأقسام الأقل استعمالًا من القائمة', false)}
    ${chk('swipe', 'السحب يمينًا ويسارًا للآية التالية والسابقة (أوقفه مع TalkBack)', false)}${chk('startHome', 'البدء من الشاشة الرئيسية', true)}
    <p><button type="button" data-view-go="welcome">إعادة الجولة التعريفية</button></p>`;
  $main.querySelector('h2').insertAdjacentHTML('beforebegin', html);
};

// ================================================================== الأحداث
async function viewClick(act, b) {
  const o = st(), d = b.dataset;
  switch (act) {
    case 'continue': await go('ayah'); break;
    case 'read-surah': o.surah = +d.s; o.ayah = 1; S.xRange = null; await go('mushaf'); break;
    case 'ms-play': { const r = S.xRange && S.xRange.s === o.surah ? S.xRange : { from: 1, to: surah(o.surah).ayahs }; playRange(o.surah, r.from, r.to, 1); await go('ayah'); break; }
    case 'ms-save-audio': saveSurahAudio(o.surah); break;
    case 'wird-next': { const n = S.xRange.next; const last = n.s === n.endS; S.xRange = { ...S.xRange, s: n.s, from: 1, to: last ? n.endA : surah(n.s).ayahs, next: last ? null : { ...n, s: n.s + 1 } }; o.surah = n.s; await go('mushaf'); break; }
    case 'reveal': {
      const s = +d.s, a = +d.a, open = b.getAttribute('aria-expanded') === 'true';
      if (!open) { b.dataset.hint = b.textContent; b.querySelector('.x-ayah').textContent = ayahText(s, a); b.setAttribute('aria-expanded', 'true'); }
      else { b.querySelector('.x-ayah').textContent = b.dataset.hint; b.setAttribute('aria-expanded', 'false'); }
      tone('nav'); break;
    }
    case 'h-listen': R.stopped = false; hifzListen(); break;
    case 'h-stop': R.stopped = true; stopPlay(); break;
    case 'h-test': startTest(); break;
    case 'typed-check': {
      const [s, a] = testItem(); const r = wordDiff(simple(s, a), $('x-typed').value);
      const ws = norm(simple(s, a)).split(' ');
      if (r.ok) { T.right++; done('صحيح، أحسنت'); } else tone('err');
      $('x-typed-r').innerHTML = r.ok ? '<p>صحيح تمامًا.</p>' : `<p>أصبت ${ar(r.right)} من ${ar(r.total)} كلمة.</p>
        ${r.miss.length ? `<p>كلمات نقصت: ${esc(r.miss.map(([i]) => words(s, a)[i] || ws[i]).join('، '))}.</p>` : ''}${r.extra.length ? `<p>كلمات زائدة أو مختلفة: ${esc(r.extra.join('، '))}.</p>` : ''}
        <p>الآية: ﴿${esc(ayahText(s, a))}﴾</p>`;
      $('x-typed-r').insertAdjacentHTML('beforeend', '<button type="button" data-x="typed-next">التالية</button>');
      break;
    }
    case 'typed-skip': case 'typed-next': T.i++; if (T.i >= T.list.length) finishQuiz(); else renderType(); break;
    case 'choice': {
      const ok = T.opts[+d.i] === T.right_;
      if (ok) T.right++;
      $('x-choice-r').innerHTML = `<p>${ok ? 'صحيح' : 'خطأ، والصواب: ' + esc(T.right_)}</p><button type="button" data-x="choice-next">التالي</button>`;
      tone(ok ? 'ok' : 'err'); buzz(ok ? 'ok' : 'err');
      $main.querySelectorAll('[data-x="choice"]').forEach((x) => { x.disabled = true; });
      $('x-choice-r').querySelector('button').focus(); break;
    }
    case 'choice-next': T.i++; renderChoice(); break;
    case 'h-add-review': { const r = readRange(); addReview(`${r.s}:${r.from}-${r.to}`); done(`أضيف ${RTITLE(r.s, r.from, r.to)} إلى المراجعة، وموعده غدًا`); break; }
    case 'h-mark-range': { const r = readRange(); for (let a = r.from; a <= r.to; a++) if (!isMemo(r.s, a)) setMemo(r.s, a, true); done(`سُجّلت ${r.to - r.from + 1} آية محفوظة`, 'mark'); break; }
    case 'rv-open': { const g = rangeOf(d.k); o.hifz = { ...o.hifz, s: g.s, from: g.from, to: g.to }; await VIEWS.hifz(); focusId('x-hm'); break; }
    case 'rv-ok': case 'rv-bad': {
      const r = o.review[d.k]; r.step = act === 'rv-ok' ? Math.min(REVIEW_STEPS.length - 1, r.step + 1) : 0;
      r.due = addDays(today(), REVIEW_STEPS[r.step]); markActivity();
      done(act === 'rv-ok' ? `أحسنت، المراجعة التالية بعد ${REVIEW_STEPS[r.step]} يومًا` : 'سيعود إليك غدًا'); await xsave(); await VIEWS.hifz(); focusId('x-rev-h'); break;
    }
    case 'h-export': {
      let t = `سجل الحفظ — ${new Date().toLocaleDateString('ar-EG')}\nالمحفوظ ${memoTotal()} آية من ${TOTAL}\n\n`;
      for (const x of S.meta.surahs) { const m = (o.memo || {})[x.n]; if (m && m.length) t += `سورة ${x.name}: ${m.length} من ${x.ayahs} — الآيات ${m.join('، ')}\n`; }
      t += '\nالأيام: ' + Object.entries(o.memoLog || {}).map(([d2, n]) => `${d2}: ${n}`).join('، ');
      const p = await window.api.saveText('سجل الحفظ.txt', t); if (p) done('حُفظ سجل الحفظ'); break;
    }
    case 'wird-open': await openWird(d.id); break;
    case 'wird-done': {
      const k = o.khatmas.find((x) => x.id === d.id); const day = +d.day;
      if (!k.done.includes(day)) k.done.push(day);
      if (k.done.length >= k.days) { k.finished = true; done(`تمت ${k.name} بحمد الله`, 'mark'); } else done(`أتممت ورد اليوم. بقي ${k.days - k.done.length} وردًا`, 'mark');
      markActivity(); await xsave(); if (S.view === 'wird') await VIEWS.wird(); break;
    }
    case 'kh-new': {
      const f = +$('x-kf').value, t = Math.max(f, +$('x-kt').value);
      const k = { id: 'k' + Date.now(), name: $('x-kn').value.trim() || 'ختمة', kind: $('x-kk').value, days: +$('x-kd').value, start: today(), done: [],
        fromG: globalAyah(f, 1), toG: globalAyah(t, surah(t).ayahs) };
      o.khatmas = (o.khatmas || []).concat([k]); await xsave(); await VIEWS.wird(); done(`أُنشئت ${k.name}`); focusId('kh-' + k.id); break;
    }
    case 'kh-del': if (window.confirm('حذف هذه الخطة؟')) { o.khatmas = o.khatmas.filter((x) => x.id !== d.id); await xsave(); await VIEWS.wird(); announce('حُذفت'); } break;
    case 'rem-set': { const v = $('x-rem').value; if (!v) { say('اختر الوقت أولًا'); break; } if (await scheduleReminder(v)) { o.reminder = v; await xsave(); done(`سيذكرك التطبيق كل يوم الساعة ${v}`); } break; }
    case 'rem-off': await scheduleReminder(''); delete o.reminder; await xsave(); await VIEWS.wird(); done('أوقف التذكير'); break;
    case 'bm-del': o.bookmarks = o.bookmarks.filter((x) => !(x.s === +d.s && x.a === +d.a)); await xsave(); await VIEWS.notes(); done('حُذفت العلامة'); break;
    case 'notes-unlock': if (await unlockNotes()) await VIEWS.notes(); break;
    case 'notes-export': {
      let t = 'دفتر التدبر — تطبيق المنة\n\n';
      for (const [k, v] of Object.entries(o.notes || {})) { const [s, a] = k.split(':').map(Number); t += `${ayahPlain(s, a)}\n${v.t}\n(${v.at || ''})\n\n`; }
      const p = await window.api.saveText('دفتر التدبر.txt', t); if (p) done('صُدّرت الملاحظات'); break;
    }
    case 'notes-pin': {
      const p = window.prompt(o.notesPin ? 'اكتب كلمة السر الجديدة، أو اتركها فارغة لإزالة القفل' : 'اكتب كلمة السر للدفتر');
      if (p == null) break;
      o.notesPin = p ? await sha(p) : ''; notesOpen = true; await xsave(); done(p ? 'قُفل الدفتر بكلمة السر' : 'أزيل القفل'); break;
    }
    case 'prayer': {
      o.city = $('x-city').value.trim(); o.country = $('x-country').value.trim(); xsave();
      const box = $('x-prayer'); box.innerHTML = '<p class="loading">جاري الجلب…</p>';
      try {
        const j = JSON.parse(await window.MennaNet.withMirrors([`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(o.city)}&country=${encodeURIComponent(o.country)}&method=5`], 30000));
        const t = j.data.timings; const N = [['Fajr', 'الفجر'], ['Sunrise', 'الشروق'], ['Dhuhr', 'الظهر'], ['Asr', 'العصر'], ['Maghrib', 'المغرب'], ['Isha', 'العشاء']];
        o.lastTimings = { at: today(), t }; xsave();
        box.innerHTML = `<h3 tabindex="-1">مواقيت ${esc(o.city)} اليوم</h3><ul>${N.map(([k, n]) => `<li>${n}: ${esc(t[k])}</li>`).join('')}</ul><p class="src">بطريقة الهيئة المصرية العامة للمساحة، من موقع aladhan.</p>`;
        box.querySelector('h3').focus();
      } catch {
        const L = o.lastTimings;
        box.innerHTML = `<p class="bad">تعذّر جلب المواقيت. تحقق من الإنترنت ومن كتابة اسم المدينة بالإنجليزية.</p>${L ? `<p>آخر مواقيت محفوظة (${esc(L.at)}): الفجر ${L.t.Fajr}، الظهر ${L.t.Dhuhr}، العصر ${L.t.Asr}، المغرب ${L.t.Maghrib}، العشاء ${L.t.Isha}.</p>` : ''}`;
      }
      break;
    }
    case 'tasbih': {
      o.tcount = (o.tcount || 0) + 1; const tg = o.dtarget || 33;
      b.textContent = `${DHIKR[o.dhikr || 0]}: ${ar(o.tcount)}`;
      if (o.tcount % tg === 0) { tone('mark'); try { XP.Haptics ? XP.Haptics.vibrate({ duration: 400 }) : navigator.vibrate && navigator.vibrate(400); } catch { /* none */ } say(`بلغت ${o.tcount}`); } else buzz('nav');
      xsave(); break;
    }
    case 'tasbih-reset': o.tcount = 0; xsave(); $('x-tasbih').textContent = `${DHIKR[o.dhikr || 0]}: ${ar(0)}`; announce('صُفّر العداد'); break;
    case 'profile': localStorage.setItem('almenna.profile', d.p); location.reload(); break;
    case 'profile-new': {
      const n = $('x-newp').value.trim(); if (!n) break;
      const ps = JSON.parse(localStorage.getItem('almenna.profiles') || '["default"]'); if (!ps.includes(n)) ps.push(n);
      localStorage.setItem('almenna.profiles', JSON.stringify(ps)); localStorage.setItem('almenna.profile', n); location.reload(); break;
    }
    case 'backup': { await xsave(); const p = await window.api.saveText(`نسخة احتياطية من المنة ${today()}.json`, backupData()); if (p) done('حُفظت النسخة الاحتياطية'); break; }
    case 'storage': {
      const box = $('x-storage'); box.innerHTML = '<p class="loading">جاري الحساب…</p>';
      const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
      const aud = await window.api.audioSize(); const books = Object.values(await window.api.books());
      box.innerHTML = `<ul><li>الكتب المحملة: ${ar(books.length)} كتابًا.</li><li>التلاوات المحفوظة: ${ar(aud.files)} آية، ${ar(Math.round(aud.bytes / 1048576))} ميجابايت.</li>
        ${est ? `<li>المساحة التي يستعملها التطبيق للكتب: نحو ${ar(Math.round(est.usage / 1048576))} ميجابايت.</li>` : ''}</ul>
        <button type="button" data-view-go="sources">إدارة الكتب وحذفها</button> <button type="button" data-act="audio-clear">حذف كل التلاوات المحفوظة</button>`;
      box.querySelector('ul').tabIndex = -1; box.querySelector('ul').focus(); break;
    }
    case 'reports-export': {
      const log = JSON.parse(localStorage.getItem('almenna.log') || '[]');
      let t = `بلاغات وسجل أعطال تطبيق المنة ${XE.VERSION} — ${new Date().toISOString()}\n\n== البلاغات العلمية ==\n`;
      for (const r of o.reports || []) t += `${ref(r.s, r.a)} | ${r.type} | ${r.view || ''} | ${r.at}\n${r.text}\n\n`;
      t += '\n== سجل الأعطال ==\n' + log.map((l) => `${l.at} [${l.view}] ${l.msg}`).join('\n');
      t += `\n\nالجهاز: ${navigator.userAgent}`;
      const p = await window.api.saveText('بلاغات المنة.txt', t); if (p) done('جُهّز الملف، فأرسله لنا'); break;
    }
    case 'reports-clear': if (window.confirm('مسح البلاغات والسجل؟')) { o.reports = []; localStorage.removeItem('almenna.log'); await xsave(); await VIEWS.tools(); announce('مُسحت'); } break;
    case 'app-update': {
      const box = $('x-upd'); box.innerHTML = '<p class="loading">جاري البحث…</p>';
      try {
        let build = 0; try { build = (await (await fetch('build.json')).json()).build || 0; } catch { /* dev */ }
        const j = JSON.parse(await window.MennaNet.withMirrors(['https://api.github.com/repos/mohamedgamal141091-tech/almenna-/releases/latest'], 30000));
        const latest = +(String(j.tag_name).split('.').pop()) || 0;
        const asset = (j.assets || []).find((x) => /\.apk$/.test(x.name));
        box.innerHTML = latest > build ? `<p tabindex="-1">يوجد إصدار أحدث: ${esc(j.name || j.tag_name)}.</p>${asset ? `<button type="button" data-x="open-url" data-url="${esc(asset.browser_download_url)}">تنزيل الإصدار الجديد</button>` : ''}<p class="src">ثبّته فوق الحالي، وتبقى بياناتك.</p>`
          : `<p tabindex="-1">عندك أحدث إصدار (${esc(j.tag_name)}).</p>`;
        box.querySelector('p').focus();
      } catch { box.innerHTML = '<p class="bad" tabindex="-1">تعذّر الاتصال. تحقق من الإنترنت.</p>'; box.querySelector('p').focus(); }
      break;
    }
    case 'open-url': window.api.openExternal(d.url); break;
    case 'integrity': {
      const buf = await (await fetch('data/quran.json.gz')).arrayBuffer();
      const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((x) => x.toString(16).padStart(2, '0')).join('');
      const ok = h === QURAN_SHA; $('x-upd').innerHTML = `<p tabindex="-1">${ok ? 'نص القرآن في التطبيق سليم، مطابق للنسخة الأصلية تمامًا.' : 'تنبيه: نص القرآن في التطبيق لا يطابق النسخة الأصلية. أعد تثبيت التطبيق.'}</p>`;
      $('x-upd').querySelector('p').focus(); tone(ok ? 'ok' : 'err'); break;
    }
    case 'tour-done': o.seenTour = true; o.seenVersion = XE.VERSION; await xsave(); await go('home'); break;
    case 'whatsnew-done': o.seenVersion = XE.VERSION; await xsave(); await go('home'); break;
    case 'sunnah-summary': await sunnahSummary(); break;
    default: return false;
  }
  return true;
}
async function sunnahSummary() {
  const s = st().surah; const L = await links(s); const A = await athData(s);
  let total = 0; const g = { S: 0, U: 0, W: 0 }; let ath = 0; const ayahs = [];
  for (let a = 1; a <= surah(s).ayahs; a++) { const l = L[String(a)] || []; if (l.length) ayahs.push([a, l.length]); total += l.length; l.forEach((e) => { g[e.s] = (g[e.s] || 0) + 1; }); ath += (A[String(a)] || []).length; }
  out(`<h3>أحاديث سورة ${esc(surah(s).name)}</h3><p>في السورة ${ar(total)} حديثًا عند ${ar(ayahs.length)} آية: الصحيح والحسن ${ar(g.S)}، وما لم يُحكم عليه ${ar(g.U)}، والضعيف ${ar(g.W)}. ومعها ${ar(ath)} من آثار الصحابة والتابعين.</p>
    <h4>الآيات التي عندها أحاديث</h4><ul class="plain">${ayahs.map(([a, n]) => `<li><button type="button" data-x="goto" data-s="${s}" data-a="${a}">الآية ${ar(a)}: ${ar(n)} حديثًا</button></li>`).join('')}</ul>`);
}

$main.addEventListener('click', async (e) => {
  const v = e.target.closest('button[data-view-go]');
  if (v) { const then = v.dataset.then; await go(v.dataset.viewGo); if (then === 'review') focusId('x-rev-h'); return; }
  const b = e.target.closest('button[data-x]'); if (!b) return;
  const act = b.dataset.x;
  try {
    if (!(await ayahToolClick(act, b))) await viewClick(act, b);
    xsave();
  } catch (err) { logError(act + ': ' + err.message); done('حدث خطأ: ' + err.message, 'err'); }
});
$main.addEventListener('change', async (e) => {
  const t = e.target, o = st();
  if (t.dataset.xs) {
    const k = t.dataset.xs; o[k] = t.type === 'checkbox' ? t.checked : (isNaN(+t.value) || t.value === '' ? t.value : +t.value);
    if (k === 'theme') applyLook();
    applyX(); xsave(); if (k === 'reciter') { stopPlay(true); setPlayLabel(); announce('القارئ: ' + window.MennaReciters[t.value].name); }
    if (k === 'simpleUi') applyMenu();
    return;
  }
  const c = t.dataset.xc; if (!c) return;
  switch (c) {
    case 'juz': if (t.value) { const [s, a] = JUZ[+t.value - 1]; await go('ayah'); await setAyah(s, a); } break;
    case 'sfilter': renderIndex(); break;
    case 'msurah': o.surah = +t.value; o.ayah = 1; S.xRange = null; await VIEWS.mushaf(); focusId('x-ms'); break;
    case 'hs': { const s = +t.value; $('x-hf').value = 1; $('x-ht').value = Math.min(surah(s).ayahs, 7); readRange(); break; }
    case 'hmode': readRange(); break;
    case 'gap': o.gapAuto = t.value === 'auto'; o.gap = o.gapAuto ? 0 : +t.value; xsave(); break;
    case 'goal': o.dailyGoal = Math.max(1, +t.value || 5); xsave(); announce('حُفظ الهدف'); break;
    case 'hfilter': o.hfilter = t.value; xsave(); { const b = $('tbody'); if (b) { b.querySelectorAll('article.item[id^="h-"]').forEach((x) => { x.hidden = false; }); applyHadithFilter(b); } } announce('عدد الأحاديث الظاهرة ' + $main.querySelectorAll('#tbody article.item[id^="h-"]:not([hidden])').length); break;
    case 'sleep': setSleep(+t.value); break;
    case 'dhikr': o.dhikr = +t.value; o.tcount = 0; xsave(); $('x-tasbih').textContent = `${DHIKR[o.dhikr]}: ${ar(0)}`; break;
    case 'dtarget': o.dtarget = +t.value; xsave(); break;
    case 'autobackup': o.autoBackup = t.checked; xsave(); break;
    case 'restore': {
      const f = t.files && t.files[0]; if (!f) break;
      try { restoreData(await f.text()); done('استُعيدت النسخة الاحتياطية، وسيُعاد فتح التطبيق'); setTimeout(() => location.reload(), 1500); } catch (err) { done('تعذّرت الاستعادة: ' + err.message, 'err'); }
      break;
    }
    default: break;
  }
});
$main.addEventListener('input', (e) => { if (e.target.id === 'x-filter') renderIndex(); });
$main.addEventListener('submit', async (e) => {
  const f = e.target.dataset.xf; if (!f) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (f === 'jump') {
    const r = parseJump($('x-jump').value);
    if (!r || r[0] < 1 || r[0] > 114) { done('لم أفهم الموضع. اكتب مثلًا ٢:٢٥٥ أو البقرة ٢٥٥', 'err'); return; }
    await go('ayah'); await setAyah(r[0], Math.min(surah(r[0]).ayahs, Math.max(1, r[1])));
  } else if (f === 'insurah') {
    const q = norm($('x-insurah').value); const s = st().surah; const terms = q.split(' ').filter(Boolean);
    const hits = []; S.quran[s].forEach((v, i) => { const sv = norm(simple(s, i + 1)); if (terms.length && terms.every((x) => sv.includes(x))) hits.push(i + 1); });
    $('x-insurah-r').innerHTML = `<p>${ar(hits.length)} نتيجة.</p><ul class="plain">${hits.map((a) => `<li><button type="button" data-x="goto" data-s="${s}" data-a="${a}">الآية ${ar(a)}</button> ${esc(simple(s, a).slice(0, 90))}</li>`).join('')}</ul>`;
  } else if (f === 'nsearch') {
    const q = norm($('x-ns').value);
    const list = Object.entries(st().notes || {}).filter(([k, v]) => !q || norm(v.t).includes(q) || norm(simple(...k.split(':').map(Number))).includes(q));
    $('x-notes').innerHTML = notesHtml(list); announce(`${list.length} ملاحظة`);
  }
}, true);

// سجل البحث (19): يُحفظ كل بحث ويُعرض تحت نموذج البحث
$main.addEventListener('submit', (e) => {
  if (e.target.dataset.form !== 'search') return;
  const q = ($('q') || {}).value; if (!q) return;
  const o = st(); o.searches = [q].concat((o.searches || []).filter((x) => x !== q)).slice(0, 15); xsave();
}, true);
const _searchView = VIEWS.search;
VIEWS.search = async function () {
  await _searchView();
  const ss = st().searches || [];
  if (ss.length) $main.querySelector('form').insertAdjacentHTML('afterend', `<details><summary>عمليات البحث الأخيرة (${ar(ss.length)})</summary><ul class="plain">${ss.map((q) => `<li><button type="button" data-x="re-search" data-q="${esc(q)}">${esc(q)}</button></li>`).join('')}</ul></details>`);
};
$main.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-x="re-search"]'); if (!b) return;
  $('q').value = b.dataset.q; runSearch(b.dataset.q, $('where').value);
}, true);

// ملخص أحاديث السورة (55، 56) يُضاف زره إلى قسم التفسير بالسنة
const _sunnah = TYPE_VIEWS.sunnah;
TYPE_VIEWS.sunnah = async function () {
  const h = await _sunnah();
  return h.replace('<button type="button" data-act="add-hadith">', '<button type="button" data-x="sunnah-summary">ملخص أحاديث السورة وفهرس آياتها</button> <button type="button" data-act="add-hadith">');
};

// ------------------------------------------------------------------ القائمة الرئيسية
const MENU = [
  ['home', 'الرئيسية'], ['ayah', 'الآية وتفسيرها'], ['index', 'فهرس السور'], ['mushaf', 'القراءة المتصلة'], ['hifz', 'الحفظ والمراجعة'], ['wird', 'الورد والختمة والتدبر'],
  ['notes', 'العلامات والملاحظات'], ['tadabburi', 'التفسير التدبري للسورة'], ['search', 'البحث'], ['sources', 'المصادر والمراجع'], ['update', 'التحديث وإضافة الكتب'],
  ['tools', 'الأدوات'], ['settings', 'الإعدادات ومنهج البرنامج'], ['features', 'الميزات المئة'], ['help', 'المساعدة'],
];
const SIMPLE_HIDE = ['update', 'tools', 'features', 'tadabburi', 'wird'];
function applyMenu() {
  const simpleUi = st().simpleUi;
  $('tabs').innerHTML = MENU.filter(([v]) => !simpleUi || !SIMPLE_HIDE.includes(v)).map(([v, l]) => `<li><button type="button" data-view="${v}" aria-current="${S.view === v ? 'page' : 'false'}">${l}</button></li>`).join('');
}
const _ready = H.ready;
H.ready = async () => { await _ready(); applyMenu(); };
