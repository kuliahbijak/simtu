/* =====================================================================
   SIM TATA USAHA — core.js
   Fondasi SPA: penyimpanan per pengguna, klien API (timeout, retry,
   idempotensi reqId), SWR berbatas kesegaran, router hash, utilitas UI
   (toast, modal, laci geser, popover), format tanggal/angka, unggah &
   unduh berkas, pemuat pustaka malas.
   ===================================================================== */
'use strict';
const CFG = window.SIMTU_CONFIG || {};
const API_URL = String(CFG.API_URL || '').trim();
const API_SIAP = /^https:\/\/script\.google(usercontent)?\.com\/.+\/exec/.test(API_URL) && !/GANTI|XXXX/i.test(API_URL);
const LS = 'simtu:v1:';
const APP_MULAI = Date.now();

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function ikon(n, cls) {
  const b = (window.ICONS || {})[n];
  if (!b) { if (window.console) console.warn('Ikon hilang:', n); return ''; }
  return '<svg class="i ' + (cls || '') + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + b + '</svg>';
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Jalankan saat browser senggang (maks. tunda ms) */
function saatSenggang(fn, ms) { if (window.requestIdleCallback) return requestIdleCallback(() => fn(), { timeout: ms || 2000 }); return setTimeout(fn, ms || 1); }
function debounce(fn, ms) { let t; return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(() => fn.apply(s, a), ms); }; }
function uid() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, ''); }
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }

/* ---------------------------------------------------------------------
 * Status aplikasi
 * ------------------------------------------------------------------- */
const S = {
  token: '', me: null, boot: null, ingat: false, darurat: false,
  modul: {}, ref: {}, setting: {}, sinyal: { lonceng: 0, menunggu: 0, ditolakSaya: 0 },
  publik: null, tpl: null
};
function isAdmin() { return S.me && S.me.peran === 'ADMIN'; }
function punyaIzin(iz) { return !!S.me && (S.me.peran === 'ADMIN' || (S.me.izin || []).indexOf(iz) >= 0); }
function modulBoleh(k) { const m = S.modul[k]; return !!m && punyaIzin(m.izin); }

/* ---------------------------------------------------------------------
 * Penyimpanan: token & cache data mengikuti pilihan "Ingat saya".
 * Tanpa "Ingat saya" → sessionStorage (hilang saat tab ditutup; aman
 * untuk komputer bersama). Cache diberi awalan per pengguna.
 * ------------------------------------------------------------------- */
function wadah() { try { return S.ingat ? localStorage : sessionStorage; } catch (e) { return null; } }
const Store = {
  _k(k) { return LS + 'u:' + (S.me ? S.me.id : 'anon') + ':' + k; },
  get(k, d) { try { const w = wadah(); const v = w && w.getItem(this._k(k)); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) {
    const w = wadah(); if (!w) return;
    const s = JSON.stringify(v);
    try { w.setItem(this._k(k), s); }
    catch (e) {
      // penuh → buang cache daftar lama milik pengguna ini lalu coba sekali lagi
      try { Object.keys(w).filter(x => x.indexOf(this._k('list:')) === 0 || x.indexOf(LS + 'u:') === 0 && x.indexOf(this._k('')) !== 0).forEach(x => w.removeItem(x)); w.setItem(this._k(k), s); } catch (e2) { /* jalan tanpa cache */ }
    }
  },
  del(k) { try { const w = wadah(); w && w.removeItem(this._k(k)); } catch (e) { /* abaikan */ } },
  hapusAwalan(p) { try { const w = wadah(); if (!w) return; const a = this._k(p); Object.keys(w).filter(x => x.indexOf(a) === 0).forEach(x => w.removeItem(x)); } catch (e) { /* abaikan */ } },
  bersihkanPengguna() { [localStorage, sessionStorage].forEach(w => { try { Object.keys(w).filter(x => x.indexOf(LS + 'u:') === 0).forEach(x => w.removeItem(x)); } catch (e) { /* abaikan */ } }); }
};
const Pref = {   // preferensi ringan per perangkat (bukan data)
  get(k, d) { try { const v = localStorage.getItem(LS + 'p:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(LS + 'p:' + k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
};
function simpanSesi() {
  try {
    const data = JSON.stringify({ t: S.token, me: S.me, ingat: S.ingat });
    (S.ingat ? localStorage : sessionStorage).setItem(LS + 'sesi', data);
    (S.ingat ? sessionStorage : localStorage).removeItem(LS + 'sesi');
  } catch (e) { /* abaikan */ }
}
function bacaSesi() {
  try {
    const raw = sessionStorage.getItem(LS + 'sesi') || localStorage.getItem(LS + 'sesi');
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !o.t) return null;
    // token kedaluwarsa (12 jam) → buang
    try { const p = JSON.parse(atob(o.t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); if (p.x && p.x < Date.now()) { hapusSesi(); return null; } } catch (e) { /* abaikan */ }
    return o;
  } catch (e) { return null; }
}
function hapusSesi() { try { localStorage.removeItem(LS + 'sesi'); sessionStorage.removeItem(LS + 'sesi'); } catch (e) { /* abaikan */ } }

/* ---------------------------------------------------------------------
 * Pengukur kinerja: Perf.table() di console
 * ------------------------------------------------------------------- */
const Perf = {
  rows: [],
  add(action, total, server) { this.rows.push({ action, total, server: server == null ? null : server, net: server == null ? null : total - server, at: new Date().toLocaleTimeString() }); if (this.rows.length > 200) this.rows.shift(); },
  table() { console.table(this.rows.slice(-40)); }
};
window.Perf = Perf;

/* ---------------------------------------------------------------------
 * Klien API — POST text/plain (tanpa preflight CORS), timeout, retry,
 * reqId untuk aksi tulis (aman dikirim ulang), tunggu online.
 * ------------------------------------------------------------------- */
const AKSI_BACA = /^(auth\.config|me|boot|sinyal|batch|data\.(list|get|sampah|eksporJson)|gtk\.pilihan|cuti\.sisa|verif\.antrean|dash\.\w+|cari|laporan\.rekap|user\.list|ref\.list|audit\.list|lonceng\.list|set\.get|rahasia\.status|sistem\.status|berkas\.(ambil|periksa)|drive\.info|doc\.(jenis|skema|pratinjau|list|get|unduh)|tpl\.(list|unduh|kamus)|pejabat\.list|nomor\.(list|pratinjau)|notif\.(config|queue)|wa\.(device|audience|blastList)|crm\.(list|stats|detail|duplikat|export)|impor\.(log|sumber)|backup\.(list|isi))$/;
let _onSesiHabis = null, _onWajibGanti = null;
async function apiOnce(action, data, timeout, reqId) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: S.token || '', reqId: reqId || '', data: data || {}, client: { ua: navigator.userAgent.slice(0, 80), lebar: innerWidth, url: location.origin + location.pathname } })
    });
    const text = await res.text();
    try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 200, message: 'Server membalas tidak terduga (HTTP ' + res.status + '). Coba lagi.' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err && err.name === 'AbortError' ? 'Server terlalu lama merespons. Periksa koneksi lalu coba lagi.' : 'Koneksi terputus. Periksa internet Anda.' };
  } finally { clearTimeout(timer); }
}
async function api(action, data, opt) {
  opt = opt || {};
  if (!API_SIAP) return { success: false, message: 'Alamat API belum diatur di js/config.js.' };
  const baca = AKSI_BACA.test(action);
  const reqId = baca ? '' : (opt.reqId || uid());
  const coba = opt.tries || (baca ? 3 : 3);
  let res;
  for (let i = 0; i < coba; i++) {
    if (i) { await sleep(1200 * i); if (navigator.onLine === false) await tungguOnline(20000); }
    res = await apiOnce(action, data, opt.timeout || (baca ? (i ? 45000 : 30000) : 120000), reqId);
    if (res.success || !res.retryable) break;
  }
  if (!res.success && res.code === 401 && S.token && !/^auth\./.test(action)) { _onSesiHabis && _onSesiHabis(res.message); }
  if (!res.success && res.code === 428 && _onWajibGanti) _onWajibGanti();
  return res;
}
function tungguOnline(ms) { return new Promise(r => { if (navigator.onLine !== false) return r(); const t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); }); }
function hangatkan(scope) { if (!API_SIAP) return; fetch(API_URL + '?w=' + (scope || 'boot') + '&t=' + Date.now(), { method: 'GET', mode: 'no-cors', cache: 'no-store' }).catch(() => {}); }
async function apiGet(params) {
  if (!API_SIAP) return { success: false, message: 'Alamat API belum diatur.' };
  const q = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  for (let i = 0; i < 3; i++) {
    try {
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 30000);
      const r = await fetch(API_URL + '?' + q, { redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      return JSON.parse(await r.text());
    } catch (e) { await sleep(1000 * (i + 1)); }
  }
  return { success: false, message: 'Tidak dapat menghubungi server.' };
}

/** stale-while-revalidate: render dari cache seketika, segarkan bila basi.
 *  render(data, dariCache) dipanggil ≤ 2× dan hanya bila data berubah. */
async function swr(key, action, payload, render, opt) {
  opt = opt || {};
  const fresh = opt.fresh == null ? 60000 : opt.fresh;
  const c = Store.get(key, null);
  if (c) { try { render(c.data, true); } catch (e) { console.error(e); } }
  // cache dari sesi browser sebelumnya selalu diperiksa ulang sekali (data bisa diubah pengguna lain)
  if (c && !opt.force && Date.now() - c.t < fresh && c.t >= APP_MULAI) return { success: true, data: c.data, cached: true };
  const res = await api(action, payload);
  if (res.success) {
    const h = hashStr(JSON.stringify(res.data));
    Store.set(key, { t: Date.now(), h, data: res.data });
    if (!c || c.h !== h) { try { render(res.data, false); } catch (e) { console.error(e); } }
  } else if (!c && opt.onError) opt.onError(res);
  else if (c && !res.success && res.network) toast('Menampilkan data tersimpan — ' + res.message, 'warn');
  return res;
}
function invalidasi() { Array.from(arguments).forEach(p => Store.hapusAwalan(p)); }

/* ---------------------------------------------------------------------
 * Router hash: #/nama/arg1/arg2?kunci=nilai
 * Halaman dibuat sekali, lalu disembunyikan/ditampilkan.
 * ------------------------------------------------------------------- */
const Pages = {};
const Router = { cur: null, el: null, params: {}, args: [] };
function daftarHalaman(nama, def) { Pages[nama] = Object.assign({ auth: 'user' }, def); }
function urai(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  const [jalur, qs] = raw.split('?');
  const seg = jalur.split('/').filter(String).map(decodeURIComponent);
  const params = {};
  (qs || '').split('&').filter(String).forEach(p => { const [k, v] = p.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
  return { seg, params };
}
function ke(path, ganti) {
  const h = '#/' + String(path).replace(/^#?\/?/, '');
  if (location.hash === h) return rute();
  if (ganti) { history.replaceState(null, '', h); rute(); } else location.hash = h;
}
function setQuery(params, ganti) {
  const { seg } = urai(location.hash);
  const qs = Object.keys(params).filter(k => params[k] !== '' && params[k] != null).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  const h = '#/' + seg.map(encodeURIComponent).join('/') + (qs ? '?' + qs : '');
  if (ganti !== false) history.replaceState(null, '', h); else location.hash = h;
}
let _ruteHook = null;
function rute() {
  const { seg, params } = urai(location.hash);
  let nama = seg[0] || '';
  // nama halaman 2 tingkat (mis. dokumen/riwayat)
  if (seg.length > 1 && Pages[seg[0] + '/' + seg[1]]) nama = seg[0] + '/' + seg[1];
  const sisa = seg.slice(nama.split('/').length);
  if (_ruteHook && _ruteHook(nama, sisa, params) === false) return;
}

/* ---------------------------------------------------------------------
 * Format
 * ------------------------------------------------------------------- */
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function tglP(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
function fmtTgl(s, panjang) { const p = tglP(s); if (!p) return s ? String(s) : '–'; return p.d + ' ' + (panjang ? BULAN : BLN)[p.m - 1] + ' ' + p.y; }
function fmtJam(s) { const m = String(s || '').match(/T(\d{2}):(\d{2})/); return m ? m[1] + '.' + m[2] : ''; }
function fmtWaktu(s) { if (!s) return '–'; return fmtTgl(s) + (fmtJam(s) ? ' · ' + fmtJam(s) : ''); }
function msIso(s) { if (!s) return 0; const t = Date.parse(String(s).length === 19 ? s + '+08:00' : s); return isNaN(t) ? 0 : t; }
function relatif(s) {
  const t = msIso(s); if (!t) return '–';
  const d = (Date.now() - t) / 1000;
  if (d < 60) return 'baru saja';
  if (d < 3600) return Math.floor(d / 60) + ' mnt lalu';
  if (d < 86400) return Math.floor(d / 3600) + ' jam lalu';
  if (d < 172800) return 'kemarin, ' + fmtJam(s);
  if (d < 604800) return Math.floor(d / 86400) + ' hari lalu';
  return fmtTgl(s);
}
function angka(n) { return Number(n || 0).toLocaleString('id-ID'); }
function bytes(n) { n = Number(n || 0); if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(0) + ' KB'; if (n < 1073741824) return (n / 1048576).toFixed(1).replace('.', ',') + ' MB'; return (n / 1073741824).toFixed(2).replace('.', ',') + ' GB'; }
function hariIni() { return (S.boot && S.boot.hariIni) || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
function tglTambah(s, n) { const p = tglP(s); const d = new Date(Date.UTC(p.y, p.m - 1, p.d + n)); return d.toISOString().slice(0, 10); }
function inisial(n) { const p = String(n || '').replace(/,.*$/, '').replace(/\b(Drs?|Dra|Hj?|Ir|Prof)\.\s*/gi, '').trim().split(/\s+/).filter(String); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
const ST_LABEL = { MENUNGGU: 'Menunggu Verifikasi', TERVERIFIKASI: 'Terverifikasi', DITOLAK: 'Ditolak' };
function chipStatus(s, pendek) {
  const c = s === 'TERVERIFIKASI' ? 'chip-ok' : s === 'DITOLAK' ? 'chip-no' : s === 'MENUNGGU' ? 'chip-wait' : 'chip-muted';
  const t = pendek ? ({ MENUNGGU: 'Menunggu', TERVERIFIKASI: 'Terverifikasi', DITOLAK: 'Ditolak' }[s] || s) : (ST_LABEL[s] || s || '–');
  return '<span class="chip titik ' + c + '">' + esc(t) + '</span>';
}
function refNama(jenis, kode) { const r = (S.ref[jenis] || []).find(x => x.kode === kode); return r ? r.nama : (kode || ''); }

/* ---------------------------------------------------------------------
 * Toast, modal, konfirmasi, laci geser, popover
 * ------------------------------------------------------------------- */
function toast(pesan, jenis, judul) {
  let w = $('.toasts'); if (!w) { w = document.createElement('div'); w.className = 'toasts'; w.setAttribute('role', 'status'); w.setAttribute('aria-live', 'polite'); document.body.appendChild(w); }
  const el = document.createElement('div');
  el.className = 'toast ' + (jenis === 'err' || jenis === 'error' ? 'err' : jenis === 'warn' ? 'warn' : '');
  const ic = jenis === 'err' || jenis === 'error' ? 'circle-x' : jenis === 'warn' ? 'triangle-alert' : 'circle-check';
  el.innerHTML = '<span class="tic">' + ikon(ic) + '</span><div class="tx">' + (judul ? '<b>' + esc(judul) + '</b>' : '') + esc(pesan) + '</div><button aria-label="Tutup">' + ikon('x', 'sm') + '</button>';
  el.querySelector('button').onclick = () => el.remove();
  w.appendChild(el);
  setTimeout(() => el.remove(), jenis === 'err' || jenis === 'error' ? 7000 : 4200);
  while (w.children.length > 4) w.firstChild.remove();
}
function galat(res, judul) { toast((res && res.message) || 'Terjadi kesalahan.', 'err', judul); }

const _lapisan = [];
function tutupTeratas() { const l = _lapisan[_lapisan.length - 1]; if (l) l.tutup(); }
addEventListener('keydown', e => { if (e.key === 'Escape' && _lapisan.length) { const l = _lapisan[_lapisan.length - 1]; if (!l.kunci) { e.preventDefault(); l.tutup(); } } });

/** modal({judul, isi(html), ikon, ikonCls, ukuran:'lg'|'xl', tombol:[{teks, cls, aksi(tutup, el) → bool|Promise}], onBuka(el), kunci}) */
function modal(o) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = '<div class="scrim on"></div><div class="modal ' + (o.ukuran || '') + '" role="dialog" aria-modal="true">' +
    (o.judul ? '<div class="modal-h">' + (o.ikon ? '<div class="modal-ic ' + (o.ikonCls || '') + '">' + ikon(o.ikon) + '</div>' : '') + '<div class="grow"><div class="mt">' + esc(o.judul) + '</div>' + (o.sub ? '<div class="small muted mt4">' + esc(o.sub) + '</div>' : '') + '</div><button class="icon-btn" data-x aria-label="Tutup">' + ikon('x') + '</button></div>' : '') +
    '<div class="modal-b">' + (o.isi || '') + '</div>' + (o.tombol && o.tombol.length ? '<div class="modal-f"></div>' : '') + '</div>';
  wrap.querySelector('.scrim').style.cssText = 'position:absolute;z-index:0';
  document.body.appendChild(wrap);
  document.body.style.overflow = 'hidden';
  const fokusLama = document.activeElement;
  const lap = { kunci: !!o.kunci, tutup: () => { wrap.remove(); const i = _lapisan.indexOf(lap); if (i >= 0) _lapisan.splice(i, 1); if (!_lapisan.length) document.body.style.overflow = ''; o.onTutup && o.onTutup(); try { fokusLama && fokusLama.focus(); } catch (e) { /* abaikan */ } } };
  _lapisan.push(lap);
  const tutup = lap.tutup;
  wrap.querySelector('.scrim').onclick = () => { if (!o.kunci) tutup(); };
  const x = wrap.querySelector('[data-x]'); if (x) x.onclick = tutup;
  const f = wrap.querySelector('.modal-f');
  (o.tombol || []).forEach(t => {
    const b = document.createElement('button');
    b.className = 'btn ' + (t.cls || '');
    b.innerHTML = (t.ikon ? ikon(t.ikon) : '') + esc(t.teks);
    b.onclick = async () => {
      if (!t.aksi) return tutup();
      b.classList.add('loading');
      try { const r = await t.aksi(tutup, wrap, b); if (r !== false) tutup(); } finally { b.classList.remove('loading'); }
    };
    f.appendChild(b);
  });
  o.onBuka && o.onBuka(wrap, tutup);
  const fokus = wrap.querySelector('[autofocus], input, select, textarea, .modal-f .btn-primary, .modal-f .btn');
  if (fokus) setTimeout(() => fokus.focus(), 30);
  return { el: wrap, tutup };
}
/** konfirmasi({judul, pesan(html), ok, bahaya, ketik:'HAPUS', alasan:{label, min}}) → Promise<false|{alasan}> */
function konfirmasi(o) {
  return new Promise(res => {
    let hasil = false;
    const isi = '<div>' + (o.pesan || '') + '</div>' +
      (o.alasan ? '<div class="field mt16"><label>' + esc(o.alasan.label || 'Alasan') + ' <span class="req">*</span></label><textarea data-alasan rows="3" placeholder="' + esc(o.alasan.ph || '') + '"></textarea><div class="ferr" hidden></div></div>' : '') +
      (o.ketik ? '<div class="field mt16"><label>Ketik <b class="mono">' + esc(o.ketik) + '</b> untuk melanjutkan</label><input data-ketik autocomplete="off"></div>' : '');
    modal({
      judul: o.judul, ikon: o.ikon || (o.bahaya ? 'triangle-alert' : 'circle-help'), ikonCls: o.bahaya ? 'no' : '', isi,
      onTutup: () => res(hasil),
      tombol: [{ teks: o.batal || 'Batal' }, {
        teks: o.ok || 'Lanjutkan', cls: o.bahaya ? 'btn-danger' : 'btn-primary', aksi: (t, el) => {
          const a = el.querySelector('[data-alasan]'), k = el.querySelector('[data-ketik]');
          if (a && a.value.trim().length < (o.alasan.min || 5)) { const e = a.nextElementSibling; e.hidden = false; e.textContent = 'Minimal ' + (o.alasan.min || 5) + ' karakter.'; a.focus(); return false; }
          if (k && k.value.trim() !== o.ketik) { k.focus(); k.classList.add('err'); return false; }
          hasil = { alasan: a ? a.value.trim() : '' }; return true;
        }
      }]
    });
  });
}

/** laci({judul, sub, isi, kaki, lebar, onTutup}) → {el, body, foot, tutup, setJudul} */
function laci(o) {
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const d = document.createElement('aside'); d.className = 'drawer' + (o.lebar ? ' wide' : ''); d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = '<div class="dr-h"><div class="grow"><div class="dt"></div><div class="ds"></div></div><div class="flex gap4" data-hact></div><button class="icon-btn" data-x aria-label="Tutup">' + ikon('x') + '</button></div><div class="dr-b"></div><div class="dr-f" hidden></div>';
  document.body.appendChild(scrim); document.body.appendChild(d);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { scrim.classList.add('on'); d.classList.add('on'); });
  const api = {
    el: d, body: d.querySelector('.dr-b'), foot: d.querySelector('.dr-f'), hact: d.querySelector('[data-hact]'),
    setJudul(j, s) { d.querySelector('.dt').innerHTML = j; d.querySelector('.ds').innerHTML = s || ''; },
    setKaki(html) { const f = d.querySelector('.dr-f'); f.innerHTML = html || ''; f.hidden = !html; },
    tutup(lewati) {
      if (!lewati && o.cegahTutup && o.cegahTutup() === false) return;
      scrim.classList.remove('on'); d.classList.remove('on');
      setTimeout(() => { scrim.remove(); d.remove(); }, 220);
      const i = _lapisan.indexOf(lap); if (i >= 0) _lapisan.splice(i, 1);
      if (!_lapisan.length) document.body.style.overflow = '';
      o.onTutup && o.onTutup();
    }
  };
  const lap = { tutup: () => api.tutup() };
  _lapisan.push(lap);
  scrim.onclick = () => api.tutup();
  d.querySelector('[data-x]').onclick = () => api.tutup();
  api.setJudul(o.judul || '', o.sub || '');
  if (o.isi != null) api.body.innerHTML = o.isi;
  if (o.kaki) api.setKaki(o.kaki);
  return api;
}

let _pop = null, _popJangkar = null, _popPos = null, _popLuar = null;
function tutupPop() {
  if (_popLuar) { document.removeEventListener('mousedown', _popLuar); _popLuar = null; }
  if (_pop) { _pop.remove(); _pop = null; _popJangkar = null; }
}
/** popover di bawah elemen jangkar */
function popover(jangkar, html, opsi) {
  tutupPop();
  const p = document.createElement('div');
  p.className = 'pop ' + ((opsi && opsi.cls) || '');
  p.innerHTML = html;
  document.body.appendChild(p);
  const r = jangkar.getBoundingClientRect();
  const w = p.offsetWidth, h = p.offsetHeight;
  let left = (opsi && opsi.kiri) ? r.left : r.right - w;
  left = Math.max(8, Math.min(left, innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h > innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
  p.style.left = left + 'px'; p.style.top = top + 'px';
  _pop = p; _popJangkar = jangkar; _popPos = r.top + ',' + r.left;
  setTimeout(() => {
    if (_pop !== p) return;
    _popLuar = e => { if (!p.contains(e.target) && e.target !== jangkar && !jangkar.contains(e.target)) tutupPop(); };
    document.addEventListener('mousedown', _popLuar);
  }, 0);
  p.addEventListener('click', e => { if (e.target.closest('[data-tutup]')) tutupPop(); });
  return p;
}
addEventListener('resize', tutupPop);
// tutup popover bila halaman digulir sehingga jangkarnya bergeser (bukan saat menggulir isi popover)
addEventListener('scroll', e => {
  if (!_pop || (e.target && e.target.nodeType === 1 && _pop.contains(e.target))) return;
  const r = _popJangkar && _popJangkar.getBoundingClientRect();
  if (!r || Math.abs(r.top - Number(_popPos.split(',')[0])) > 4) tutupPop();
}, true);

/* ---------------------------------------------------------------------
 * Tombol sibuk
 * ------------------------------------------------------------------- */
async function sibuk(btn, fn) {
  if (!btn) return fn();
  if (btn.classList.contains('loading')) return;
  const html = btn.innerHTML;
  btn.classList.add('loading');
  const ic = btn.querySelector('svg');
  if (ic) ic.outerHTML = ikon('loader-circle', 'spin');
  else btn.insertAdjacentHTML('afterbegin', ikon('loader-circle', 'spin'));
  try { return await fn(); } finally { btn.classList.remove('loading'); btn.innerHTML = html; }
}

/* ---------------------------------------------------------------------
 * Berkas: baca, unggah (sekali/bertahap), unduh, blob
 * ------------------------------------------------------------------- */
function bacaBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(new Error('Berkas tidak bisa dibaca.')); r.readAsDataURL(file); });
}
function b64keBlob(b64, mime) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime || 'application/octet-stream' }); }
function unduhBlob(blob, nama) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nama || 'berkas'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function unduhB64(nama, mime, b64) { unduhBlob(b64keBlob(b64, mime), nama); }
const MAKS_BERKAS = 10 * 1024 * 1024;
/** Unggah berkas → {id, nama, mime, ukuran, hash}. Besar → dipotong ±2,2 MB. */
async function unggahBerkas(modul, file, onProg) {
  const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (file.size > MAKS_BERKAS) throw new Error('Ukuran ' + file.name + ' melebihi 10 MB.');
  if (['application/pdf', 'image/jpeg'].indexOf(mime) < 0) throw new Error(file.name + ': hanya PDF atau JPG.');
  const b64 = await bacaBase64(file);
  onProg && onProg(10);
  if (b64.length <= 4 * 1024 * 1024) {
    const r = await api('berkas.unggah', { modul, nama: file.name, mime, base64: b64 });
    if (!r.success) throw new Error(r.message);
    onProg && onProg(100);
    return r.data;
  }
  const uk = 2.2 * 1024 * 1024 - (2.2 * 1024 * 1024) % 4, n = Math.ceil(b64.length / uk);
  const m = await api('berkas.mulai', { modul, nama: file.name, mime, ukuran: file.size, potongan: n });
  if (!m.success) throw new Error(m.message);
  for (let i = 0; i < n; i++) {
    const r = await api('berkas.potong', { uploadId: m.data.uploadId, ke: i, base64: b64.slice(i * uk, (i + 1) * uk) });
    if (!r.success) throw new Error(r.message);
    onProg && onProg(10 + Math.round((i + 1) / n * 80));
  }
  const s = await api('berkas.selesai', { uploadId: m.data.uploadId });
  if (!s.success) throw new Error(s.message);
  onProg && onProg(100);
  return s.data;
}
/** Ambil isi berkas (berpotongan) → Blob; cache di memori sesi saja */
const _blobMemo = new Map();
async function ambilBerkas(id, mode) {
  const k = id + ':' + (mode || 'lihat');
  if (_blobMemo.has(k)) return _blobMemo.get(k);
  const bagian = []; let info = null;
  for (let i = 0; ; i++) {
    const r = await api('berkas.ambil', { id, bagian: i, mode: mode || 'lihat' });
    if (!r.success) throw new Error(r.message);
    info = r.data; bagian.push(b64keBlob(r.data.base64, r.data.mime));
    if (i + 1 >= r.data.total) break;
  }
  const hasil = { blob: new Blob(bagian, { type: info.mime }), nama: info.nama, mime: info.mime, hash: info.hash, ukuran: info.ukuran };
  if (_blobMemo.size > 30) _blobMemo.delete(_blobMemo.keys().next().value);
  _blobMemo.set(k, hasil);
  return hasil;
}

/* ---------------------------------------------------------------------
 * Pemuat pustaka malas (dengan cadangan CDN)
 * ------------------------------------------------------------------- */
const _skrip = {};
function muatSkrip(urls) {
  urls = [].concat(urls);
  const kunci = urls[0];
  if (_skrip[kunci]) return _skrip[kunci];
  _skrip[kunci] = new Promise((res, rej) => {
    let i = 0;
    const coba = () => {
      if (i >= urls.length) { delete _skrip[kunci]; return rej(new Error('Pustaka gagal dimuat. Periksa koneksi internet.')); }
      const s = document.createElement('script'); s.src = urls[i++]; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = () => res(); s.onerror = () => { s.remove(); coba(); };
      document.head.appendChild(s);
    };
    coba();
  });
  return _skrip[kunci];
}
const LIB = {
  xlsx: ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'],
  jspdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'],
  autotable: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'],
  pdfjs: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'],
  pdfjsWorker: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
  gsi: ['https://accounts.google.com/gsi/client']
};
async function pakaiXlsx() { await muatSkrip(LIB.xlsx); return window.XLSX; }
async function pakaiPdf() { await muatSkrip(LIB.jspdf); await muatSkrip(LIB.autotable); return window.jspdf.jsPDF; }
async function pakaiPdfjs() {
  await muatSkrip(LIB.pdfjs);
  const lib = window.pdfjsLib;
  if (lib && !lib.GlobalWorkerOptions.workerSrc) {
    // worker dari CDN yang sama dengan pustaka utama
    const src = (document.querySelector('script[src*="pdf.min.js"]') || {}).src || LIB.pdfjsWorker[0];
    lib.GlobalWorkerOptions.workerSrc = src.replace('pdf.min.js', 'pdf.worker.min.js');
  }
  return lib;
}

/* ---------------------------------------------------------------------
 * Ekspor tabel → Excel / PDF (klien)
 * ------------------------------------------------------------------- */
async function eksporExcel(nama, judul, kolom, baris, info) {
  const X = await pakaiXlsx();
  const aoa = [[judul]].concat(info ? [[info]] : []).concat([[]], [kolom.map(k => k.l)]).concat(baris.map(r => kolom.map(k => { const v = typeof k.v === 'function' ? k.v(r) : r[k.k]; return v == null ? '' : String(v); })));
  const ws = X.utils.aoa_to_sheet(aoa);
  ws['!cols'] = kolom.map(k => ({ wch: k.w || Math.min(48, Math.max(10, k.l.length + 2)) }));
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, 'Data');
  X.writeFile(wb, nama.replace(/[^\w.-]+/g, '-') + '.xlsx');
}
async function eksporPdf(nama, judul, kolom, baris, info) {
  const jsPDF = await pakaiPdf();
  const doc = new jsPDF({ orientation: kolom.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const sek = (S.publik && S.publik.namaSekolah) || CFG.NAMA_SEKOLAH || '';
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(sek.toUpperCase(), 40, 40);
  doc.setFontSize(11); doc.text(judul, 40, 58);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(110);
  doc.text((info ? info + ' · ' : '') + 'Dicetak ' + fmtWaktu(new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 19)) + ' WITA oleh ' + (S.me ? S.me.nama : ''), 40, 72);
  doc.autoTable({
    startY: 84, head: [['No'].concat(kolom.map(k => k.l))],
    body: baris.map((r, i) => [String(i + 1)].concat(kolom.map(k => { const v = typeof k.v === 'function' ? k.v(r) : r[k.k]; return v == null ? '' : String(v); }))),
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' }, headStyles: { fillColor: [11, 79, 92], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] }, margin: { left: 40, right: 40 },
    didDrawPage: d => { doc.setFontSize(8); doc.setTextColor(150); doc.text('SIM Tata Usaha · halaman ' + doc.internal.getNumberOfPages(), 40, doc.internal.pageSize.getHeight() - 20); }
  });
  doc.save(nama.replace(/[^\w.-]+/g, '-') + '.pdf');
}

/* ---------------------------------------------------------------------
 * Grafik SVG ringan
 * ------------------------------------------------------------------- */
const WARNA = { or: '#F26522', teal: '#2B6673', tealD: '#0B4F5C', amber: '#FFB400', abu: '#D1D5DB', hijau: '#03C95A', merah: '#E70D0D' };
/** Batang berkelompok: label[], seri:[{nama, warna, data[]}] */
function grafikBatang(label, seri, opsi) {
  opsi = opsi || {};
  const W = 640, H = opsi.tinggi || 220, pl = 28, pr = 6, pt = 12, pb = 26;
  const maks = Math.max(1, ...seri.flatMap(s => s.data));
  const langkah = maks <= 5 ? 1 : Math.ceil(maks / 4 / (maks > 50 ? 10 : 1)) * (maks > 50 ? 10 : 1);
  const atas = Math.ceil(maks / langkah) * langkah;
  const gw = (W - pl - pr) / label.length, bw = Math.min(26, (gw * .62) / seri.length);
  let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opsi.aria || 'Grafik batang') + '">';
  for (let v = 0; v <= atas; v += langkah) { const y = pt + (H - pt - pb) * (1 - v / atas); s += '<line class="ax" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke-dasharray="' + (v ? '3 3' : '') + '"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + v + '</text>'; }
  label.forEach((l, i) => {
    const x0 = pl + gw * i + (gw - bw * seri.length - 3 * (seri.length - 1)) / 2;
    seri.forEach((sr, j) => {
      const v = sr.data[i] || 0, h = (H - pt - pb) * v / atas, x = x0 + j * (bw + 3), y = H - pb - h;
      s += '<rect x="' + x + '" y="' + (v ? y : H - pb - 4) + '" width="' + bw + '" height="' + (v ? h : 4) + '" rx="4" fill="' + (v ? sr.warna : '#EEF0F3') + '"><title>' + esc(sr.nama + ' · ' + l + ': ' + v) + '</title></rect>';
    });
    const sorot = opsi.sorot === i;
    s += '<text x="' + (pl + gw * i + gw / 2) + '" y="' + (H - 8) + '" text-anchor="middle"' + (sorot ? ' style="fill:#F26522;font-weight:800"' : '') + '>' + esc(l) + '</text>';
  });
  return s + '</svg>';
}
/** Garis: label[], seri:[{nama, warna, data[]}] */
function grafikGaris(label, seri, opsi) {
  opsi = opsi || {};
  const W = 640, H = opsi.tinggi || 220, pl = 28, pr = 10, pt = 14, pb = 26;
  const maks = Math.max(1, ...seri.flatMap(s => s.data));
  const atas = Math.max(4, Math.ceil(maks / 4) * 4), langkah = atas / 4;
  const x = i => pl + (W - pl - pr) * (label.length > 1 ? i / (label.length - 1) : .5);
  const y = v => pt + (H - pt - pb) * (1 - v / atas);
  let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opsi.aria || 'Grafik garis') + '">';
  for (let v = 0; v <= atas; v += langkah) s += '<line class="ax" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke-dasharray="' + (v ? '3 3' : '') + '"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v) + '</text>';
  label.forEach((l, i) => { s += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + '</text>'; });
  seri.forEach(sr => {
    const pts = sr.data.map((v, i) => x(i) + ',' + y(v || 0)).join(' ');
    if (opsi.area) s += '<polygon points="' + x(0) + ',' + y(0) + ' ' + pts + ' ' + x(sr.data.length - 1) + ',' + y(0) + '" fill="' + sr.warna + '" opacity=".08"/>';
    s += '<polyline points="' + pts + '" fill="none" stroke="' + sr.warna + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    sr.data.forEach((v, i) => { s += '<circle cx="' + x(i) + '" cy="' + y(v || 0) + '" r="3.5" fill="#fff" stroke="' + sr.warna + '" stroke-width="2"><title>' + esc(sr.nama + ' · ' + label[i] + ': ' + (v || 0)) + '</title></circle>'; });
  });
  return s + '</svg>';
}
/** Donat: data:[{n, warna}] */
function grafikDonat(data, ukuran, tengah, sub) {
  const r = 52, c = 2 * Math.PI * r, total = data.reduce((a, d) => a + d.n, 0) || 1;
  let off = 0, s = '<div class="ring" style="width:' + ukuran + 'px;height:' + ukuran + 'px"><svg viewBox="0 0 140 140" width="' + ukuran + '" height="' + ukuran + '" style="transform:rotate(-90deg)"><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="#EEF0F3" stroke-width="16"/>';
  data.forEach(d => { const p = d.n / total * c; if (d.n) s += '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + d.warna + '" stroke-width="16" stroke-dasharray="' + Math.max(0, p - 2) + ' ' + (c - Math.max(0, p - 2)) + '" stroke-dashoffset="' + (-off) + '"/>'; off += p; });
  return s + '</svg><div><div class="metric-n">' + esc(tengah) + '</div><div class="xs muted">' + esc(sub || '') + '</div></div></div>';
}
function cincin(persen, ukuran, warna, track) {
  const r = 30, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, persen || 0)) / 100 * c;
  return '<div class="ring" style="width:' + ukuran + 'px;height:' + ukuran + 'px"><svg viewBox="0 0 76 76" width="' + ukuran + '" height="' + ukuran + '" style="transform:rotate(-90deg)"><circle cx="38" cy="38" r="' + r + '" fill="none" stroke="' + (track || 'rgba(255,255,255,.18)') + '" stroke-width="7"/><circle cx="38" cy="38" r="' + r + '" fill="none" stroke="' + (warna || '#F26522') + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + p + ' ' + c + '"/></svg><div class="bb">' + (persen == null ? '–' : Math.round(persen) + '%') + '</div></div>';
}
function sparkline(data, warna) {
  const W = 300, H = 70, maks = Math.max(1, ...data);
  const pts = data.map((v, i) => (i / Math.max(1, data.length - 1) * W).toFixed(1) + ',' + (H - 4 - (H - 10) * v / maks).toFixed(1)).join(' ');
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="height:70px"><polygon points="0,' + H + ' ' + pts + ' ' + W + ',' + H + '" fill="' + (warna || WARNA.teal) + '" opacity=".14"/><polyline points="' + pts + '" fill="none" stroke="' + (warna || WARNA.tealD) + '" stroke-width="2.5" stroke-linejoin="round"/></svg>';
}

/* ---------------------------------------------------------------------
 * Validasi klien (cermin backend)
 * ------------------------------------------------------------------- */
const V = {
  tgl(s) { const p = tglP(s); if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(Date.UTC(p.y, p.m - 1, p.d)); return d.getUTCMonth() === p.m - 1 && p.y >= 1900 && p.y <= 2100; },
  hp(s) { return /^08\d{8,12}$/.test(hp08(s)); },
  email(s) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || '').trim()); },
  nisn(s) { return /^\d{10}$/.test(String(s || '')); },
  nip(s) { return /^(\d{16}|\d{18})$/.test(String(s || '')); },
  sandi(s) { return typeof s === 'string' && s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s); }
};
function hp08(v) { let s = String(v == null ? '' : v).trim().replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (!s) return ''; if (s.indexOf('62') === 0) s = '0' + s.slice(2); else if (s[0] === '8') s = '0' + s; return s; }
function salin(teks) {
  const ok = () => toast('Disalin ke papan klip.');
  if (navigator.clipboard && isSecureContext) return navigator.clipboard.writeText(teks).then(ok, () => fallback());
  fallback();
  function fallback() { const t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Salin manual: ' + teks, 'warn'); } t.remove(); }
}
