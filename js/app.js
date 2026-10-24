/* =====================================================================
   SIM TATA USAHA — app.js
   Alur masuk (login sandi, Google, akses darurat, lupa sandi, wajib
   ganti sandi), boot dari cache perangkat, router aplikasi, halaman
   verifikasi dokumen publik (#/v/KODE).
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
 * Konfigurasi publik (nama sekolah, logo, login Google) — di-cache
 * ------------------------------------------------------------------- */
async function muatPublik() {
  const c = Pref.get('publik', null);
  if (c) S.publik = c;
  const r = await apiGet({ action: 'publicConfig' });
  if (r.success) { S.publik = r.data; Pref.set('publik', r.data); }
  return S.publik;
}
function terapkanBoot(b) {
  S.boot = b; S.me = b.me; S.ref = b.ref || {}; S.setting = b.setting || {}; S.sinyal = b.sinyal || S.sinyal;
  S.modul = {}; (b.modul || []).forEach(m => { S.modul[m.key] = m; });
  if (b.publik) { S.publik = b.publik; Pref.set('publik', b.publik); }
  S.darurat = !!b.me.darurat;
}
function simpanBoot(b) { Store.set('boot', { t: Date.now(), data: b }); }
async function segarkanBoot() {
  const r = await api('boot');
  if (r.success) { const lama = JSON.stringify(S.boot && S.boot.modul) + JSON.stringify(S.ref); terapkanBoot(r.data); simpanBoot(r.data); simpanSesi(); if (lama !== JSON.stringify(r.data.modul) + JSON.stringify(r.data.ref)) { renderNav(); } perbaruiBadge(); }
  return r;
}

/* ---------------------------------------------------------------------
 * Layar luar aplikasi
 * ------------------------------------------------------------------- */
function layarSetup() {
  $('#root').innerHTML = '<div class="full-c"><div class="card" style="max-width:560px"><div class="flex gap12 mb12"><div class="mi">' + ikon('settings') + '</div><div><div class="ttl">Alamat API belum diatur</div><div class="small muted">Langkah terakhir pemasangan</div></div></div>' +
    '<ol class="list-plain"><li>Buka proyek Apps Script → <b>Deploy → New deployment → Web app</b> (Execute as: <i>Me</i>, Who has access: <i>Anyone</i>).</li><li>Salin URL yang berakhiran <span class="mono">/exec</span>.</li><li>Tempel ke <span class="mono">js/config.js</span> pada <span class="mono">API_URL</span>, simpan, lalu unggah ulang ke GitHub Pages.</li></ol>' +
    '<div class="note mt16">' + ikon('info', 'sm') + '<span>Lihat <b>PANDUAN-INSTALASI.md</b> bagian "Hubungkan frontend".</span></div></div></div>';
}
function tampilMemuat(teks) {
  $('#root').innerHTML = '<div class="full-c"><div class="boot-load"><div class="brand-logo">' + logoHtml() + '</div><div class="flex gap8">' + ikon('loader-circle', 'spin') + '<span>' + esc(teks || 'Menyiapkan SIM Tata Usaha…') + '</span></div></div></div>';
}
function layarGalatBoot(res) {
  $('#root').innerHTML = '<div class="full-c"><div class="card" style="max-width:440px;width:100%">' + galatHtml(res) + '<div class="ctr mt8"><button class="btn-link btn" data-keluar>Masuk dengan akun lain</button></div></div></div>';
  pasangUlang($('#root'), () => location.reload());
  $('[data-keluar]').onclick = () => keluar(true);
}

function kerangkaAuth(isi) {
  const p = S.publik || {};
  return '<div class="auth"><section class="auth-side"><div class="auth-brand"><div class="brand-logo">' + logoHtml() + '</div><div><b>SIM TATA USAHA</b><span>' + esc(p.namaSekolah || CFG.NAMA_SEKOLAH || '') + '</span></div></div>' +
    '<div class="auth-hero"><h1>Arsip sekolah tertata, <em>terverifikasi</em>, dan aman.</h1><p>Surat masuk & keluar, mutasi siswa, SPMB, serta data guru dan tenaga kependidikan — diinput staf, diverifikasi Admin Operator, tersimpan di Google Drive sekolah.</p>' +
    '<div class="auth-feat"><div>' + ikon('shield-check') + '<b>Verifikasi berlapis</b>Setiap data diperiksa sebelum resmi.</div><div>' + ikon('lock') + '<b>Data pribadi terlindungi</b>NISN & identitas hanya untuk yang berwenang.</div><div>' + ikon('qr-code') + '<b>Dokumen ber-QR</b>Keaslian surat bisa dicek siapa saja.</div></div></div>' +
    '<div class="auth-foot">' + esc([p.alamat, 'Kelas @khoirulfajarid'].filter(Boolean).join(' · ')) + '</div></section><section class="auth-main"><div class="auth-card">' + isi + '</div></section></div>';
}
function layarLogin(pesan) {
  hentiSinyal();
  const p = S.publik || {};
  const ingat = Pref.get('ingat', true);
  $('#root').innerHTML = kerangkaAuth('<h2>Masuk ke SIM TU</h2><p class="sub">Gunakan akun yang diberikan Admin Operator.</p>' +
    (pesan ? '<div class="note warn mt16">' + ikon('info', 'sm') + '<span>' + esc(pesan) + '</span></div>' : '') +
    '<form id="fLogin" class="mt24" novalidate><div class="field"><label for="lEmail">Email</label><div class="inp-ic">' + ikon('mail', 'sm') + '<input id="lEmail" type="email" autocomplete="username" required placeholder="nama@sekolah.sch.id" value="' + esc(Pref.get('emailTerakhir', '')) + '"></div></div>' +
    '<div class="field mt16"><label for="lPass">Kata sandi</label><div class="inp-ic">' + ikon('key-round', 'sm') + '<input id="lPass" type="password" autocomplete="current-password" required placeholder="••••••••"><button type="button" class="icon-btn ic-r" data-lihat aria-label="Tampilkan sandi">' + ikon('eye') + '</button></div></div>' +
    '<div class="auth-meta mt12"><label class="check"><input type="checkbox" id="lIngat"' + (ingat ? ' checked' : '') + '> Ingat saya di perangkat ini</label><a href="#/lupa" class="small b">Lupa sandi?</a></div>' +
    '<div class="ferr mb12" id="lErr" hidden></div><button class="btn btn-primary btn-lg w100" type="submit">' + ikon('log-out') + 'Masuk</button>' +
    '<div class="flex center mt12"><span class="sesi-pill">' + ikon('clock', 'sm') + 'Sesi 12 jam · token terenkripsi</span></div></form>' +
    (p.googleLogin ? '<div class="auth-or">atau</div><div class="gbtn-wrap" id="gBtn"><button class="btn w100 btn-lg" type="button" disabled>' + ikon('loader-circle', 'spin') + 'Memuat tombol Google…</button></div>' : '') +
    '<div class="ctr mt24 small muted">Admin tidak bisa masuk? <a href="#/darurat">Akses darurat</a></div>');
  const f = $('#fLogin'), err = $('#lErr');
  $('[data-lihat]').onclick = e => { const i = $('#lPass'); i.type = i.type === 'password' ? 'text' : 'password'; e.currentTarget.innerHTML = ikon(i.type === 'password' ? 'eye' : 'eye-off'); };
  setTimeout(() => ($('#lEmail').value ? $('#lPass') : $('#lEmail')).focus(), 50);
  f.onsubmit = async e => {
    e.preventDefault();
    const email = $('#lEmail').value.trim(), pass = $('#lPass').value;
    err.hidden = true;
    if (!V.email(email) || !pass) { err.hidden = false; err.textContent = 'Isi email yang valid dan kata sandi.'; return; }
    const btn = f.querySelector('[type=submit]');
    await sibuk(btn, async () => {
      S.ingat = $('#lIngat').checked; Pref.set('ingat', S.ingat); Pref.set('emailTerakhir', email);
      const r = await api('auth.login', { email, password: pass });
      if (!r.success) { err.hidden = false; err.textContent = r.message; $('#lPass').select(); return; }
      setelahMasuk(r.data, pass);
    });
  };
  if (p.googleLogin && p.googleClientId) pasangGoogle(p.googleClientId);
}
async function pasangGoogle(cid) {
  try {
    await muatSkrip(LIB.gsi);
    google.accounts.id.initialize({
      client_id: cid, ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true,
      callback: async resp => {
        const w = $('#gBtn'); if (w) w.style.opacity = '.5';
        S.ingat = $('#lIngat') ? $('#lIngat').checked : true;
        const r = await api('auth.google', { credential: resp.credential });
        if (w) w.style.opacity = '';
        if (!r.success) { const e = $('#lErr'); if (e) { e.hidden = false; e.textContent = r.message; } return; }
        setelahMasuk(r.data);
      }
    });
    const w = $('#gBtn'); if (!w) return;
    w.innerHTML = '';
    google.accounts.id.renderButton(w, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with', locale: 'id', width: Math.min(400, w.clientWidth || 360) });
  } catch (e) { const w = $('#gBtn'); if (w) w.innerHTML = '<div class="small muted ctr">Tombol Google tidak dapat dimuat. Gunakan email & kata sandi.</div>'; }
}
function setelahMasuk(d, sandiLama) {
  S.token = d.token; S.me = d.me;
  simpanSesi();
  if (d.me.wajibGanti) return d.me.darurat ? layarRotasiDarurat() : layarGantiSandi(sandiLama);
  terapkanBoot(d.boot); simpanBoot(d.boot);
  if (!location.hash || /^#\/(login|darurat|lupa)/.test(location.hash)) history.replaceState(null, '', '#/dash');
  masukAplikasi();
  toast('Selamat datang, ' + d.me.nama + '.');
}
function layarGantiSandi(sandiLama) {
  $('#root').innerHTML = kerangkaAuth('<div class="mi mb12">' + ikon('key-round') + '</div><h2>Ganti kata sandi</h2><p class="sub">Demi keamanan, ganti sandi sementara sebelum melanjutkan. Minimal 8 karakter berisi huruf dan angka.</p>' +
    '<form id="fGanti" class="mt24" novalidate>' + (sandiLama ? '' : '<div class="field mb12"><label>Kata sandi saat ini</label><input type="password" id="gLama" autocomplete="current-password"></div>') +
    '<div class="field"><label>Kata sandi baru</label><input type="password" id="gBaru" autocomplete="new-password"></div><div class="field mt12"><label>Ulangi kata sandi baru</label><input type="password" id="gUlang" autocomplete="new-password"></div>' +
    '<div class="ferr mt12" id="gErr" hidden></div><button class="btn btn-primary btn-lg w100 mt16" type="submit">' + ikon('check') + 'Simpan & lanjutkan</button><button class="btn btn-link w100 mt12" type="button" data-batal>Keluar</button></form>');
  $('[data-batal]').onclick = () => keluar();
  $('#fGanti').onsubmit = async e => {
    e.preventDefault();
    const lama = sandiLama || $('#gLama').value, baru = $('#gBaru').value, err = $('#gErr');
    err.hidden = true;
    if (!V.sandi(baru)) { err.hidden = false; err.textContent = 'Sandi baru minimal 8 karakter, berisi huruf dan angka.'; return; }
    if (baru !== $('#gUlang').value) { err.hidden = false; err.textContent = 'Ulangan sandi tidak sama.'; return; }
    await sibuk(e.target.querySelector('[type=submit]'), async () => {
      const r = await api('auth.gantiSandi', { sandiLama: lama, sandiBaru: baru });
      if (!r.success) { err.hidden = false; err.textContent = r.message; return; }
      toast('Kata sandi diganti.');
      setelahMasuk(r.data);
    });
  };
}
function layarDarurat() {
  $('#root').innerHTML = kerangkaAuth('<div class="mi no mb12">' + ikon('shield-alert') + '</div><h2>Akses darurat</h2><p class="sub">Hanya untuk Admin Operator bila tidak bisa masuk dengan akun biasa. Setiap pemakaian tercatat dan diberitahukan ke Admin.</p>' +
    '<form id="fDar" class="mt24" novalidate><div class="field"><label>Nama pengguna darurat</label><input id="dUser" autocomplete="username" autocapitalize="off"></div><div class="field mt12"><label>Kata sandi darurat</label><input id="dPass" type="password" autocomplete="current-password"></div>' +
    '<div class="ferr mt12" id="dErr" hidden></div><button class="btn btn-teal btn-lg w100 mt16" type="submit">' + ikon('shield-check') + 'Masuk darurat</button></form><div class="ctr mt16"><a href="#/login" class="small">← Kembali ke halaman masuk</a></div>' +
    '<div class="note warn mt16">' + ikon('lock', 'sm') + '<span>Terkunci 15 menit setelah 5 kali salah. Kredensial wajib dirotasi setelah pemakaian pertama.</span></div>');
  $('#fDar').onsubmit = async e => {
    e.preventDefault();
    const err = $('#dErr'); err.hidden = true;
    await sibuk(e.target.querySelector('[type=submit]'), async () => {
      S.ingat = false;
      const r = await api('auth.darurat', { username: $('#dUser').value.trim(), password: $('#dPass').value });
      if (!r.success) { err.hidden = false; err.textContent = r.message; return; }
      setelahMasuk(r.data);
    });
  };
}
function layarRotasiDarurat() {
  $('#root').innerHTML = kerangkaAuth('<div class="mi no mb12">' + ikon('key-round') + '</div><h2>Rotasi sandi darurat</h2><p class="sub">Kredensial darurat baru saja dipakai. Buat sandi darurat baru (minimal 12 karakter berisi huruf & angka) dan simpan di tempat aman — bukan di komputer sekolah.</p>' +
    '<form id="fRot" class="mt24" novalidate><div class="field"><label>Sandi darurat baru</label><input id="rBaru" type="password" autocomplete="new-password"></div><div class="field mt12"><label>Ulangi</label><input id="rUlang" type="password" autocomplete="new-password"></div><div class="ferr mt12" id="rErr" hidden></div>' +
    '<button class="btn btn-teal btn-lg w100 mt16" type="submit">' + ikon('check') + 'Simpan sandi darurat</button></form>');
  $('#fRot').onsubmit = async e => {
    e.preventDefault();
    const b = $('#rBaru').value, err = $('#rErr'); err.hidden = true;
    if (b.length < 12 || !/[A-Za-z]/.test(b) || !/\d/.test(b)) { err.hidden = false; err.textContent = 'Minimal 12 karakter berisi huruf dan angka.'; return; }
    if (b !== $('#rUlang').value) { err.hidden = false; err.textContent = 'Ulangan tidak sama.'; return; }
    await sibuk(e.target.querySelector('[type=submit]'), async () => {
      const r = await api('auth.daruratRotasi', { sandiBaru: b });
      if (!r.success) { err.hidden = false; err.textContent = r.message; return; }
      hapusSesi(); S.token = '';
      layarLogin('Sandi darurat diganti. Masuk kembali lewat Akses darurat dengan sandi baru, atau dengan akun Admin biasa.');
    });
  };
}
function layarLupa() {
  $('#root').innerHTML = kerangkaAuth('<div class="mi mb12">' + ikon('mail') + '</div><h2>Lupa kata sandi</h2><p class="sub">Masukkan email akun Anda. Kode 6 digit akan dikirim ke email tersebut (berlaku 15 menit).</p>' +
    '<form id="fL1" class="mt24" novalidate><div class="field"><label>Email</label><input id="fEmail" type="email" autocomplete="username" value="' + esc(Pref.get('emailTerakhir', '')) + '"></div><div class="ferr mt12" id="fErr" hidden></div><button class="btn btn-primary btn-lg w100 mt16" type="submit">' + ikon('send') + 'Kirim kode</button></form>' +
    '<form id="fL2" class="mt24" novalidate hidden><div class="note ok mb16">' + ikon('mail-check', 'sm') + '<span data-info></span></div><div class="field"><label>Kode 6 digit</label><input id="fKode" inputmode="numeric" maxlength="6" class="mono" autocomplete="one-time-code"></div><div class="field mt12"><label>Kata sandi baru</label><input id="fBaru" type="password" autocomplete="new-password"></div><div class="field mt12"><label>Ulangi</label><input id="fUlang" type="password" autocomplete="new-password"></div><div class="ferr mt12" id="fErr2" hidden></div><button class="btn btn-primary btn-lg w100 mt16" type="submit">' + ikon('check') + 'Ganti sandi</button></form>' +
    '<div class="ctr mt16"><a href="#/login" class="small">← Kembali ke halaman masuk</a></div>');
  let email = '';
  $('#fL1').onsubmit = async e => {
    e.preventDefault(); email = $('#fEmail').value.trim();
    const err = $('#fErr'); err.hidden = true;
    if (!V.email(email)) { err.hidden = false; err.textContent = 'Format email tidak valid.'; return; }
    await sibuk(e.target.querySelector('[type=submit]'), async () => {
      const r = await api('auth.lupa', { email });
      if (!r.success) { err.hidden = false; err.textContent = r.message; return; }
      $('#fL1').hidden = true; $('#fL2').hidden = false; $('[data-info]').textContent = r.message; $('#fKode').focus();
    });
  };
  $('#fL2').onsubmit = async e => {
    e.preventDefault();
    const err = $('#fErr2'); err.hidden = true;
    const b = $('#fBaru').value;
    if (!/^\d{6}$/.test($('#fKode').value.trim())) { err.hidden = false; err.textContent = 'Kode terdiri dari 6 angka.'; return; }
    if (!V.sandi(b)) { err.hidden = false; err.textContent = 'Sandi minimal 8 karakter berisi huruf dan angka.'; return; }
    if (b !== $('#fUlang').value) { err.hidden = false; err.textContent = 'Ulangan tidak sama.'; return; }
    await sibuk(e.target.querySelector('[type=submit]'), async () => {
      const r = await api('auth.reset', { email, kode: $('#fKode').value.trim(), sandiBaru: b });
      if (!r.success) { err.hidden = false; err.textContent = r.message; return; }
      layarLogin('Kata sandi berhasil diganti. Silakan masuk.');
    });
  };
}

/* Verifikasi dokumen publik — tanpa login, tanpa data pribadi */
async function layarVerifikasiPublik(kode) {
  const p = S.publik || {};
  $('#root').innerHTML = '<div class="vpub"><div class="flex gap12 mb16"><div class="brand-logo">' + logoHtml() + '</div><div><b>' + esc(p.namaSekolah || CFG.NAMA_SEKOLAH) + '</b><div class="small muted">Verifikasi keaslian dokumen</div></div></div><div class="card" id="vp"></div><div class="small muted mt16 ctr">SIM Tata Usaha · Kelas @khoirulfajarid</div></div>';
  const box = $('#vp');
  const form = '<form id="fV" class="flex gap8 mt16"><input class="inp mono" id="vKode" placeholder="Kode pada dokumen" maxlength="20" value="' + esc(kode || '') + '" style="text-transform:uppercase"><button class="btn btn-primary">' + ikon('search') + 'Periksa</button></form>';
  const pasang = () => { $('#fV').onsubmit = e => { e.preventDefault(); const k = $('#vKode').value.trim().toUpperCase(); if (k) location.hash = '#/v/' + encodeURIComponent(k); }; };
  if (!kode) { box.innerHTML = '<div class="ttl">Masukkan kode verifikasi</div><p class="small muted mt8">Kode tercetak di bawah QR pada dokumen resmi sekolah.</p>' + form; pasang(); return; }
  box.innerHTML = '<div class="boot-load" style="padding:30px">' + ikon('loader-circle', 'spin lg') + '<span>Memeriksa kode ' + esc(kode) + '…</span></div>';
  const r = await apiGet({ action: 'verifikasi', k: kode });
  if (!r.success) { box.innerHTML = '<div class="vpub-st tarik">' + ikon('circle-x', 'xl') + '<div class="big">TIDAK DITEMUKAN</div><div class="small">' + esc(r.message) + '</div></div>' + form; pasang(); return; }
  const d = r.data, sah = d.status === 'SAH';
  box.innerHTML = '<div class="vpub-st ' + (sah ? 'sah' : 'tarik') + '">' + ikon(sah ? 'shield-check' : 'circle-x', 'xl') + '<div class="big">' + (sah ? 'DOKUMEN SAH' : 'DOKUMEN DITARIK') + '</div><div class="small">' + (sah ? 'Diterbitkan resmi oleh ' + esc(d.instansi) : 'Dokumen ini telah ditarik/dibatalkan oleh sekolah') + '</div></div>' +
    '<div class="kv-box mt16">' + [['Jenis', d.jenis], ['Nomor', d.nomor || '—'], ['Perihal', d.perihal], ['Diterbitkan', fmtWaktu(d.tanggal) + ' WITA'], ['Kode', d.kode]].map(x => '<div class="kv-row"><span class="k">' + x[0] + '</span><span class="v' + (x[0] === 'Nomor' || x[0] === 'Kode' ? ' mono' : '') + '">' + esc(x[1]) + '</span></div>').join('') +
    (d.penandatangan || []).map(t => '<div class="kv-row"><span class="k">Penanda tangan</span><span class="v">' + esc(t.nama || '-') + '<div class="xs muted">' + esc(t.jabatan || '') + ' · ' + esc(t.tanda) + '</div></span></div>').join('') + '</div>' +
    (d.alasanTarik ? '<div class="reject-box mt12 small"><b>Alasan penarikan:</b> ' + esc(d.alasanTarik) + '</div>' : '') +
    (d.hashPdf ? '<div class="small muted mt12">Sidik digital PDF (SHA-256): <span class="mono" style="word-break:break-all">' + esc(d.hashPdf) + '</span></div>' : '') +
    '<div class="note mt16">' + ikon('info', 'sm') + '<span>Cocokkan nomor & perihal di atas dengan dokumen yang Anda pegang. Bila berbeda, dokumen tersebut patut diduga palsu.</span></div>' + form;
  pasang();
}

/* ---------------------------------------------------------------------
 * Aplikasi utama
 * ------------------------------------------------------------------- */
let _halamanAktif = null;
function masukAplikasi() {
  renderShell();
  _ruteHook = ruteApp;
  rute();
  mulaiSinyal();
  saatSenggang(prefetch, 1800);
}
function prefetch() {
  const calls = [{ action: 'doc.jenis' }];
  if (isAdmin()) calls.push({ action: 'verif.antrean', data: { page: 1, per: 10 } });
  api('batch', { calls }).then(r => {
    if (!r.success) return;
    const [jenis, antre] = r.data.results;
    if (jenis && jenis.success) Store.set('docjenis', { t: Date.now(), h: hashStr(JSON.stringify(jenis.data)), data: jenis.data });
    if (antre && antre.success) Store.set('verif:{"page":1,"per":10,"urut":"lama","modul":""}', { t: Date.now(), h: hashStr(JSON.stringify(antre.data)), data: antre.data });
  });
}
function ruteApp(nama, sisa, params) {
  if (nama === 'v') { _ruteHook = null; layarVerifikasiPublik(sisa[0]); return false; }
  if (!S.token || !S.me) { _ruteHook = null; mulaiLuar(nama); return false; }
  if (!$('#app')) renderShell();
  if (!nama || ['login', 'darurat', 'lupa'].indexOf(nama) >= 0) { history.replaceState(null, '', '#/dash'); nama = 'dash'; }
  const def = Pages[nama];
  if (!def) { ke('dash', true); return false; }
  if (def.auth === 'admin' && !isAdmin()) { toast('Halaman ini khusus Admin Operator.', 'warn'); ke('dash', true); return false; }
  if (def.boleh && !def.boleh(sisa, params)) { toast('Anda tidak memiliki izin untuk halaman ini.', 'warn'); ke('dash', true); return false; }
  const kunci = def.kunci ? def.kunci(sisa, params) : nama;
  const main = $('#main');
  let el = main.querySelector('.page[data-k="' + CSS.escape(kunci) + '"]');
  const baru = !el;
  if (baru) {
    el = document.createElement('section'); el.className = 'page'; el.dataset.k = kunci;
    main.appendChild(el);
    // batasi jumlah halaman tersimpan di DOM
    const semua = $$('.page', main); if (semua.length > 12) semua[0].remove();
  }
  const pindah = _halamanAktif !== el;
  $$('.page', main).forEach(p => { p.hidden = p !== el; });
  _halamanAktif = el;
  if (pindah) window.scrollTo(0, 0);
  tandaiNav();
  try { def.tampil(el, sisa, params, { baru, pindah }); } catch (e) { console.error(e); el.innerHTML = galatHtml({ message: 'Halaman gagal ditampilkan: ' + e.message }); pasangUlang(el, () => location.reload()); }
  return false;
}
function mulaiLuar(nama) {
  if (nama === 'darurat') return layarDarurat();
  if (nama === 'lupa') return layarLupa();
  if (nama !== 'login') history.replaceState(null, '', '#/login');
  layarLogin();
}

async function mulai() {
  if (!API_SIAP) return layarSetup();
  hangatkan('boot');
  const { seg } = urai(location.hash);
  const pub = muatPublik();
  if (seg[0] === 'v') { await pub.catch(() => {}); return layarVerifikasiPublik(seg[1]); }
  _onSesiHabis = msg => { hentiSinyal(); hapusSesi(); Store.bersihkanPengguna(); S.token = ''; S.me = null; tutupSemuaLapisan(); history.replaceState(null, '', '#/login'); _ruteHook = null; layarLogin(msg || 'Sesi Anda berakhir. Silakan masuk kembali.'); };
  _onWajibGanti = () => { if (S.me && !S.me.wajibGanti) { S.me.wajibGanti = true; S.me.darurat ? layarRotasiDarurat() : layarGantiSandi(); } };
  const ses = bacaSesi();
  if (!ses) { await Promise.race([pub, sleep(1500)]).catch(() => {}); return mulaiLuar(seg[0]); }
  S.token = ses.t; S.me = ses.me; S.ingat = !!ses.ingat;
  const cb = Store.get('boot', null);
  if (cb && cb.data && cb.data.me && cb.data.me.id === S.me.id && !S.me.wajibGanti) {
    terapkanBoot(cb.data);
    masukAplikasi();
    segarkanBoot().then(r => { if (!r.success && r.code === 428) _onWajibGanti(); });
    return;
  }
  tampilMemuat();
  const r = await api('boot');
  if (r.success) { terapkanBoot(r.data); simpanBoot(r.data); masukAplikasi(); }
  else if (r.code === 401) { hapusSesi(); S.token = ''; layarLogin(r.message); }
  else if (r.code === 428) { S.me.darurat ? layarRotasiDarurat() : layarGantiSandi(); }
  else layarGalatBoot(r);
}
function tutupSemuaLapisan() { while (_lapisan.length) _lapisan[_lapisan.length - 1].tutup(); tutupPop(); }
addEventListener('hashchange', () => { tutupPop(); if (_ruteHook) rute(); else { const { seg } = urai(location.hash); if (seg[0] === 'v') layarVerifikasiPublik(seg[1]); else if (!S.token) mulaiLuar(seg[0]); } });
document.addEventListener('DOMContentLoaded', mulai);
