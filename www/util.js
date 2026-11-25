'use strict';
/* Pure helpers shared by the interface (also loadable in Node for testing). */
(function (root) {
  const DIAC = /[ؐ-ًؚ-ٰٟۖ-ۭـ‌-‏⁠ ]/g;
  const NONW = /[^ء-ي0-9 ]+/g;
  function norm(t) {
    t = String(t || '').replace(DIAC, '');
    t = t.replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
    t = t.replace(/ﷺ/g, ' صلي الله عليه وسلم ');
    t = t.replace(NONW, ' ');
    return t.replace(/ +/g, ' ').trim();
  }
  // Same rule as the build: consecutive identical texts form one group [first, last, text]
  function groups(list) {
    const out = [];
    for (const x of list || []) {
      const a = x.ayah, t = x.text || '';
      const last = out[out.length - 1];
      if (last && last[2] === t) last[1] = Math.max(last[1], a);
      else out.push([a, a, t]);
    }
    return out;
  }
  function groupForAyah(gs, ayah) {
    for (let i = 0; i < gs.length; i++) if (gs[i][0] <= ayah && ayah <= gs[i][1]) return i;
    return -1;
  }
  const AR = '٠١٢٣٤٥٦٧٨٩';
  function ar(n) { return String(n).replace(/[0-9]/g, (d) => AR[d]); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // Escape, then show printed page markers and editor's footnotes clearly
  function richText(t) {
    let s = esc(t);
    s = s.replace(/\(p-([٠-٩0-9]+)(?::([٠-٩0-9]+))?\)/g, (_m, p, q) => `<span class="page">[ص ${p}${q ? ':' + q : ''}]</span>`);
    s = s.replace(/\[\[([\s\S]*?)\]\]/g, (_m, f) => ` <span class="foot">(حاشية المحقق: ${f})</span>`);
    return s;
  }
  function plainText(t) {
    return String(t || '').replace(/\(p-[٠-٩0-9:]+\)/g, '').replace(/\[\[[\s\S]*?\]\]/g, '').replace(/[ \t]+/g, ' ').trim();
  }
  // paragraphs of a group with their character offsets (the build splits on blank lines)
  function paragraphs(text) {
    const out = []; let pos = 0;
    for (const p of String(text).split('\n\n')) { out.push([pos, p]); pos += p.length + 2; }
    return out;
  }
  function highlight(htmlEscaped, terms) {
    if (!terms.length) return htmlEscaped;
    return htmlEscaped;
  }
  const api = { norm, groups, groupForAyah, ar, esc, richText, plainText, paragraphs, highlight };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.U = api;
})(this);
