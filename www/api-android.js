'use strict';
/* المنة — طبقة الأندرويد: تقوم مقام واجهة window.api التي يوفرها برنامج الويندوز،
   فيعمل كود البرنامج نفسه على الهاتف دون تغيير في منطقه. */
(function () {
  const VERSION = '2.2.0';
  const Cap = window.Capacitor || null;
  const P = (Cap && Cap.Plugins) || {};
  const native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());

  // ---------------- gzip
  async function gunzipBytes(buf) {
    const u8 = new Uint8Array(buf);
    if (!(u8[0] === 0x1f && u8[1] === 0x8b)) return new TextDecoder().decode(u8);   // already decoded by the server
    const ds = new DecompressionStream('gzip');
    const out = await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
    return new TextDecoder().decode(out);
  }
  async function gzipText(text) {
    if (typeof CompressionStream === 'undefined') return text;
    const cs = new CompressionStream('gzip');
    return new Response(new Blob([text]).stream().pipeThrough(cs)).arrayBuffer();
  }
  async function unpack(v) {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    return gunzipBytes(v);
  }

  // ---------------- IndexedDB
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((ok, bad) => {
      const r = indexedDB.open('almenna', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const s of ['parts', 'manifests', 'qp', 'kv', 'audio']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => bad(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await db();
    return new Promise((ok, bad) => {
      const t = d.transaction(store, mode);
      const st = t.objectStore(store);
      let res;
      Promise.resolve(fn(st)).then((r) => { res = r; });
      t.oncomplete = () => ok(res instanceof IDBRequest ? res.result : res);
      t.onerror = () => bad(t.error);
      t.onabort = () => bad(t.error);
    });
  }
  const idb = {
    get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
    put: (store, key, val) => tx(store, 'readwrite', (s) => { s.put(val, key); }),
    del: (store, key) => tx(store, 'readwrite', (s) => { s.delete(key); }),
    keys: (store, range) => tx(store, 'readonly', (s) => s.getAllKeys(range)),
    delRange: (store, range) => tx(store, 'readwrite', (s) => { s.delete(range); }),
    count: (store, range) => tx(store, 'readonly', (s) => s.count(range)),
  };
  const prefix = (p) => IDBKeyRange.bound(p, p + '￿');
  window.MennaDB = idb;

  // ---------------- network (native requests avoid browser restrictions on other sites)
  async function getText(url, timeoutMs) {
    if (P.CapacitorHttp && native) {
      const r = await P.CapacitorHttp.request({ url, method: 'GET', responseType: 'text', connectTimeout: timeoutMs, readTimeout: timeoutMs, headers: { Accept: 'application/json' } });
      if (r.status === 404) { const e = new Error('HTTP 404'); e.status = 404; throw e; }
      if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status);
      return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    }
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (r.status === 404) { const e = new Error('HTTP 404'); e.status = 404; throw e; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } finally { clearTimeout(t); }
  }
  async function withMirrors(urls, timeoutMs = 120000) {
    let last;
    for (const u of urls) for (let i = 0; i < 2; i++) {
      try { return await getText(u, timeoutMs); } catch (e) { last = e; if (e.status === 404) break; }
    }
    throw last || new Error('download failed');
  }
  window.MennaNet = { getText, withMirrors };

  // ---------------- settings (one profile per user name)
  function profile() { return localStorage.getItem('almenna.profile') || 'default'; }
  const SKEY = () => 'almenna.settings.' + profile();

  // ---------------- progress listeners
  const listeners = [];
  const emit = (m) => listeners.forEach((fn) => { try { fn(m); } catch { /* ignore */ } });

  const jobs = new Map();
  async function bookList() {
    const out = {};
    const keys = await idb.keys('manifests');
    for (const k of keys) {
      const m = await idb.get('manifests', k);
      if (!m) continue;
      const parts = await idb.count('parts', prefix(k + '/'));
      out[k] = { ...m, parts };
    }
    return out;
  }

  // ---------------- recitation files
  const RECITERS = {
    husary: { name: 'محمود خليل الحصري (مرتل)', dir: 'Husary_128kbps', cdn: 'ar.husary' },
    husary_mujawwad: { name: 'محمود خليل الحصري (مجود)', dir: 'Husary_128kbps_Mujawwad', cdn: 'ar.husarymujawwad' },
    husary_muallim: { name: 'محمود خليل الحصري (المصحف المعلم)', dir: 'Husary_Muallim_128kbps' },
    minshawi: { name: 'محمد صديق المنشاوي (مرتل)', dir: 'Minshawy_Murattal_128kbps', cdn: 'ar.minshawi' },
    abdulbasit: { name: 'عبد الباسط عبد الصمد (مرتل)', dir: 'Abdul_Basit_Murattal_192kbps', cdn: 'ar.abdulbasitmurattal' },
    alafasy: { name: 'مشاري راشد العفاسي', dir: 'Alafasy_128kbps', cdn: 'ar.alafasy' },
    sudais: { name: 'عبد الرحمن السديس', dir: 'Abdurrahmaan_As-Sudais_192kbps', cdn: 'ar.abdurrahmaansudais' },
    shuraim: { name: 'سعود الشريم', dir: 'Saood_ash-Shuraym_128kbps', cdn: 'ar.saoodshuraym' },
    ayyoub: { name: 'محمد أيوب', dir: 'Muhammad_Ayyoub_128kbps', cdn: 'ar.muhammadayyoub' },
    hudhaify: { name: 'علي الحذيفي', dir: 'Hudhaify_128kbps', cdn: 'ar.hudhaify' },
  };
  window.MennaReciters = RECITERS;
  function reciter() {
    try { const s = JSON.parse(localStorage.getItem(SKEY()) || '{}'); return RECITERS[s.reciter] ? s.reciter : 'husary'; } catch { return 'husary'; }
  }
  function audioName(s, a) { return String(s).padStart(3, '0') + String(a).padStart(3, '0') + '.mp3'; }
  function audioUrls(s, a, g, rk) {
    const r = RECITERS[rk || reciter()];
    const n = audioName(s, a);
    const urls = [`https://everyayah.com/data/${r.dir}/${n}`, `https://mirrors.quranicaudio.com/everyayah/${r.dir}/${n}`];
    if (r.cdn) urls.push(`https://cdn.islamic.network/quran/audio/128/${r.cdn}/${g}.mp3`);
    return urls;
  }
  async function audioLocal(s, a, rk) {
    if (!P.Filesystem) return null;
    const path = `audio/${rk || reciter()}/${audioName(s, a)}`;
    try {
      const st = await P.Filesystem.stat({ path, directory: 'DATA' });
      if (st.size > 2000) return Cap.convertFileSrc(st.uri);
    } catch { /* not saved */ }
    return null;
  }
  async function audioSave(s, a, g, rk) {
    if (!P.Filesystem || !P.Filesystem.downloadFile) throw new Error('no filesystem');
    const path = `audio/${rk || reciter()}/${audioName(s, a)}`;
    let last;
    for (const url of audioUrls(s, a, g, rk)) {
      try {
        const r = await P.Filesystem.downloadFile({ url, path, directory: 'DATA', recursive: true });
        const st = await P.Filesystem.stat({ path, directory: 'DATA' });
        if (st.size > 2000) return Cap.convertFileSrc(st.uri || r.path);
      } catch (e) { last = e; }
    }
    throw last || new Error('audio download failed');
  }
  async function dirSize(path) {
    let files = 0, bytes = 0;
    try {
      const r = await P.Filesystem.readdir({ path, directory: 'DATA' });
      for (const f of r.files) {
        if (f.type === 'directory') { const x = await dirSize(path + '/' + f.name); files += x.files; bytes += x.bytes; } else { files++; bytes += f.size || 0; }
      }
    } catch { /* none */ }
    return { files, bytes };
  }
  window.MennaAudio = { audioUrls, audioLocal, audioSave, dirSize, reciter };

  function cleanQp(t) {
    return String(t || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }
  async function qpFetch(id, s, a) {
    try {
      const j = JSON.parse(await withMirrors([`https://api.quranpedia.net/v1/ayah/${s}/${a}/book/${id}`], 30000));
      const content = (Array.isArray(j.content) ? j.content : []).map((c) => ({ text: cleanQp(c.text), part: c.part, page: c.page })).filter((c) => c.text);
      return { content };
    } catch (e) { if (e.status === 404) return { content: [] }; throw e; }
  }
  function cleanImlai(t) {
    return String(t || '').replace(/َٰ/g, 'َ').replace(/ٰ/g, 'َ').replace(/[ۖ-ۜ۞۩۝]/g, '').replace(/\s+/g, ' ').trim();
  }
  const qpJobs = new Map();

  // ---------------- saving a file and sharing it
  async function saveText(name, text) {
    const safe = name.replace(/[\\/:*?"<>|]/g, '_');
    if (P.Filesystem) {
      try {
        const r = await P.Filesystem.writeFile({ path: 'المنة/' + safe, data: '﻿' + text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
        if (P.Share) { try { await P.Share.share({ title: name, url: r.uri, dialogTitle: 'مشاركة الملف أو حفظه' }); } catch { /* closed */ } }
        return 'المستندات/المنة/' + safe;
      } catch {
        const r = await P.Filesystem.writeFile({ path: safe, data: '﻿' + text, directory: 'CACHE', encoding: 'utf8' });
        if (P.Share) await P.Share.share({ title: name, url: r.uri, dialogTitle: 'حفظ الملف أو مشاركته' });
        return safe;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' }));
    a.download = safe; document.body.appendChild(a); a.click(); a.remove();
    return safe;
  }

  window.api = {
    // على الهاتف يفك أندرويد ضغط ملفات .gz عند البناء ويحذف الامتداد، فنجرب الاسمين
    data: async (rel) => {
      rel = rel.replace(/^\/+/, '');
      const names = rel.endsWith('.gz') ? [rel.slice(0, -3), rel] : [rel];
      for (const n of names) {
        let r;
        try { r = await fetch('data/' + n); } catch { continue; }
        if (!r.ok) continue;
        return gunzipBytes(await r.arrayBuffer());
      }
      return null;
    },
    settings: async () => { try { return JSON.parse(localStorage.getItem(SKEY()) || '{}'); } catch { return {}; } },
    saveSettings: async (o) => { localStorage.setItem(SKEY(), JSON.stringify(o)); return true; },
    books: bookList,
    bookPart: async (key, part) => unpack(await idb.get('parts', key + '/' + part)),
    removeBook: async (key) => { await idb.delRange('parts', prefix(key + '/')); await idb.del('manifests', key); return true; },
    downloadBook: async (spec) => {
      if (jobs.has(spec.key)) return 'running';
      const job = { cancel: false }; jobs.set(spec.key, job);
      const want = spec.fetch || spec.parts;
      const have = new Set(await idb.keys('parts', prefix(spec.key + '/')));
      const todo = want.filter((p) => !have.has(spec.key + '/' + p));
      let done = want.length - todo.length; const failed = [];
      const send = (m) => emit({ key: spec.key, ...m });
      send({ done, total: want.length });
      async function worker() {
        while (todo.length && !job.cancel) {
          const part = todo.shift();
          try {
            const txt = await withMirrors(spec.urls[part]);
            JSON.parse(txt);
            await idb.put('parts', spec.key + '/' + part, await gzipText(txt));
            done++; send({ done, total: want.length });
          } catch { failed.push(part); }
        }
      }
      await Promise.all([worker(), worker(), worker()]);
      jobs.delete(spec.key);
      const now = new Set(await idb.keys('parts', prefix(spec.key + '/')));
      const complete = spec.parts.every((p) => now.has(spec.key + '/' + p));
      await idb.put('manifests', spec.key, { key: spec.key, title: spec.title, kind: spec.kind, total: spec.parts.length, complete, meta: spec.meta || {}, at: new Date().toISOString() });
      const all = !job.cancel && failed.length === 0;
      send({ done, total: want.length, finished: true, complete: all, failed: failed.length, cancelled: job.cancel });
      return all ? 'ok' : (job.cancel ? 'cancelled' : 'partial');
    },
    cancelBook: async (key) => { const j = jobs.get(key) || qpJobs.get(key); if (j) j.cancel = true; return true; },
    onProgress: (fn) => listeners.push(fn),
    netJson: (urls) => withMirrors(Array.isArray(urls) ? urls : [urls], 60000),
    saveText,
    openExternal: async (url) => { if (/^https:\/\//.test(url)) window.open(url, '_system'); return true; },
    info: async () => ({ version: VERSION, userData: 'ذاكرة التطبيق على الهاتف' }),
    qpAyah: async (id, s, a, offlineOnly) => {
      const k = `${+id}/${+s}/${+a}`;
      const v = await idb.get('qp', k);
      if (v) return v;
      if (offlineOnly) return null;
      const txt = JSON.stringify(await qpFetch(+id, +s, +a));
      await idb.put('qp', k, txt);
      return txt;
    },
    qpSurah: async (id, s, ayahs) => {
      const key = 'qp' + id;
      if (qpJobs.has(key)) return 'running';
      const job = { cancel: false }; qpJobs.set(key, job);
      const have = new Set(await idb.keys('qp', prefix(`${+id}/${+s}/`)));
      const todo = []; for (let a = 1; a <= ayahs; a++) if (!have.has(`${+id}/${+s}/${a}`)) todo.push(a);
      let done = ayahs - todo.length, failed = 0;
      const send = (m) => emit({ key, ...m });
      send({ done, total: ayahs });
      async function worker() {
        while (todo.length && !job.cancel) {
          const a = todo.shift();
          try { await idb.put('qp', `${+id}/${+s}/${a}`, JSON.stringify(await qpFetch(id, s, a))); done++; send({ done, total: ayahs }); } catch { failed++; }
        }
      }
      await Promise.all([worker(), worker(), worker()]);
      qpJobs.delete(key);
      send({ done, total: ayahs, finished: true, complete: !job.cancel && !failed, failed, cancelled: job.cancel });
      return failed ? 'partial' : 'ok';
    },
    qpCancel: async (id) => { const j = qpJobs.get('qp' + id); if (j) j.cancel = true; return true; },
    qpCount: async (id) => idb.count('qp', prefix(`${+id}/`)),
    qpRemove: async (id) => { await idb.delRange('qp', prefix(`${+id}/`)); return true; },
    // On the phone the recitation is returned as an address the player can open directly
    audioAyah: async (s, a, g) => {
      const local = await audioLocal(s, a);
      if (local) return local;
      const st = JSON.parse(localStorage.getItem(SKEY()) || '{}');
      if (st.saveAudio !== false && navigator.onLine) { try { return await audioSave(s, a, g); } catch { /* stream instead */ } }
      return audioUrls(s, a, g)[0];
    },
    audioSize: async () => (P.Filesystem ? dirSize('audio') : { files: 0, bytes: 0 }),
    audioClear: async () => { if (P.Filesystem) { try { await P.Filesystem.rmdir({ path: 'audio', directory: 'DATA', recursive: true }); } catch { /* none */ } } return true; },
    imlai: async (allowNet) => {
      const v = await idb.get('kv', 'imlai');
      if (v) return unpack(v);
      if (!allowNet) return null;
      const j = JSON.parse(await withMirrors([
        'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quransimple.min.json',
        'https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-quransimple.min.json',
        'https://fastly.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quransimple.min.json'], 180000));
      const list = Array.isArray(j) ? j : (j.quran || j.chapter || []);
      const out = {}; let n = 0;
      for (const x of list) {
        const s = parseInt(x.chapter, 10), a = parseInt(x.verse, 10);
        if (!s || !a) continue;
        (out[s] = out[s] || [])[a - 1] = cleanImlai(x.text); n++;
      }
      if (n !== 6236 || Object.keys(out).length !== 114) throw new Error('incomplete text');
      const txt = JSON.stringify(out);
      await idb.put('kv', 'imlai', await gzipText(txt));
      return txt;
    },
  };
  window.MennaEnv = { VERSION, native, P, profile, SKEY, gzipText, unpack };
})();
