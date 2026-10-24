/* =====================================================================
   SIM TATA USAHA — ui.js
   Kerangka aplikasi (sidebar, topbar, lonceng, pencarian global),
   denyut sinyal, pembangun formulir dari metadata modul, pengunggah
   berkas, penampil berkas (PDF/JPG), tabel & paginasi.
   ===================================================================== */
'use strict';
const IKON_MODUL = { move_to_inbox: 'inbox', outbox: 'send', person_add: 'user-plus', person_remove: 'user-minus', how_to_reg: 'user-check', badge: 'id-card', event_busy: 'calendar-x' };
function ikonModul(k) { const m = S.modul[k]; return IKON_MODUL[m && m.ikon] || 'file-text'; }
const GRUP_LABEL = { surat: 'Arsip Surat', siswa: 'Data Kesiswaan', gtk: 'Kepegawaian' };
const JUDUL_MODUL = { sm: 'Arsip Surat Masuk', sk: 'Arsip Surat Keluar', pm: 'Siswa Pindah Masuk', pk: 'Siswa Pindah Keluar', spmb: 'Siswa Baru SPMB', gtk: 'Guru & Tenaga Kependidikan', cuti: 'Cuti GTK' };
const LABEL_TOMBOL = { sm: 'Input Surat Masuk', sk: 'Input Surat Keluar', pm: 'Input Pindah Masuk', pk: 'Input Pindah Keluar', spmb: 'Input Siswa Baru', gtk: 'Tambah GTK', cuti: 'Ajukan Cuti' };

/* ---------------------------------------------------------------------
 * Menu
 * ------------------------------------------------------------------- */
function bolehDokumen() { return ['surat_keluar', 'surat_masuk', 'pindah_masuk', 'pindah_keluar'].some(punyaIzin); }
function menuItems() {
  const adm = isAdmin();
  const mod = k => modulBoleh(k) ? { h: 'm/' + k, t: S.modul[k].label, i: ikonModul(k), k } : null;
  const g = [
    { g: 'Menu Utama', items: [{ h: 'dash', t: adm ? 'Dashboard Admin' : 'Dashboard', i: 'layout-dashboard' }, adm ? { h: 'dash/staf', t: 'Dashboard Staf', i: 'layout-grid' } : null] },
    { g: 'Arsip Surat', items: [mod('sm'), mod('sk')] },
    { g: 'Dokumen', items: bolehDokumen() ? [{ h: 'dokumen', t: 'Buat Dokumen', i: 'file-plus' }, { h: 'dokumen/riwayat', t: 'Riwayat Dokumen', i: 'history' }] : [] },
    { g: 'Data Kesiswaan', items: [mod('pm'), mod('pk'), mod('spmb')] },
    { g: 'Kepegawaian', items: [mod('gtk'), mod('cuti')] }
  ];
  if (adm) g.push({ g: 'Pengelolaan (Admin)', items: [
    { h: 'verifikasi', t: 'Verifikasi Data', i: 'shield-check', nb: 'menunggu' },
    { h: 'pengguna', t: 'Kelola Pengguna', i: 'users' },
    { h: 'laporan', t: 'Laporan & Ekspor', i: 'chart-column' },
    { h: 'dokumen/template', t: 'Template & Penomoran', i: 'layers' },
    { h: 'notifikasi', t: 'Notifikasi WA & Email', i: 'megaphone' },
    { h: 'crm', t: 'CRM Kontak', i: 'book-user' },
    { h: 'master', t: 'Master Data', i: 'list-checks' },
    { h: 'migrasi', t: 'Impor & Backup', i: 'database' },
    { h: 'audit', t: 'Audit Log', i: 'scroll-text' },
    { h: 'sampah', t: 'Sampah', i: 'trash-2' },
    { h: 'pengaturan', t: 'Pengaturan', i: 'settings' }
  ] });
  else g.push({ g: 'Lainnya', items: [{ h: 'laporan', t: 'Laporan & Ekspor', i: 'chart-column' }] });
  g.push({ g: 'Bantuan', items: [{ h: 'panduan', t: 'Panduan Pemakaian', i: 'book-open' }] });
  g.forEach(x => { x.items = x.items.filter(Boolean); });
  return g.filter(x => x.items.length);
}

/* ---------------------------------------------------------------------
 * Kerangka aplikasi
 * ------------------------------------------------------------------- */
function logoHtml() { const l = S.publik && S.publik.logo; return l ? '<img src="' + esc(l) + '" alt="">' : ikon('school', 'lg'); }
function renderShell() {
  const root = $('#root');
  const p = S.publik || {};
  root.innerHTML = '<div class="app' + (Pref.get('mini', false) ? ' side-mini' : '') + '" id="app">' +
    '<aside class="sidebar" aria-label="Menu utama"><div class="brand"><div class="brand-logo">' + logoHtml() + '</div><div class="brand-t"><b>SIM TATA USAHA</b><span>' + esc(p.singkatan || CFG.SINGKATAN || '') + '</span></div></div>' +
    '<nav class="nav" id="nav"></nav><div class="side-foot"><div class="drive-box" id="driveBox"><div class="flex between"><span class="flex gap8 small b">' + ikon('cloud', 'sm teal-t') + 'Google Drive</span><span class="xs muted b" data-dp>–</span></div><div class="bar mt8"><i data-db style="width:0"></i></div><div class="flex between mt8 xs muted"><span data-dt>memuat…</span><span class="flex gap4 b ok-t"><span class="dot pulse"></span>GAS Aktif</span></div></div><div class="xs muted mt8 ctr">Kelas @khoirulfajarid · v' + esc((S.boot && S.boot.versi) || '') + '</div></div></aside>' +
    '<div class="side-scrim" id="sideScrim"></div>' +
    '<header class="topbar"><button class="icon-btn" id="btnMenu" aria-label="Buka/tutup menu">' + ikon('menu') + '</button>' +
    '<div class="m-title show-m grow" id="mTitle">SIM TU</div>' +
    '<div class="crumb-top hide-m"><span>SIM TU</span>' + ikon('chevron-right', 'sm') + '<b>' + esc(p.singkatan || CFG.SINGKATAN || '') + '</b></div>' +
    '<label class="gsearch" title="Pencarian global (Ctrl + /)">' + ikon('search', 'sm') + '<input id="gsearch" readonly placeholder="Cari arsip, nama siswa, nomor surat…" aria-label="Pencarian global"><kbd>Ctrl + /</kbd></label>' +
    '<div class="top-r"><span class="ta-pill" title="Tahun ajaran aktif">' + ikon('school', 'sm') + 'T.A. ' + esc(S.boot ? S.boot.tahunAjaran : '') + ' ' + esc(S.boot ? S.boot.semester : '') + '<span class="dot"></span></span>' +
    '<button class="icon-btn show-m" id="btnCariM" aria-label="Cari">' + ikon('search') + '</button>' +
    '<button class="icon-btn" id="btnBell" aria-label="Notifikasi">' + ikon('bell') + '<span class="badge" id="bellN" hidden>0</span></button><span class="vsep"></span>' +
    '<button class="user-btn" id="btnUser" aria-label="Menu akun"><span class="av ' + (isAdmin() ? 'teal' : '') + '">' + esc(S.me.inisial || inisial(S.me.nama)) + '</span><span class="un"><b>' + esc(S.me.nama) + '</b><span>' + (S.me.darurat ? 'Akses Darurat' : isAdmin() ? 'Admin Operator' : 'Staf Tata Usaha') + '</span></span></button></div></header>' +
    '<main class="main" id="main" tabindex="-1"></main></div>';
  renderNav();
  $('#btnMenu').onclick = () => {
    const app = $('#app');
    if (innerWidth >= 1024) { app.classList.toggle('side-mini'); Pref.set('mini', app.classList.contains('side-mini')); }
    else app.classList.toggle('side-open');
  };
  $('#sideScrim').onclick = () => $('#app').classList.remove('side-open');
  $('#gsearch').onclick = bukaCari; $('#btnCariM').onclick = bukaCari;
  $('#btnBell').onclick = e => bukaLonceng(e.currentTarget);
  $('#btnUser').onclick = e => menuAkun(e.currentTarget);
  perbaruiBadge();
  muatDrive();
}
function renderNav() {
  const nav = $('#nav'); if (!nav) return;
  nav.innerHTML = menuItems().map(g => '<div class="nav-g"><div class="nav-gt">' + esc(g.g) + '</div>' + g.items.map(it =>
    '<a href="#/' + it.h + '" data-h="' + it.h + '" title="' + esc(it.t) + '"' + (it.nb ? ' data-nb="' + it.nb + '"' : '') + '>' + ikon(it.i) + '<span class="t">' + esc(it.t) + '</span>' + (it.nb ? '<span class="nb" hidden>0</span>' : '') + '</a>').join('') + '</div>').join('');
  nav.onclick = e => { if (e.target.closest('a') && innerWidth < 1024) $('#app').classList.remove('side-open'); };
  tandaiNav();
}
function tandaiNav() {
  const { seg } = urai(location.hash);
  const jalur = seg.join('/');
  let terbaik = null, panjang = -1;
  $$('#nav a').forEach(a => { const h = a.dataset.h; if ((jalur === h || jalur.indexOf(h + '/') === 0) && h.length > panjang) { terbaik = a; panjang = h.length; } });
  $$('#nav a').forEach(a => { a.classList.toggle('on', a === terbaik); if (a === terbaik) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const t = terbaik ? terbaik.title : 'SIM TU';
  if ($('#mTitle')) $('#mTitle').textContent = t;
  document.title = t + ' · SIM TU ' + ((S.publik && S.publik.singkatan) || '');
}
function perbaruiBadge() {
  const s = S.sinyal || {};
  const b = $('#bellN'); if (b) { b.hidden = !s.lonceng; b.textContent = s.lonceng > 99 ? '99+' : s.lonceng; }
  $$('#nav a[data-nb]').forEach(a => { const n = s[a.dataset.nb] || 0; const el = a.querySelector('.nb'); el.hidden = !n; el.textContent = n; a.classList.toggle('has-nb', !!n); });
}
async function muatDrive() {
  const box = $('#driveBox'); if (!box) return;
  const c = Store.get('drive', null);
  const tulis = d => { if (!d || !d.batas) { $('[data-dt]', box).textContent = 'Kapasitas tidak tersedia'; return; } $('[data-dp]', box).textContent = String(d.persen).replace('.', ',') + '%'; $('[data-db]', box).style.width = Math.min(100, d.persen) + '%'; $('[data-dt]', box).textContent = bytes(d.pakai) + ' / ' + bytes(d.batas); };
  if (c && Date.now() - c.t < 3600e3) return tulis(c.d);
  const r = await api('drive.info'); if (r.success) { Store.set('drive', { t: Date.now(), d: r.data }); tulis(r.data); }
}

/* Akun */
function menuAkun(btn) {
  const p = popover(btn, '<div class="ph"><div class="b">' + esc(S.me.nama) + '</div><div class="xs muted">' + esc(S.me.email || (S.me.darurat ? 'Sesi akses darurat' : '')) + '</div></div><hr>' +
    (S.me.darurat ? '' : '<a class="pi" href="#/profil" data-tutup>' + ikon('user-round') + 'Profil & kata sandi</a>') +
    '<a class="pi" href="#/panduan" data-tutup>' + ikon('book-open') + 'Panduan pemakaian</a>' +
    '<button class="pi" data-a="semua">' + ikon('fingerprint') + 'Keluar dari semua perangkat</button><hr><button class="pi no" data-a="keluar">' + ikon('log-out') + 'Keluar</button>');
  p.querySelector('[data-a=keluar]').onclick = () => { tutupPop(); keluar(); };
  p.querySelector('[data-a=semua]').onclick = async () => {
    tutupPop();
    if (!await konfirmasi({ judul: 'Keluar dari semua perangkat?', pesan: 'Semua sesi akun ini (HP, laptop lain) akan diakhiri. Anda perlu masuk kembali.', ok: 'Keluar semua', bahaya: true })) return;
    const r = await api('auth.logoutSemua'); if (!r.success) return galat(r);
    keluar(true);
  };
}
async function keluar(tanpaApi) {
  if (!tanpaApi) api('auth.logout').catch(() => {});
  hentiSinyal();
  Store.bersihkanPengguna();
  hapusSesi();
  S.token = ''; S.me = null; S.boot = null; _blobMemo.clear();
  location.hash = '#/login';
  location.reload();
}

/* ---------------------------------------------------------------------
 * Lonceng
 * ------------------------------------------------------------------- */
async function bukaLonceng(btn) {
  const p = popover(btn, '<div class="flex between" style="padding:12px 14px;border-bottom:1px solid var(--border)"><b>Notifikasi</b><button class="btn-link btn-sm" data-baca>Tandai semua dibaca</button></div><div data-isi><div style="padding:16px"><div class="sk sk-line"></div><div class="sk sk-line"></div></div></div>', { cls: 'bell-list' });
  const r = await api('lonceng.list');
  if (!r.success) { $('[data-isi]', p).innerHTML = '<div class="empty small">' + esc(r.message) + '</div>'; return; }
  const rows = r.data.rows;
  $('[data-isi]', p).innerHTML = rows.length ? rows.map(n => '<div class="bell-i' + (n.dibaca ? '' : ' unread') + '" data-id="' + esc(n.id) + '" data-t="' + esc(n.tautan) + '"><div class="mi sm ' + (/tolak/i.test(n.judul) ? 'no' : /verifikasi|baru/i.test(n.judul) ? 'wait' : /darurat/i.test(n.judul) ? 'no' : 'teal') + '" style="width:32px;height:32px">' + ikon(/tolak/i.test(n.judul) ? 'circle-x' : /darurat/i.test(n.judul) ? 'shield-alert' : /terverifikasi/i.test(n.judul) ? 'circle-check' : 'bell', 'sm') + '</div><div class="grow"><div class="bt">' + esc(n.judul) + '</div><div class="bs">' + esc(n.isi) + '</div><div class="bw">' + esc(relatif(n.waktu)) + '</div></div></div>').join('')
    : '<div class="empty"><div class="ei">' + ikon('bell') + '</div><b>Belum ada notifikasi</b>Pemberitahuan verifikasi dan penolakan muncul di sini.</div>';
  $$('.bell-i', p).forEach(el => el.onclick = () => {
    api('lonceng.baca', { ids: [el.dataset.id] }).then(x => { if (x.success) { S.sinyal.lonceng = x.data.belum; perbaruiBadge(); } });
    tutupPop(); if (el.dataset.t) location.hash = el.dataset.t;
  });
  $('[data-baca]', p).onclick = async () => { const x = await api('lonceng.baca', { semua: true }); if (x.success) { S.sinyal.lonceng = 0; perbaruiBadge(); $$('.bell-i', p).forEach(e => e.classList.remove('unread')); } };
}

/* ---------------------------------------------------------------------
 * Pencarian global (palet perintah)
 * ------------------------------------------------------------------- */
function bukaCari() {
  if ($('.cmd')) return;
  let pilih = 0, hasil = [];
  const m = modal({ ukuran: 'cmd', isi: '<div class="cmd-in">' + ikon('search') + '<input placeholder="Ketik nomor surat, nama siswa, NISN, nama guru, atau menu…" autofocus aria-label="Cari"><span class="kbd">Esc</span></div><div class="cmd-r" data-r></div>' });
  const md = $('.modal', m.el); md.classList.add('cmd'); md.querySelector('.modal-b').style.padding = '0';
  const inp = $('input', m.el), out = $('[data-r]', m.el);
  const menu = menuItems().flatMap(g => g.items.map(i => ({ jenis: 'menu', t: i.t, s: g.g, i: i.i, h: '#/' + i.h })));
  const gambar = () => {
    if (!hasil.length) { out.innerHTML = '<div class="empty small">' + (inp.value.trim().length < 2 ? 'Ketik minimal 2 huruf.' : 'Tidak ada hasil untuk "' + esc(inp.value) + '".') + '</div>'; return; }
    let g = '', html = '';
    hasil.forEach((x, i) => { if (x.grup !== g) { g = x.grup; html += '<div class="cmd-g lbl">' + esc(g) + '</div>'; } html += '<div class="cmd-i' + (i === pilih ? ' on' : '') + '" data-i="' + i + '">' + ikon(x.i) + '<div class="grow"><div class="ct">' + esc(x.t) + '</div><div class="cs">' + esc(x.s || '') + '</div></div>' + (x.st ? chipStatus(x.st, true) : '') + '</div>'; });
    out.innerHTML = html;
  };
  const buka = x => { m.tutup(); location.hash = x.h; };
  const cari = debounce(async () => {
    const q = inp.value.trim(), ql = q.toLowerCase();
    const mm = menu.filter(x => ql && x.t.toLowerCase().indexOf(ql) >= 0).slice(0, 5).map(x => Object.assign({ grup: 'Menu' }, x));
    hasil = mm; pilih = 0; gambar();
    if (q.length < 2) return;
    out.insertAdjacentHTML('beforeend', '<div class="cmd-g xs muted" data-load>Mencari arsip…</div>');
    const r = await api('cari', { q });
    if (inp.value.trim() !== q) return;
    const ld = $('[data-load]', out); if (ld) ld.remove();
    if (!r.success) return;
    hasil = mm.concat(r.data.hasil.map(x => ({ grup: x.label, t: x.judul, s: x.id + (x.sub ? ' · ' + x.sub : ''), i: ikonModul(x.modul), h: '#/m/' + x.modul + '/' + encodeURIComponent(x.id), st: x.status })));
    gambar();
  }, 280);
  inp.addEventListener('input', cari);
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { pilih = Math.min(hasil.length - 1, pilih + 1); gambar(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { pilih = Math.max(0, pilih - 1); gambar(); e.preventDefault(); }
    else if (e.key === 'Enter' && hasil[pilih]) buka(hasil[pilih]);
  });
  out.onclick = e => { const it = e.target.closest('.cmd-i'); if (it) buka(hasil[+it.dataset.i]); };
  hasil = menu.slice(0, 8).map(x => Object.assign({ grup: 'Menu' }, x)); gambar();
}
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === 'k') && S.me) { e.preventDefault(); bukaCari(); } });

/* ---------------------------------------------------------------------
 * Denyut sinyal (lonceng & antrean) — hemat kuota: hanya saat tab
 * terlihat, interval memanjang bila tidak ada perubahan.
 * ------------------------------------------------------------------- */
let _sinyalT = null, _sinyalJeda = 30000, _sinyalTerakhir = '', _sembunyiSejak = 0;
function mulaiSinyal() {
  hentiSinyal();
  const jalan = async () => {
    if (document.visibilityState !== 'visible' || !S.token) { _sinyalT = setTimeout(jalan, _sinyalJeda); return; }
    const r = await api('sinyal');
    if (r.success) {
      const h = JSON.stringify(r.data);
      if (h !== _sinyalTerakhir) {
        const lama = S.sinyal || {};
        _sinyalTerakhir = h; _sinyalJeda = 30000; S.sinyal = r.data; perbaruiBadge();
        if (lama.ditolakSaya != null && r.data.ditolakSaya > lama.ditolakSaya) toast('Ada data Anda yang ditolak Admin. Buka Dashboard untuk memperbaiki.', 'warn', 'Perlu perbaikan');
        document.dispatchEvent(new CustomEvent('sinyal', { detail: r.data }));
      } else _sinyalJeda = Math.min(120000, _sinyalJeda * 1.5);
    }
    _sinyalT = setTimeout(jalan, _sinyalJeda);
  };
  _sinyalT = setTimeout(jalan, _sinyalJeda);
}
function hentiSinyal() { clearTimeout(_sinyalT); _sinyalT = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') _sembunyiSejak = Date.now();
  else if (_sembunyiSejak && Date.now() - _sembunyiSejak > 120000 && S.token) { hangatkan('kembali'); _sinyalJeda = 30000; mulaiSinyal(); setTimeout(() => api('sinyal').then(r => { if (r.success) { S.sinyal = r.data; perbaruiBadge(); } }), 300); }
});
addEventListener('offline', () => { if (!$('.offline-bar')) document.body.insertAdjacentHTML('beforeend', '<div class="offline-bar">' + ikon('wifi-off', 'sm') + 'Anda sedang offline — data tersimpan tetap bisa dilihat</div>'); });
addEventListener('online', () => { const b = $('.offline-bar'); if (b) b.remove(); });

/* ---------------------------------------------------------------------
 * Pembangun formulir dari metadata field modul
 * ------------------------------------------------------------------- */
function opsiRef(jenis, nilai, kosong) {
  const list = S.ref[jenis] || [];
  let html = '<option value="">' + esc(kosong || '— Pilih —') + '</option>';
  list.forEach(r => { html += '<option value="' + esc(r.kode) + '"' + (r.kode === nilai ? ' selected' : '') + '>' + esc(jenis === 'klasifikasi' ? r.kode + ' — ' + r.nama : r.nama) + '</option>'; });
  if (nilai && !list.some(r => r.kode === nilai)) html += '<option value="' + esc(nilai) + '" selected>' + esc(nilai) + ' (tidak aktif)</option>';
  return html;
}
function opsiTA(nilai) {
  const y = Number(String((S.boot && S.boot.tahunAjaran) || hariIni().slice(0, 4)).slice(0, 4));
  const list = [y - 1, y, y + 1].map(a => a + '/' + (a + 1));
  if (nilai && list.indexOf(nilai) < 0) list.unshift(nilai);
  return list.map(t => '<option' + (t === nilai ? ' selected' : '') + '>' + t + '</option>').join('');
}
/** html satu field; f = metadata, v = nilai, o = {samar, admin, ro} */
function fieldHtml(f, v, o) {
  o = o || {};
  v = v == null ? '' : String(v);
  const id = 'f_' + f.k + '_' + Math.random().toString(36).slice(2, 7);
  const full = f.t === 'textarea' || f.full;
  const req = f.wajib ? '<span class="req">*</span>' : '';
  const kunci = f.pribadi ? ' <span class="xs muted" title="Data pribadi — hanya tampil utuh bagi yang berwenang">' + ikon('lock', 'sm') + '</span>' : '';
  let ctl = '';
  const ro = o.ro ? ' readonly' : '';
  if (f.t === 'textarea') ctl = '<textarea id="' + id + '" name="' + f.k + '" rows="3" maxlength="' + (f.maks || 2000) + '"' + ro + '>' + esc(v) + '</textarea>';
  else if (f.t === 'select') ctl = '<select id="' + id + '" name="' + f.k + '"' + (o.ro ? ' disabled' : '') + '>' + opsiRef(f.ref, v) + '</select>';
  else if (f.t === 'date') ctl = !v || /^\d{4}-\d{2}-\d{2}$/.test(v) ? '<input id="' + id + '" name="' + f.k + '" type="date" value="' + esc(v) + '"' + ro + '>' : '<input id="' + id + '" name="' + f.k + '" type="text" readonly class="samar" value="' + esc(v) + '" title="Data pribadi tersamar">';
  else if (f.t === 'tahunAjaran') ctl = '<select id="' + id + '" name="' + f.k + '">' + opsiTA(v) + '</select>';
  else if (f.t === 'gtk') ctl = '<select id="' + id + '" name="' + f.k + '" data-gtk><option value="">Memuat daftar GTK…</option></select>';
  else {
    const tipe = f.t === 'email' ? 'email' : f.t === 'hp' ? 'tel' : 'text';
    const im = f.t === 'nisn' || f.t === 'nip' || f.t === 'number' ? ' inputmode="numeric"' : f.t === 'hp' ? ' inputmode="tel"' : '';
    const ml = f.t === 'nisn' ? 10 : f.t === 'nip' ? 18 : f.t === 'hp' ? 16 : (f.maks || 200);
    const ph = f.t === 'nisn' ? '10 digit' : f.t === 'nip' ? '18 digit NIP / 16 digit NUPTK' : f.t === 'hp' ? '08xxxxxxxxxx' : f.t === 'email' ? 'nama@contoh.sch.id' : '';
    const dl = f.saran ? ' list="dl_' + f.saran + '"' : '';
    ctl = '<input id="' + id + '" name="' + f.k + '" type="' + tipe + '"' + im + ' maxlength="' + ml + '" value="' + esc(v) + '" placeholder="' + ph + '"' + dl + ro + (f.mono ? ' class="mono"' : '') + '>' +
      (f.saran ? '<datalist id="dl_' + f.saran + '">' + (S.ref[f.saran] || []).map(r => '<option value="' + esc(r.nama) + '">').join('') + '</datalist>' : '');
  }
  return '<div class="field' + (full ? ' full' : '') + '" data-f="' + f.k + '"><label for="' + id + '">' + esc(f.l) + req + kunci + '</label>' + ctl +
    (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '<div class="ferr" hidden></div></div>';
}
function bacaField(root, f) {
  const el = root.querySelector('[name="' + f.k + '"]');
  if (!el) return undefined;
  let v = el.value;
  if (f.t === 'nisn' || f.t === 'nip') v = v.replace(/\D/g, '');
  else if (f.t === 'hp') v = hp08(v);
  else if (typeof v === 'string') v = v.trim();
  return v;
}
function validasiField(f, v) {
  if (!v) return f.wajib ? f.l + ' wajib diisi.' : '';
  if (f.t === 'date' && !V.tgl(v)) return 'Tanggal tidak valid.';
  if (f.t === 'nisn' && !V.nisn(v)) return 'NISN harus 10 digit angka.';
  if (f.t === 'nip' && !V.nip(v)) return 'NIP 18 digit atau NUPTK 16 digit.';
  if (f.t === 'hp' && !V.hp(v)) return 'Nomor HP tidak valid. Contoh: 081234567890.';
  if (f.t === 'email' && !V.email(v)) return 'Format email tidak valid.';
  return '';
}
function tandaiGalat(root, errors) {
  $$('.field', root).forEach(el => { el.classList.remove('err'); const e = $('.ferr', el); if (e) { e.hidden = true; e.textContent = ''; } });
  let pertama = null;
  Object.keys(errors || {}).forEach(k => {
    const el = root.querySelector('.field[data-f="' + k + '"]');
    if (!el || !errors[k]) return;
    el.classList.add('err'); const e = $('.ferr', el); if (e) { e.hidden = false; e.textContent = errors[k]; }
    if (!pertama) pertama = el;
  });
  if (pertama) { pertama.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = pertama.querySelector('input,select,textarea'); if (i) setTimeout(() => i.focus(), 200); }
  return !!pertama;
}

/* ---------------------------------------------------------------------
 * Pengunggah berkas (langsung unggah saat dipilih)
 * ------------------------------------------------------------------- */
function Pengunggah(wadahEl, o) {
  const st = { files: [], sibuk: 0 };
  const label = o.label || 'PDF atau JPG';
  const terima = (o.mime || []).join(',');
  wadahEl.innerHTML = '<div class="drop" tabindex="0" role="button" aria-label="Pilih berkas"><div class="dic">' + ikon('cloud-upload') + '</div><div class="b">Seret berkas ke sini atau <span class="or-t">pilih dari perangkat</span></div><div class="hint mt4">' + esc(label) + ' · maks. 10 MB per berkas · maks. ' + (o.maks || 5) + ' berkas</div><input type="file" multiple accept="' + terima + '" hidden></div><div data-l class="mt12"></div>';
  const drop = $('.drop', wadahEl), inp = $('input', wadahEl), list = $('[data-l]', wadahEl);
  drop.onclick = () => inp.click();
  drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); tambah(Array.from(e.dataTransfer.files)); };
  inp.onchange = () => { tambah(Array.from(inp.files)); inp.value = ''; };
  function gambar() {
    list.innerHTML = st.files.map((f, i) => '<div class="file-i up-i"><div class="file-ic ' + (/jpe?g/i.test(f.mime) ? 'jpg' : '') + '">' + ikon(/jpe?g/i.test(f.mime) ? 'image' : 'file-text') + '</div><div class="grow"><div class="fn">' + esc(f.nama) + '</div><div class="fs">' + (f.err ? '<span class="no-t">' + esc(f.err) + '</span>' : f.id ? bytes(f.ukuran) + ' · siap' : 'Mengunggah… ' + f.p + '%') + '</div>' + (!f.id && !f.err ? '<div class="prog"><i style="width:' + f.p + '%"></i></div>' : '') + '</div><button type="button" class="icon-btn" data-hapus="' + i + '" aria-label="Hapus">' + ikon('x') + '</button></div>').join('');
    $$('[data-hapus]', list).forEach(b => b.onclick = () => { st.files.splice(+b.dataset.hapus, 1); gambar(); o.onChange && o.onChange(); });
  }
  async function tambah(arr) {
    const sisa = (o.maks || 5) - (o.sudah || 0) - st.files.filter(f => !f.err).length;
    if (arr.length > sisa) { toast('Maksimal ' + (o.maks || 5) + ' berkas per data.', 'warn'); arr = arr.slice(0, Math.max(0, sisa)); }
    for (const file of arr) {
      const item = { nama: file.name, mime: file.type, ukuran: file.size, p: 0 };
      const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
      if ((o.mime || []).indexOf(mime) < 0) item.err = 'Jenis berkas harus ' + label + '.';
      else if (file.size > MAKS_BERKAS) item.err = 'Melebihi 10 MB.';
      st.files.push(item); gambar();
      if (item.err) continue;
      st.sibuk++; o.onChange && o.onChange();
      try { const r = await unggahBerkas(o.modul, file, p => { item.p = p; gambar(); }); Object.assign(item, { id: r.id, ukuran: r.ukuran }); }
      catch (e) { item.err = e.message; }
      st.sibuk--; gambar(); o.onChange && o.onChange();
    }
  }
  return { ids: () => st.files.filter(f => f.id).map(f => f.id), sibuk: () => st.sibuk > 0, ada: () => st.files.some(f => f.id), reset() { st.files = []; gambar(); } };
}

/* ---------------------------------------------------------------------
 * Penampil berkas (PDF via pdf.js, JPG langsung) dengan zoom/putar
 * ------------------------------------------------------------------- */
async function tampilkanBerkas(body, b, kontrol) {
  const st = { zoom: 1, putar: 0 };
  body.innerHTML = '<div class="boot-load" style="margin:auto">' + ikon('loader-circle', 'spin lg') + '<span class="small">Memuat ' + esc(b.nama) + '…</span></div>';
  let data;
  try { data = await ambilBerkas(b.id); } catch (e) { body.innerHTML = '<div class="empty"><div class="ei">' + ikon('file-x') + '</div><b>Berkas tidak bisa dibuka</b>' + esc(e.message) + '</div>'; return null; }
  const url = URL.createObjectURL(data.blob);
  const terap = () => { $$('.pg', body).forEach(p => { p.style.transform = 'scale(' + st.zoom + ') rotate(' + st.putar + 'deg)'; p.style.marginBottom = (st.zoom - 1) * p.offsetHeight + 16 + 'px'; }); if (kontrol && kontrol.persen) kontrol.persen.textContent = Math.round(st.zoom * 100) + '%'; };
  if (/^image\//.test(data.mime)) {
    body.innerHTML = '<img class="pg" alt="' + esc(b.nama) + '" src="' + url + '" style="max-width:100%">';
  } else {
    try {
      const lib = await pakaiPdfjs();
      const pdf = await lib.getDocument({ data: new Uint8Array(await data.blob.arrayBuffer()) }).promise;
      body.innerHTML = '';
      const lebar = Math.min(body.clientWidth - 40, 820);
      for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
        const page = await pdf.getPage(i);
        const vp1 = page.getViewport({ scale: 1 }), skala = Math.max(.5, lebar / vp1.width), vp = page.getViewport({ scale: skala * (devicePixelRatio || 1) });
        const cv = document.createElement('canvas'); cv.className = 'pg'; cv.width = vp.width; cv.height = vp.height;
        cv.style.width = (vp.width / (devicePixelRatio || 1)) + 'px';
        body.appendChild(cv);
        await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      }
      if (pdf.numPages > 30) body.insertAdjacentHTML('beforeend', '<div class="note">' + ikon('info', 'sm') + 'Menampilkan 30 halaman pertama dari ' + pdf.numPages + '. Buka di tab baru untuk melihat semuanya.</div>');
      if (kontrol && kontrol.hal) kontrol.hal.textContent = pdf.numPages + ' halaman';
    } catch (e) {
      body.innerHTML = '<iframe class="pg" title="' + esc(b.nama) + '" src="' + url + '#toolbar=0" style="width:100%;height:72vh;border:0"></iframe>';
    }
  }
  if (kontrol) {
    kontrol.zoomIn && (kontrol.zoomIn.onclick = () => { st.zoom = Math.min(3, st.zoom + .15); terap(); });
    kontrol.zoomOut && (kontrol.zoomOut.onclick = () => { st.zoom = Math.max(.4, st.zoom - .15); terap(); });
    kontrol.putar && (kontrol.putar.onclick = () => { st.putar = (st.putar + 90) % 360; terap(); });
    kontrol.buka && (kontrol.buka.onclick = () => window.open(url, '_blank', 'noopener'));
    kontrol.persen && (kontrol.persen.textContent = '100%');
  }
  return data;
}
/** Pratinjau cepat dalam modal */
function lihatBerkas(b, bolehUnduh) {
  const m = modal({ judul: b.nama, sub: bytes(b.ukuran) + (b.hash ? ' · SHA-256 ' + b.hash.slice(0, 12) + '…' : ''), ukuran: 'xl', isi: '<div class="viewer" style="min-height:0;height:100%;border:0"><div class="vw-h"><div class="vw-tools"><button class="icon-btn" data-zo aria-label="Perkecil">' + ikon('zoom-out') + '</button><span data-zp>100%</span><button class="icon-btn" data-zi aria-label="Perbesar">' + ikon('zoom-in') + '</button><button class="icon-btn" data-rt aria-label="Putar">' + ikon('rotate-cw') + '</button><button class="icon-btn" data-ob aria-label="Buka di tab baru">' + ikon('external-link') + '</button></div><span class="grow"></span>' + (bolehUnduh ? '<button class="btn btn-sm" data-un>' + ikon('download', 'sm') + 'Unduh</button>' : '') + '</div><div class="vw-body" style="max-height:none"></div></div>' });
  const md = $('.modal-b', m.el); md.style.padding = '0 0 0'; md.style.flex = '1'; md.style.display = 'flex'; md.style.flexDirection = 'column';
  $('.viewer', m.el).style.flex = '1';
  tampilkanBerkas($('.vw-body', m.el), b, { zoomIn: $('[data-zi]', m.el), zoomOut: $('[data-zo]', m.el), putar: $('[data-rt]', m.el), buka: $('[data-ob]', m.el), persen: $('[data-zp]', m.el) });
  const un = $('[data-un]', m.el);
  if (un) un.onclick = () => sibuk(un, async () => { try { const d = await ambilBerkas(b.id, 'unduh'); unduhBlob(d.blob, d.nama); } catch (e) { toast(e.message, 'err'); } });
}

/* ---------------------------------------------------------------------
 * Tabel & paginasi
 * ------------------------------------------------------------------- */
function pagerHtml(total, page, per) {
  const n = Math.max(1, Math.ceil(total / per));
  const awal = total ? (page - 1) * per + 1 : 0, akhir = Math.min(total, page * per);
  const nomor = [];
  for (let i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - page) <= 1) nomor.push(i); else if (nomor[nomor.length - 1] !== '…') nomor.push('…');
  return '<span>Menampilkan ' + angka(awal) + '–' + angka(akhir) + ' dari ' + angka(total) + '</span><div class="pager"><button data-pg="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + ' aria-label="Sebelumnya">' + ikon('chevron-left', 'sm') + '</button>' +
    nomor.map(x => x === '…' ? '<span class="muted">…</span>' : '<button data-pg="' + x + '"' + (x === page ? ' class="on" aria-current="page"' : '') + '>' + x + '</button>').join('') +
    '<button data-pg="' + (page + 1) + '"' + (page >= n ? ' disabled' : '') + ' aria-label="Berikutnya">' + ikon('chevron-right', 'sm') + '</button></div>';
}
function kosongHtml(ic, judul, teks, aksi) { return '<div class="empty"><div class="ei">' + ikon(ic || 'inbox') + '</div><b>' + esc(judul) + '</b>' + esc(teks || '') + (aksi ? '<div class="mt12">' + aksi + '</div>' : '') + '</div>'; }
function skeletonTabel(n) { let s = ''; for (let i = 0; i < (n || 5); i++) s += '<div style="padding:12px 16px;border-bottom:1px solid var(--border)"><div class="sk sk-line" style="width:' + (40 + (i * 13) % 50) + '%"></div><div class="sk sk-line" style="width:' + (20 + (i * 7) % 30) + '%;height:10px"></div></div>'; return s; }
function galatHtml(res, ulang) { return '<div class="empty"><div class="ei" style="background:var(--no-bg);color:var(--no-text)">' + ikon('wifi-off') + '</div><b>Data belum bisa dimuat</b>' + esc((res && res.message) || '') + '<div class="mt12"><button class="btn btn-primary" data-ulang>' + ikon('refresh-cw') + 'Coba lagi</button></div></div>'; }
function pasangUlang(root, fn) { const b = root.querySelector('[data-ulang]'); if (b) b.onclick = fn; }
function headHalaman(o) {
  return '<div class="page-head"><div class="grow">' + (o.crumbs ? '<div class="crumbs">' + o.crumbs.map((c, i) => (i ? ikon('chevron-right', 'sm') : '') + '<span' + (i === o.crumbs.length - 1 ? ' class="cur"' : '') + '>' + c + '</span>').join('') + (o.pill ? ' ' + o.pill : '') + '</div>' : '') +
    '<h1 class="page-title">' + esc(o.judul) + '</h1>' + (o.sub ? '<div class="page-sub">' + o.sub + '</div>' : '') + '</div>' + (o.aksi ? '<div class="page-act">' + o.aksi + '</div>' : '') + '</div>';
}
function metricHtml(o) {
  return '<div class="card metric' + (o.klik ? ' hov' : '') + '"' + (o.klik ? ' data-klik="' + esc(o.klik) + '"' : '') + '><div class="metric-top"><div class="flex gap12"><div class="mi ' + (o.warna || '') + '">' + ikon(o.ikon) + '</div><div><div class="metric-l">' + esc(o.label) + '</div><div class="metric-s">' + esc(o.sub || '') + '</div></div></div>' + (o.tren || '') + '</div>' +
    '<div class="flex between" style="align-items:flex-end;gap:8px"><div class="metric-n">' + o.nilai + (o.satuan ? '<small>' + esc(o.satuan) + '</small>' : '') + '</div><div class="xs muted right">' + (o.kanan || '') + '</div></div></div>';
}
function trenHtml(t) { if (t == null) return '<span class="trend flat">baru</span>'; if (t === 0) return '<span class="trend flat">' + ikon('minus', 'sm') + '0%</span>'; return '<span class="trend ' + (t < 0 ? 'down' : '') + '">' + ikon(t < 0 ? 'trending-down' : 'trending-up', 'sm') + (t > 0 ? '+' : '') + t + '%</span>'; }
