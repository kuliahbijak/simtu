/* =====================================================================
   SIM TATA USAHA — pages-admin.js
   Kelola Pengguna, Laporan & Ekspor, Notifikasi WA/Email, CRM Kontak,
   Master Data, Impor & Backup, Audit Log, Pengaturan, Profil, Panduan.
   ===================================================================== */
'use strict';
const IZIN_PENDEK = { surat_masuk: 'S. Masuk', surat_keluar: 'S. Keluar', pindah_masuk: 'P. Masuk', pindah_keluar: 'P. Keluar', spmb: 'SPMB', gtk: 'GTK', cuti: 'Cuti', pribadi: 'Data pribadi', ekspor: 'Ekspor' };
function tabsHtml(list, aktif) { return '<div class="tabs" data-tabs>' + list.map(x => '<button data-t="' + x[0] + '"' + (x[0] === aktif ? ' class="on"' : '') + '>' + (x[2] ? ikon(x[2], 'sm') : '') + esc(x[1]) + '</button>').join('') + '</div>'; }
function pasangTabs(el, fn) { $$('[data-tabs] button', el).forEach(b => b.onclick = () => { $$('[data-tabs] button', el).forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.t); }); }
function swHtml(nama, on, label, sub) { return '<label class="switch"><input type="checkbox" name="' + nama + '"' + (on ? ' checked' : '') + '><span class="sl"></span><span><span class="b small">' + esc(label) + '</span>' + (sub ? '<div class="hint">' + esc(sub) + '</div>' : '') + '</span></label>'; }

/* ---------------------------------------------------------------------
 * Kelola Pengguna
 * ------------------------------------------------------------------- */
daftarHalaman('pengguna', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) {
      el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Kelola Pengguna'], judul: 'Kelola Pengguna', sub: 'Admin Operator dan Staf Tata Usaha. Izin per modul menentukan menu yang tampil bagi staf.', aksi: '<button class="btn btn-primary" data-tambah>' + ikon('user-plus') + 'Tambah Pengguna</button>' }) + '<div class="card p0" data-isi>' + skeletonTabel(4) + '</div>';
      $('[data-tambah]', el).onclick = () => formPengguna(el, null);
    }
    muatPengguna(el);
  }
});
async function muatPengguna(el) {
  const r = await api('user.list'), box = $('[data-isi]', el);
  if (!r.success) { box.innerHTML = galatHtml(r); pasangUlang(box, () => muatPengguna(el)); return; }
  el._u = r.data.rows;
  box.innerHTML = '<div class="tbl-wrap tbl-resp"><table class="tbl"><thead><tr><th>Pengguna</th><th>Peran</th><th>Izin modul</th><th>Status</th><th>Terakhir masuk</th><th></th></tr></thead><tbody>' + r.data.rows.map(u => '<tr data-id="' + esc(u.id) + '"><td><div class="flex gap12"><span class="av ' + (u.peran === 'ADMIN' ? 'teal' : '') + '">' + esc(u.inisial) + '</span><div><b>' + esc(u.nama) + '</b><div class="sub">' + esc(u.email) + (u.bidang ? ' · ' + esc(u.bidang) : '') + '</div></div></div></td><td>' + (u.peran === 'ADMIN' ? '<span class="chip chip-teal">Admin Operator</span>' : '<span class="chip chip-muted">Staf TU</span>') + '</td><td class="wrap-t">' + (u.peran === 'ADMIN' ? '<span class="small muted">Semua modul</span>' : u.izin.map(i => '<span class="tag" style="margin:2px">' + esc(IZIN_PENDEK[i] || i) + '</span>').join('')) + '</td><td>' + (u.statusAktif === 'AKTIF' ? '<span class="chip chip-ok titik">Aktif</span>' : '<span class="chip chip-muted">Nonaktif</span>') + (u.wajibGantiSandi === 'YA' ? '<div class="sub wait-t">Belum ganti sandi awal</div>' : '') + '</td><td class="nowrap">' + esc(u.terakhirLogin ? relatif(u.terakhirLogin) : 'belum pernah') + '</td><td class="right"><button class="btn btn-sm btn-ic" data-menu aria-label="Aksi">' + ikon('ellipsis-vertical') + '</button></td></tr>').join('') + '</tbody></table>' +
    '<div class="mlist">' + r.data.rows.map(u => '<div class="mitem" data-id="' + esc(u.id) + '"><span class="av ' + (u.peran === 'ADMIN' ? 'teal' : '') + '">' + esc(u.inisial) + '</span><div class="grow"><div class="mt">' + esc(u.nama) + '</div><div class="ms">' + esc(u.email) + '</div><div class="mm">' + (u.peran === 'ADMIN' ? '<span class="chip chip-teal">Admin</span>' : '<span class="chip chip-muted">Staf</span>') + (u.statusAktif === 'AKTIF' ? '<span class="chip chip-ok">Aktif</span>' : '<span class="chip chip-muted">Nonaktif</span>') + '</div></div><button class="btn btn-sm btn-ic" data-menu aria-label="Aksi">' + ikon('ellipsis-vertical') + '</button></div>').join('') + '</div></div>';
  $$('[data-menu]', box).forEach(b => b.onclick = e => {
    e.stopPropagation();
    const u = el._u.find(x => x.id === b.closest('[data-id]').dataset.id);
    const p = popover(b, '<button class="pi" data-a="ubah">' + ikon('pencil') + 'Ubah data & izin</button><button class="pi" data-a="reset">' + ikon('key-round') + 'Buat sandi sementara</button><button class="pi" data-a="cabut">' + ikon('log-out') + 'Akhiri semua sesinya</button>');
    p.querySelector('[data-a=ubah]').onclick = () => { tutupPop(); formPengguna(el, u); };
    p.querySelector('[data-a=reset]').onclick = async () => { tutupPop(); if (!await konfirmasi({ judul: 'Buat sandi sementara untuk ' + u.nama + '?', pesan: 'Sandi lama tidak berlaku dan semua sesinya berakhir. Pengguna wajib mengganti sandi saat masuk.', ok: 'Buat sandi' })) return; const x = await api('user.resetSandi', { id: u.id }); if (!x.success) return galat(x); tampilSandi(u, x.data.sandiAwal, x.message); muatPengguna(el); };
    p.querySelector('[data-a=cabut]').onclick = async () => { tutupPop(); const x = await api('user.cabutSesi', { id: u.id }); x.success ? toast(x.message) : galat(x); };
  });
  $$('[data-id]', box).forEach(r2 => r2.onclick = e => { if (!e.target.closest('[data-menu]')) formPengguna(el, el._u.find(x => x.id === r2.dataset.id)); });
}
function tampilSandi(u, sandi, pesan) {
  modal({ judul: 'Sandi sementara', sub: u.nama + ' · ' + u.email, ikon: 'key-round', kunci: true,
    isi: '<p>' + esc(pesan || '') + '</p><div class="qr-box mt12" style="justify-content:space-between"><span class="nomor-big">' + esc(sandi) + '</span><button class="btn btn-sm" data-salin>' + ikon('copy', 'sm') + 'Salin</button></div><div class="note warn mt12">' + ikon('triangle-alert', 'sm') + '<span>Sandi hanya tampil sekali dan tidak disimpan di mana pun. Sampaikan langsung ke pengguna; ia wajib menggantinya saat masuk pertama.</span></div>',
    onBuka: w => { $('[data-salin]', w).onclick = () => salin(sandi); }, tombol: [{ teks: 'Saya sudah mencatatnya', cls: 'btn-primary' }] });
}
function formPengguna(el, u) {
  const baru = !u; u = u || { peran: 'STAF', izin: ['surat_masuk', 'surat_keluar', 'pindah_masuk', 'pindah_keluar', 'spmb', 'gtk', 'cuti', 'ekspor'], statusAktif: 'AKTIF' };
  const dr = laci({
    judul: baru ? 'Tambah pengguna' : 'Ubah pengguna', sub: baru ? 'Sandi awal dibuat sistem dan wajib diganti saat masuk pertama.' : esc(u.email),
    isi: '<form class="form-grid" data-form novalidate><div class="field full" data-f="nama"><label>Nama lengkap <span class="req">*</span></label><input name="nama" value="' + esc(u.nama || '') + '"><div class="ferr" hidden></div></div>' +
      '<div class="field full" data-f="email"><label>Email (untuk masuk) <span class="req">*</span></label><input name="email" type="email" value="' + esc(u.email || '') + '"><div class="hint">Gunakan email Google bila login Google diaktifkan.</div><div class="ferr" hidden></div></div>' +
      '<div class="field"><label>Peran</label><select name="peran"><option value="STAF"' + (u.peran !== 'ADMIN' ? ' selected' : '') + '>Staf Tata Usaha</option><option value="ADMIN"' + (u.peran === 'ADMIN' ? ' selected' : '') + '>Admin Operator</option></select></div><div class="field"><label>Status</label><select name="statusAktif"><option value="AKTIF">Aktif</option><option value="NONAKTIF"' + (u.statusAktif === 'NONAKTIF' ? ' selected' : '') + '>Nonaktif</option></select></div>' +
      '<div class="field"><label>Bidang / tugas</label><input name="bidang" value="' + esc(u.bidang || '') + '" placeholder="Persuratan, Kesiswaan…"></div><div class="field" data-f="nomorHp"><label>No. HP / WhatsApp</label><input name="nomorHp" inputmode="tel" value="' + esc(u.nomorHp || '') + '" placeholder="08xxxxxxxxxx"><div class="ferr" hidden></div></div>' +
      '<div class="field full" data-izin><label>Izin modul (Staf)</label><div class="grid g2" style="gap:8px">' + (S.boot.izinList || []).map(x => '<label class="ck-box" style="background:' + (x[0] === 'pribadi' ? 'var(--wait-bg)' : 'var(--teal-tint)') + '"><input type="checkbox" value="' + x[0] + '"' + (u.izin.indexOf(x[0]) >= 0 ? ' checked' : '') + '> ' + esc(x[1]) + '</label>').join('') + '</div><div class="hint mt4">Izin "data pribadi" membuka NISN, tanggal lahir, nama ibu kandung, dan HP orang tua secara utuh.</div></div></form>',
    kaki: '<button class="btn" data-batal>Batal</button><button class="btn btn-primary" data-simpan>' + ikon('check') + 'Simpan</button>'
  });
  const form = $('[data-form]', dr.el), izinBox = $('[data-izin]', dr.el);
  const sinkron = () => { const adm = form.peran.value === 'ADMIN'; izinBox.style.opacity = adm ? '.5' : ''; $$('input', izinBox).forEach(c => { c.disabled = adm; }); };
  form.peran.onchange = sinkron; sinkron();
  $('[data-batal]', dr.el).onclick = () => dr.tutup();
  $('[data-simpan]', dr.el).onclick = e => sibuk(e.currentTarget, async () => {
    const data = { nama: form.nama.value.trim(), email: form.email.value.trim().toLowerCase(), peran: form.peran.value, statusAktif: form.statusAktif.value, bidang: form.bidang.value.trim(), nomorHp: form.nomorHp.value.trim(), izin: $$('input:checked', izinBox).map(c => c.value) };
    if (tandaiGalat(form, { nama: data.nama.length < 3 ? 'Minimal 3 karakter.' : '', email: V.email(data.email) ? '' : 'Format email tidak valid.', nomorHp: data.nomorHp && !V.hp(data.nomorHp) ? 'Nomor HP tidak valid.' : '' })) return;
    const x = await api('user.simpan', { id: baru ? '' : u.id, data });
    if (!x.success) { if (x.errors) tandaiGalat(form, x.errors); return galat(x); }
    dr.tutup(); muatPengguna(el);
    if (baru) tampilSandi(x.data.user, x.data.sandiAwal, x.message); else toast(x.message);
  });
}

/* ---------------------------------------------------------------------
 * Laporan & Ekspor
 * ------------------------------------------------------------------- */
daftarHalaman('laporan', {
  tampil(el, s, p, o) {
    if (o.baru) {
      const th = Number(hariIni().slice(0, 4));
      el.innerHTML = headHalaman({ crumbs: ['Laporan', 'Rekap'], judul: 'Laporan & Ekspor', sub: isAdmin() ? 'Rekap seluruh modul per bulan dan per kategori.' : 'Rekap modul yang menjadi tugas Anda.', aksi: '<select class="inp" data-th style="width:auto">' + [th, th - 1, th - 2, th - 3].map(y => '<option>' + y + '</option>').join('') + '</select><button class="btn" data-xl>' + ikon('file-spreadsheet') + 'Rekap Excel</button><button class="btn" data-pdf>' + ikon('file-down') + 'Rekap PDF</button>' }) + '<div data-isi><div class="card sk sk-blk"></div></div>';
      $('[data-th]', el).onchange = () => muatLaporan(el);
      $('[data-xl]', el).onclick = e => eksporRekap(el, 'xlsx', e.currentTarget);
      $('[data-pdf]', el).onclick = e => eksporRekap(el, 'pdf', e.currentTarget);
    }
    muatLaporan(el);
  }
});
function muatLaporan(el) {
  const tahun = $('[data-th]', el).value;
  return swr('lap:' + tahun, 'laporan.rekap', { tahun }, d => {
    el._lap = d;
    $('[data-isi]', el).innerHTML = '<div class="grid g2">' + d.modul.map(m => '<div class="card"><div class="card-h"><div class="ttl">' + esc(m.label) + '</div><a class="btn btn-sm" href="#/m/' + m.key + '">' + ikon('table', 'sm') + 'Data & ekspor</a></div>' +
      '<div class="grid g4" style="gap:10px"><div><div class="lbl">Total</div><div class="metric-n md">' + angka(m.total) + '</div></div><div><div class="lbl">Terverifikasi</div><div class="metric-n md ok-t">' + angka(m.verif) + '</div></div><div><div class="lbl">Menunggu</div><div class="metric-n md wait-t">' + angka(m.menunggu) + '</div></div><div><div class="lbl">Ditolak</div><div class="metric-n md no-t">' + angka(m.ditolak) + '</div></div></div>' +
      '<div class="mt16">' + grafikBatang(BLN, [{ nama: 'Total', warna: WARNA.or, data: m.bulanan.map(x => x.total) }, { nama: 'Terverifikasi', warna: WARNA.tealD, data: m.bulanan.map(x => x.verif) }], { tinggi: 170 }) + '</div>' +
      Object.keys(m.kategori).slice(0, 2).map(kk => { const kat = m.kategori[kk], tot = kat.data.reduce((a, x) => a + x.n, 0) || 1; return '<div class="lbl mt12 mb8">Per ' + esc(kat.label.toLowerCase()) + '</div>' + kat.data.slice(0, 5).map(x => '<div class="prog-row"><div class="pr-h"><span class="ellipsis">' + esc(x.nama) + '</span><span>' + x.n + '</span></div><div class="prog"><i class="teal" style="width:' + Math.round(x.n / tot * 100) + '%"></i></div></div>').join(''); }).join('') + '</div>').join('') + '</div>';
  }, { fresh: 60000, onError: r => { $('[data-isi]', el).innerHTML = galatHtml(r); pasangUlang(el, () => muatLaporan(el)); } });
}
async function eksporRekap(el, fmt, btn) {
  const d = el._lap; if (!d) return;
  const baris = [];
  d.modul.forEach(m => m.bulanan.forEach(b => baris.push({ modul: m.label, bulan: BULAN[Number(b.bulan.slice(5)) - 1], total: b.total, verif: b.verif, menunggu: b.menunggu, ditolak: b.ditolak })));
  const kol = [{ l: 'Modul', k: 'modul', w: 26 }, { l: 'Bulan', k: 'bulan', w: 12 }, { l: 'Total', k: 'total' }, { l: 'Terverifikasi', k: 'verif' }, { l: 'Menunggu', k: 'menunggu' }, { l: 'Ditolak', k: 'ditolak' }];
  await sibuk(btn, async () => { try { await (fmt === 'xlsx' ? eksporExcel : eksporPdf)('Rekap SIM TU ' + d.tahun, 'Rekap Data Tata Usaha Tahun ' + d.tahun, kol, baris, d.modul.map(m => m.label + ': ' + m.total).join(' · ')); toast('Rekap diekspor.'); } catch (e) { toast(e.message, 'err'); } });
}

/* ---------------------------------------------------------------------
 * Notifikasi WA & Email
 * ------------------------------------------------------------------- */
daftarHalaman('notifikasi', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) {
      el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Notifikasi'], judul: 'Notifikasi WhatsApp & Email', sub: 'Semua pesan lewat antrean dan dikirim trigger tiap menit — tidak memperlambat aplikasi. Lonceng di aplikasi selalu aktif.' }) + tabsHtml([['atur', 'Pengaturan', 'settings'], ['matriks', 'Matriks Event', 'list-checks'], ['antrean', 'Antrean', 'clock'], ['blast', 'Blast WA', 'megaphone']], 'atur') + '<div data-isi></div>';
      pasangTabs(el, t => tabNotif(el, t));
    }
    tabNotif(el, ($('[data-tabs] .on', el) || {}).dataset ? $('[data-tabs] .on', el).dataset.t : 'atur');
  }
});
async function tabNotif(el, t) {
  const box = $('[data-isi]', el);
  box.innerHTML = '<div class="card sk sk-blk"></div>';
  if (t === 'antrean') return antreanNotif(el, box);
  if (t === 'blast') return daftarBlast(el, box);
  const r = await api('notif.config');
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  const c = r.data;
  if (t === 'matriks') return matriksNotif(el, box, c);
  box.innerHTML = '<div class="grid g-12"><div class="card s7"><div class="card-h"><div class="ttl">Saklar & kredensial</div></div><form data-form novalidate class="flex-col gap16" style="display:flex">' +
    swHtml('waAktif', c.waAktif, 'Kirim WhatsApp (Fonnte)', c.tokenAda ? 'Token tersimpan: ' + c.token : 'Isi token Fonnte terlebih dahulu') + swHtml('emailAktif', c.emailAktif, 'Kirim Email (Gmail akun pemilik skrip)', 'Sisa kuota email hari ini: ' + (c.kuotaEmail == null ? '–' : c.kuotaEmail)) +
    '<div class="field"><label>Token Fonnte</label><div class="flex gap8"><input type="password" name="token" autocomplete="off" placeholder="' + (c.tokenAda ? 'Tersimpan (' + esc(c.token) + ') — isi untuk mengganti' : 'Tempel token dari dashboard Fonnte') + '">' + (c.tokenAda ? '<button type="button" class="btn btn-danger-soft" data-hapus-token>Hapus</button>' : '') + '</div><div class="hint">Disimpan di Script Properties, tidak pernah dikirim kembali ke browser.</div></div>' +
    '<div class="form-grid"><div class="field"><label>Ukuran batch blast</label><select name="batchDefault">' + [10, 20, 50].map(n => '<option' + (n === c.batchDefault ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div><div class="field"><label>Jeda antar pesan (detik)</label><input name="jeda" value="' + esc(c.jeda) + '" placeholder="5 atau 3-8"></div>' +
    '<div class="field"><label>Nama pengirim email</label><input name="namaPengirim" value="' + esc(c.namaPengirim) + '"></div><div class="field"><label>Alamat aplikasi (untuk tautan)</label><input name="appUrl" value="' + esc(c.appUrl) + '" placeholder="https://…github.io/…/"></div></div>' +
    swHtml('deteksiOtomatis', c.deteksiOtomatis, 'Cek otomatis nomor baru terdaftar WhatsApp', 'Maks. 50 nomor per 10 menit lewat Fonnte /validate') +
    '<div class="flex end"><button type="button" class="btn btn-primary" data-simpan>' + ikon('check') + 'Simpan pengaturan</button></div></form></div>' +
    '<div class="s5 flex-col gap16" style="display:flex"><div class="card"><div class="card-h"><div class="ttl">Status</div></div><div class="kv-box"><div class="kv-row"><span class="k">Trigger antrean</span><span class="v">' + (c.trigger ? '<span class="chip chip-ok">Aktif tiap menit</span>' : '<span class="chip chip-no">Belum terpasang</span>') + '</span></div><div class="kv-row"><span class="k">Perangkat WA</span><span class="v" data-dev><button class="btn btn-sm" data-cek>' + ikon('smartphone', 'sm') + 'Cek perangkat</button></span></div><div class="kv-row"><span class="k">Kuota email</span><span class="v">' + (c.kuotaEmail == null ? '–' : c.kuotaEmail + ' tersisa') + '</span></div></div></div>' +
    '<div class="card"><div class="card-h"><div class="ttl">Uji kirim</div></div><div class="flex gap8"><input class="inp" data-twa placeholder="08xxxxxxxxxx" inputmode="tel"><button class="btn" data-uwa>' + ikon('message-circle', 'sm') + 'WA</button></div><div class="flex gap8 mt8"><input class="inp" data-tem placeholder="email@contoh.sch.id" type="email" value="' + esc(S.me.email || '') + '"><button class="btn" data-uem>' + ikon('mail', 'sm') + 'Email</button></div><div class="hint mt8">Uji kirim langsung (tanpa antrean) untuk memastikan kredensial benar.</div></div></div></div>';
  const form = $('[data-form]', box);
  $('[data-simpan]', box).onclick = e => sibuk(e.currentTarget, async () => {
    const d = { waAktif: form.waAktif.checked, emailAktif: form.emailAktif.checked, batchDefault: Number(form.batchDefault.value), jeda: form.jeda.value.trim(), namaPengirim: form.namaPengirim.value.trim(), appUrl: form.appUrl.value.trim(), deteksiOtomatis: form.deteksiOtomatis.checked };
    if (form.token.value.trim()) d.token = form.token.value.trim();
    const x = await api('notif.configSave', d); if (!x.success) return galat(x);
    toast(x.message || 'Tersimpan.'); tabNotif(el, 'atur');
  });
  const ht = $('[data-hapus-token]', box);
  if (ht) ht.onclick = async () => { if (!await konfirmasi({ judul: 'Hapus token Fonnte?', pesan: 'Pengiriman WhatsApp berhenti sampai token baru diisi.', ok: 'Hapus token', bahaya: true })) return; const x = await api('notif.configSave', { token: '__HAPUS__', waAktif: false }); x.success ? (toast('Token dihapus.'), tabNotif(el, 'atur')) : galat(x); };
  $('[data-cek]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('wa.device'); $('[data-dev]', box).innerHTML = x.success ? '<span class="chip ' + (/connect/.test(x.data.status) && !/disconnect/.test(x.data.status) ? 'chip-ok' : 'chip-no') + '">' + esc(x.data.status) + '</span><div class="xs muted">' + esc(x.data.device || '') + ' · kuota ' + esc(x.data.kuota) + ' · s.d. ' + esc(x.data.kedaluwarsa) + '</div>' : '<span class="small no-t">' + esc(x.message) + '</span>'; });
  $('[data-uwa]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('wa.test', { nomor: $('[data-twa]', box).value }); x.success ? toast(x.message) : galat(x); });
  $('[data-uem]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('email.test', { email: $('[data-tem]', box).value }); x.success ? toast(x.message) : galat(x); });
}
function matriksNotif(el, box, c) {
  const ev = Object.keys(c.matriks).map(k => c.matriks[k]);
  box.innerHTML = '<div class="card p0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th class="ctr">WhatsApp</th><th class="ctr">Email</th><th></th></tr></thead><tbody>' + ev.map(e => '<tr data-ev="' + e.kode + '"><td><b>' + esc(e.label) + '</b><div class="sub mono">' + esc(e.kode) + '</div></td><td class="ctr"><label class="switch"><input type="checkbox" data-wa' + (e.wa ? ' checked' : '') + '><span class="sl"></span></label></td><td class="ctr"><label class="switch"><input type="checkbox" data-em' + (e.email ? ' checked' : '') + '><span class="sl"></span></label></td><td class="right"><button class="btn btn-sm" data-edit>' + ikon('pencil', 'sm') + 'Pesan</button></td></tr>').join('') + '</tbody></table></div><div class="tbl-foot"><span>Saklar utama per kanal tetap berlaku (tab Pengaturan).</span><button class="btn btn-primary" data-simpan>' + ikon('check') + 'Simpan matriks</button></div></div>';
  const m = JSON.parse(JSON.stringify(c.matriks));
  $$('[data-ev]', box).forEach(tr => {
    const e = m[tr.dataset.ev];
    $('[data-wa]', tr).onchange = x => { e.wa = x.target.checked; };
    $('[data-em]', tr).onchange = x => { e.email = x.target.checked; };
    $('[data-edit]', tr).onclick = () => modal({
      judul: 'Isi pesan', sub: e.label, ukuran: 'lg',
      isi: '<div class="field"><label>Subjek email</label><input data-s value="' + esc(e.subjek) + '"></div><div class="field mt12"><label>Isi pesan (WA & email)</label><textarea data-p rows="7">' + esc(e.pesan) + '</textarea><div class="hint">Variabel: ' + (e.pesanDefault.match(/\{\w+\}/g) || []).filter((v, i, a) => a.indexOf(v) === i).map(v => '<span class="mono">' + esc(v) + '</span>').join(' ') + ' · *tebal* untuk WhatsApp</div></div>',
      tombol: [{ teks: 'Kembalikan bawaan', aksi: (t, w) => { $('[data-s]', w).value = e.subjekDefault; $('[data-p]', w).value = e.pesanDefault; return false; } }, { teks: 'Pakai', cls: 'btn-primary', aksi: (t, w) => { e.subjek = $('[data-s]', w).value; e.pesan = $('[data-p]', w).value; toast('Klik "Simpan matriks" untuk menyimpan.'); return true; } }]
    });
  });
  $('[data-simpan]', box).onclick = ev2 => sibuk(ev2.currentTarget, async () => { const x = await api('notif.configSave', { matriks: m }); x.success ? toast('Matriks notifikasi tersimpan.') : galat(x); });
}
async function antreanNotif(el, box, filter) {
  filter = filter || el._nf || {};
  el._nf = filter;
  const r = await api('notif.queue', filter);
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  const d = r.data, rg = d.ringkas;
  box.innerHTML = '<div class="grid g4 mb16">' + [['Antri', 'clock', 'wait'], ['Terkirim', 'circle-check', 'ok'], ['Gagal', 'circle-x', 'no'], ['Batal', 'minus', '']].map(x => metricHtml({ ikon: x[1], label: x[0], nilai: angka(rg[x[0]] || 0), warna: x[2], klik: '' })).join('') + '</div>' +
    '<div class="card p0"><div class="toolbar"><select class="inp" data-st><option value="">Semua status</option>' + ['Antri', 'Terkirim', 'Gagal', 'Batal'].map(s => '<option' + (filter.status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select><select class="inp" data-kn><option value="">Semua kanal</option><option' + (filter.kanal === 'WA' ? ' selected' : '') + '>WA</option><option' + (filter.kanal === 'EMAIL' ? ' selected' : '') + '>EMAIL</option></select><span class="grow"></span><button class="btn" data-retry>' + ikon('rotate-ccw') + 'Coba ulang yang gagal</button><button class="btn btn-primary" data-proses>' + ikon('send') + 'Proses sekarang</button></div>' +
    (d.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dibuat</th><th>Kanal</th><th>Penerima</th><th>Kejadian</th><th>Pesan</th><th>Status</th></tr></thead><tbody>' + d.rows.map(x => '<tr><td class="nowrap">' + esc(relatif(x.dibuat)) + '</td><td><span class="chip ' + (x.kanal === 'WA' ? 'chip-ok' : 'chip-teal') + '">' + esc(x.kanal) + '</span></td><td><b>' + esc(x.nama || '-') + '</b><div class="sub mono">' + esc(x.tujuan) + '</div></td><td class="small">' + esc(x.event) + '</td><td class="wrap-t small">' + esc(x.pesan) + '</td><td>' + '<span class="chip ' + ({ Terkirim: 'chip-ok', Gagal: 'chip-no', Antri: 'chip-wait' }[x.status] || 'chip-muted') + '">' + esc(x.status) + '</span>' + (x.respon && x.status !== 'Terkirim' ? '<div class="sub">' + esc(x.respon) + '</div>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : kosongHtml('inbox', 'Antrean kosong', 'Belum ada pesan pada filter ini.')) + '</div>';
  $('[data-st]', box).onchange = e => antreanNotif(el, box, Object.assign({}, filter, { status: e.target.value }));
  $('[data-kn]', box).onchange = e => antreanNotif(el, box, Object.assign({}, filter, { kanal: e.target.value }));
  $('[data-retry]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('notif.retry', {}); x.success ? (toast(x.message), antreanNotif(el, box)) : galat(x); });
  $('[data-proses]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('notif.processNow', {}, { timeout: 300000 }); if (!x.success) return galat(x); toast(x.data.info || (x.data.berhasil + ' dari ' + x.data.dikirim + ' pesan terkirim.')); antreanNotif(el, box); });
}
async function daftarBlast(el, box) {
  const r = await api('wa.blastList');
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  box.innerHTML = '<div class="flex between mb16 wrap gap8"><div class="small t2">Blast dikirim bertahap per batch tiap menit oleh trigger. Nomor ganda & opt-out dibuang otomatis.</div><button class="btn btn-primary" data-baru>' + ikon('megaphone') + 'Blast baru</button></div>' +
    (r.data.length ? '<div class="grid g2">' + r.data.map(b => '<div class="card" data-b="' + esc(b.id) + '"><div class="flex between gap8"><div><div class="b">' + esc(b.judul) + '</div><div class="xs muted">' + esc(b.sasaran) + ' · ' + esc(fmtWaktu(b.tanggal)) + ' · ' + esc(b.oleh) + '</div></div><span class="chip ' + (b.status === 'Selesai' ? 'chip-ok' : b.status === 'Berjalan' ? 'chip-wait' : 'chip-muted') + '">' + esc(b.status) + '</span></div><div class="prog mt12"><i style="width:' + b.persen + '%"></i></div><div class="flex between mt8 xs muted b"><span>' + b.terkirim + ' terkirim · ' + b.gagal + ' gagal · ' + b.sisa + ' sisa</span><span>batch ' + b.ukuranBatch + ' · jeda ' + esc(b.jeda) + ' dtk</span></div>' + (b.status === 'Berjalan' ? '<div class="flex gap8 mt12"><button class="btn btn-sm" data-proses>' + ikon('play', 'sm') + 'Kirim batch sekarang</button><button class="btn btn-sm btn-danger-soft" data-stop>' + ikon('square', 'sm') + 'Hentikan</button></div>' : '') + '</div>').join('') + '</div>' : '<div class="card">' + kosongHtml('megaphone', 'Belum ada blast', 'Kirim pengumuman ke wali murid, guru, atau kontak CRM per batch.') + '</div>');
  $('[data-baru]', box).onclick = () => formBlast(el, box);
  $$('[data-b]', box).forEach(c => {
    const id = c.dataset.b, p = $('[data-proses]', c), s = $('[data-stop]', c);
    if (p) p.onclick = () => sibuk(p, async () => { const x = await api('wa.blastProcess', { blastId: id }, { timeout: 300000 }); if (!x.success) return galat(x); toast((x.data.proses.berhasil || 0) + ' pesan terkirim pada batch ini.'); daftarBlast(el, box); });
    if (s) s.onclick = async () => { if (!await konfirmasi({ judul: 'Hentikan blast?', pesan: 'Pesan yang belum terkirim dibatalkan.', ok: 'Hentikan', bahaya: true })) return; const x = await api('wa.blastStop', { blastId: id }); x.success ? (toast(x.message), daftarBlast(el, box)) : galat(x); };
  });
}
function formBlast(el, box) {
  let aud = null;
  const segmen = ['Guru', 'Tenaga Kependidikan', 'Staf TU', 'Wali Murid', 'Wali Murid Pindah Keluar', 'Komite', 'Mitra / Lainnya'];
  const dr = laci({
    judul: 'Blast WhatsApp baru', sub: 'Pilih penerima → tulis pesan → kirim bertahap', lebar: true,
    isi: '<div class="tabs" data-sb><button class="on" data-m="crm">Dari CRM Kontak</button><button data-m="manual">Tempel manual</button></div>' +
      '<div data-p="crm" class="form-grid"><div class="field"><label>Segmen</label><select data-seg><option value="">Semua segmen</option>' + segmen.map(s => '<option>' + s + '</option>').join('') + '</select></div><div class="field"><label>Tag</label><input data-tag placeholder="mis. komite"></div><div class="field"><label>Status WA</label><select data-swa><option value="">Semua</option><option>Terdaftar</option><option>Tidak Terdaftar</option></select></div><div class="field" style="justify-content:flex-end"><button type="button" class="btn" data-muat>' + ikon('users', 'sm') + 'Tampilkan penerima</button></div></div>' +
      '<div data-p="manual" hidden class="field"><label>Satu baris per penerima: <span class="mono">nomor|nama</span></label><textarea data-man rows="5" placeholder="081234567890|Bapak La Ode&#10;082233445566|Ibu Wa Ode"></textarea><button type="button" class="btn btn-sm mt8" data-muat2>Periksa daftar</button></div>' +
      '<div data-aud class="mt12"></div>' +
      '<div class="sec-t">Pesan</div><div class="form-grid"><div class="field full"><label>Judul blast (internal)</label><input data-jd placeholder="Undangan rapat komite Oktober"></div><div class="field full"><label>Isi pesan</label><textarea data-ps rows="6" placeholder="Yth. {nama},&#10;…"></textarea><div class="hint">Variabel: <span class="mono">{nama}</span> <span class="mono">{siswa}</span> <span class="mono">{kelas}</span> <span class="mono">{jabatan}</span> <span class="mono">{institusi}</span> <span class="mono">{link}</span> · *tebal*</div></div>' +
      '<div class="field"><label>Ukuran batch</label><div class="seg" data-bt>' + [10, 20, 50].map(n => '<button type="button" data-n="' + n + '"' + (n === Number(S.setting.WA_BATCH_DEFAULT || 20) ? ' class="on"' : '') + '>' + n + ' / menit</button>').join('') + '</div></div><div class="field"><label>Jeda antar pesan (detik)</label><input data-jeda value="' + esc(S.setting.WA_JEDA_DETIK || '5') + '"></div></div>' +
      '<div class="note warn mt16">' + ikon('triangle-alert', 'sm') + '<span>Kirim hanya pesan yang relevan bagi penerima. Blast massal berlebihan berisiko nomor WhatsApp sekolah diblokir.</span></div>',
    kaki: '<button class="btn" data-batal>Batal</button><button class="btn btn-primary" data-kirim disabled>' + ikon('send') + 'Buat & kirim bertahap</button>'
  });
  let mode = 'crm';
  $$('[data-sb] button', dr.el).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('[data-sb] button', dr.el).forEach(x => x.classList.toggle('on', x === b)); $$('[data-p]', dr.el).forEach(p => { p.hidden = p.dataset.p !== mode; }); aud = null; $('[data-aud]', dr.el).innerHTML = ''; $('[data-kirim]', dr.el).disabled = true; });
  $$('[data-bt] button', dr.el).forEach(b => b.onclick = () => $$('[data-bt] button', dr.el).forEach(x => x.classList.toggle('on', x === b)));
  const muat = btn => sibuk(btn, async () => {
    const q = mode === 'manual' ? { sumber: 'manual', manual: $('[data-man]', dr.el).value } : { segmen: $('[data-seg]', dr.el).value, tag: $('[data-tag]', dr.el).value.trim(), statusWA: $('[data-swa]', dr.el).value };
    const x = await api('wa.audience', q); if (!x.success) return galat(x);
    aud = x.data;
    const rg = aud.ringkas;
    $('[data-aud]', dr.el).innerHTML = '<div class="grid g4" style="gap:8px">' + [['Total', rg.total], ['Valid', rg.valid], ['Ganda/rusak', rg.ganda + rg.tidakValid], ['Opt-out', rg.optOut]].map(a => '<div class="kv-box" style="padding:8px 12px"><div class="xs muted">' + a[0] + '</div><div class="b">' + a[1] + '</div></div>').join('') + '</div><div class="small t2 mt8">Penerima akhir: <b>' + Math.max(0, rg.valid - rg.optOut) + '</b> nomor (ganda, rusak, dan opt-out dibuang saat dibuat).</div>';
    $('[data-kirim]', dr.el).disabled = !rg.valid;
  });
  $('[data-muat]', dr.el).onclick = e => muat(e.currentTarget);
  $('[data-muat2]', dr.el).onclick = e => muat(e.currentTarget);
  $('[data-batal]', dr.el).onclick = () => dr.tutup();
  $('[data-kirim]', dr.el).onclick = e => sibuk(e.currentTarget, async () => {
    const judul = $('[data-jd]', dr.el).value.trim(), pesan = $('[data-ps]', dr.el).value.trim();
    if (!judul || pesan.length < 5) return toast('Isi judul dan pesan.', 'warn');
    const batch = Number(($('[data-bt] .on', dr.el) || {}).dataset.n || 20);
    const penerima = aud.rows.filter(r => r.valid && !r.ganda && !r.optOut).map(r => ({ hp: r.hp, nama: r.nama, id: r.id, info: r.info }));
    if (!await konfirmasi({ judul: 'Kirim ke ' + penerima.length + ' penerima?', pesan: 'Dikirim ' + batch + ' pesan per menit (±' + Math.ceil(penerima.length / batch) + ' menit).', ok: 'Kirim' })) return;
    const x = await api('wa.blastCreate', { judul, pesan, ukuranBatch: batch, jeda: $('[data-jeda]', dr.el).value.trim(), penerima, sasaran: mode === 'manual' ? 'Daftar manual' : ['CRM', $('[data-seg]', dr.el).value, $('[data-tag]', dr.el).value].filter(String).join(' · ') });
    if (!x.success) return galat(x);
    toast(x.message); dr.tutup(); daftarBlast(el, box);
  });
}

/* ---------------------------------------------------------------------
 * CRM Kontak
 * ------------------------------------------------------------------- */
daftarHalaman('crm', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) {
      el._f = { cari: '', segmen: '', sumber: '', tag: '', statusWA: '', duplikat: false, masalah: false, halaman: 1 };
      el._pilih = new Set();
      el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'CRM Kontak'], judul: 'CRM Kontak', sub: 'Satu daftar Nama · Email · WhatsApp dari data GTK, staf, dan orang tua siswa — plus kontak komite & mitra.', aksi: '<button class="btn" data-dup>' + ikon('git-merge') + 'Duplikat</button><button class="btn" data-imp>' + ikon('upload') + 'Impor</button><button class="btn" data-eks>' + ikon('download') + 'Ekspor</button><button class="btn btn-primary" data-sync>' + ikon('refresh-cw') + 'Sinkron</button>' }) +
        '<div class="grid g4 mb16" data-stat>' + Array(4).fill('<div class="card sk" style="height:100px"></div>').join('') + '</div><div class="card p0"><div class="toolbar"><label class="inp-ic">' + ikon('search', 'sm') + '<input class="inp" data-q placeholder="Cari nama, nomor, email, nama siswa…"></label><select class="inp" data-seg><option value="">Semua segmen</option></select><select class="inp" data-swa><option value="">Status WA</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option>Belum dicek</option></select><label class="check small"><input type="checkbox" data-dupf> Duplikat</label><label class="check small"><input type="checkbox" data-mas> Tak terjangkau</label></div><div class="toolbar" data-bulk hidden style="background:#FFF7F2"></div><div data-tabel>' + skeletonTabel(6) + '</div><div class="tbl-foot" data-foot hidden></div></div>';
      const f = el._f, ulang = () => { f.halaman = 1; muatCrm(el); };
      $('[data-q]', el).addEventListener('input', debounce(e => { f.cari = e.target.value.trim(); ulang(); }, 350));
      $('[data-seg]', el).onchange = e => { f.segmen = e.target.value; ulang(); };
      $('[data-swa]', el).onchange = e => { f.statusWA = e.target.value; ulang(); };
      $('[data-dupf]', el).onchange = e => { f.duplikat = e.target.checked; ulang(); };
      $('[data-mas]', el).onchange = e => { f.masalah = e.target.checked; ulang(); };
      $('[data-sync]', el).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('crm.sync', {}); if (!x.success) return galat(x); toast(x.message); muatCrm(el); });
      $('[data-dup]', el).onclick = () => duplikatCrm(el);
      $('[data-imp]', el).onclick = () => imporCrm(el);
      $('[data-eks]', el).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('crm.export', el._f); if (!x.success) return galat(x); try { await eksporExcel('CRM Kontak ' + hariIni(), 'CRM Kontak', [{ l: 'Nama', k: 'nama', w: 28 }, { l: 'WhatsApp', k: 'noWA', w: 16 }, { l: 'Email', k: 'email', w: 28 }, { l: 'Segmen', k: 'segmen', w: 18 }, { l: 'Sumber', k: 'sumber' }, { l: 'Tag', v: r => r.tag.join(', '), w: 20 }, { l: 'Status WA', k: 'statusWA', w: 14 }, { l: 'Opt-out', v: r => r.optOut ? 'YA' : '' }, { l: 'Jumlah pesan', k: 'jumlahPesan' }, { l: 'Catatan', k: 'catatan', w: 30 }], x.data.rows); toast(x.data.rows.length + ' kontak diekspor.'); } catch (er) { toast(er.message, 'err'); } });
    }
    muatCrm(el);
  }
});
async function muatCrm(el) {
  api('crm.stats').then(x => {
    if (!x.success) return;
    const s = x.data;
    $('[data-stat]', el).innerHTML = metricHtml({ ikon: 'book-user', label: 'Total kontak', sub: s.baru7 + ' baru 7 hari', nilai: angka(s.total) }) + metricHtml({ ikon: 'message-circle', label: 'Terdaftar WhatsApp', sub: s.waValid + ' nomor valid · ' + s.belumCek + ' belum dicek', nilai: angka(s.terdaftarWA), warna: 'ok' }) + metricHtml({ ikon: 'mail', label: 'Email valid', sub: s.dihubungi30 + ' dihubungi 30 hari', nilai: angka(s.emailValid), warna: 'teal' }) + metricHtml({ ikon: 'triangle-alert', label: 'Perlu dibenahi', sub: s.duplikat + ' duplikat · ' + s.optOut + ' opt-out', nilai: angka(s.takTerjangkau), satuan: 'tak terjangkau', warna: 'wait' });
    const seg = $('[data-seg]', el), v = seg.value;
    seg.innerHTML = '<option value="">Semua segmen</option>' + Object.keys(s.segmen).sort().map(k => '<option value="' + esc(k) + '"' + (k === v ? ' selected' : '') + '>' + esc(k) + ' (' + s.segmen[k] + ')</option>').join('');
  });
  const r = await api('crm.list', Object.assign({ per: 50 }, el._f));
  const box = $('[data-tabel]', el), foot = $('[data-foot]', el);
  if (!r.success) { box.innerHTML = galatHtml(r); pasangUlang(box, () => muatCrm(el)); return; }
  const d = r.data;
  el._rows = d.rows;
  if (!d.rows.length) { box.innerHTML = kosongHtml('book-user', d.total === 0 && !el._f.cari ? 'Belum ada kontak' : 'Tidak ada kontak yang cocok', d.syncTerakhir ? 'Sinkron terakhir ' + relatif(new Date(d.syncTerakhir + 8 * 3600e3).toISOString().slice(0, 19)) : 'Tekan Sinkron untuk menarik kontak dari data GTK, staf, dan orang tua.'); foot.hidden = true; return; }
  box.innerHTML = '<div class="tbl-wrap tbl-resp"><table class="tbl"><thead><tr><th class="cb"><input type="checkbox" data-all aria-label="Pilih semua"></th><th>Kontak</th><th>WhatsApp</th><th>Email</th><th>Segmen</th><th>Tag</th><th>Pesan</th></tr></thead><tbody>' + d.rows.map(k => '<tr class="klik" data-id="' + esc(k.id) + '"><td class="cb"><input type="checkbox" data-cb="' + esc(k.id) + '"' + (el._pilih.has(k.id) ? ' checked' : '') + '></td><td><b>' + esc(k.nama) + '</b>' + (k.duplikat ? ' <span class="chip chip-or">ganda</span>' : '') + (k.optOut ? ' <span class="chip chip-muted">opt-out</span>' : '') + '<div class="sub">' + esc(Object.values(k.info || {}).filter(String).slice(0, 2).join(' · ')) + '</div></td><td class="nowrap"><span class="mono">' + esc(k.noWA || '–') + '</span>' + (k.statusWA ? '<div class="sub ' + (k.statusWA === 'Terdaftar' ? 'ok-t' : 'no-t') + '">' + esc(k.statusWA) + '</div>' : '') + '</td><td class="small">' + esc(k.email || '–') + '</td><td>' + esc(k.segmen) + '</td><td>' + k.tag.map(t => '<span class="tag" style="margin:1px">' + esc(t) + '</span>').join('') + '</td><td class="right">' + k.jumlahPesan + '</td></tr>').join('') + '</tbody></table>' +
    '<div class="mlist">' + d.rows.map(k => '<div class="mitem" data-id="' + esc(k.id) + '"><input type="checkbox" data-cb="' + esc(k.id) + '"' + (el._pilih.has(k.id) ? ' checked' : '') + ' style="margin-top:4px"><div class="grow"><div class="mt">' + esc(k.nama) + '</div><div class="ms mono">' + esc(k.noWA || k.email || '–') + '</div><div class="mm"><span>' + esc(k.segmen) + '</span>' + (k.statusWA ? '<span class="' + (k.statusWA === 'Terdaftar' ? 'ok-t' : 'no-t') + '">' + esc(k.statusWA) + '</span>' : '') + '</div></div></div>').join('') + '</div></div>';
  $$('[data-id]', box).forEach(tr => tr.onclick = e => { if (e.target.matches('input')) return; detailKontak(el, tr.dataset.id); });
  $$('[data-cb]', box).forEach(c => c.onchange = () => { c.checked ? el._pilih.add(c.dataset.cb) : el._pilih.delete(c.dataset.cb); bulkCrm(el); });
  const all = $('[data-all]', box); if (all) all.onchange = () => { d.rows.forEach(k => all.checked ? el._pilih.add(k.id) : el._pilih.delete(k.id)); $$('[data-cb]', box).forEach(c => { c.checked = all.checked; }); bulkCrm(el); };
  foot.hidden = false; foot.innerHTML = pagerHtml(d.total, d.halaman, d.per);
  $$('[data-pg]', foot).forEach(b => b.onclick = () => { el._f.halaman = +b.dataset.pg; muatCrm(el); });
  bulkCrm(el);
}
function bulkCrm(el) {
  const bar = $('[data-bulk]', el), n = el._pilih.size;
  bar.hidden = !n;
  if (!n) return;
  bar.innerHTML = '<b class="small">' + n + ' dipilih</b><button class="btn btn-sm" data-b="tag">' + ikon('tag', 'sm') + 'Beri tag</button><button class="btn btn-sm" data-b="untag">Lepas tag</button><button class="btn btn-sm" data-b="deteksiWA">' + ikon('message-circle', 'sm') + 'Cek WA</button><button class="btn btn-sm" data-b="optout">Opt-out</button><button class="btn btn-sm" data-b="optin">Opt-in</button><button class="btn btn-sm btn-danger-soft" data-b="hapusManual">' + ikon('trash-2', 'sm') + 'Hapus (impor manual)</button><button class="btn btn-sm btn-link" data-b="batal">Batal pilih</button>';
  $$('[data-b]', bar).forEach(b => b.onclick = async () => {
    const aksi = b.dataset.b;
    if (aksi === 'batal') { el._pilih.clear(); muatCrm(el); return; }
    let nilai = '';
    if (aksi === 'tag' || aksi === 'untag') { const o = await new Promise(res => modal({ judul: aksi === 'tag' ? 'Beri tag' : 'Lepas tag', isi: '<div class="field"><label>Nama tag</label><input data-v list="dl_tag" maxlength="30" placeholder="mis. komite"></div>', onTutup: () => res(null), tombol: [{ teks: 'Batal' }, { teks: 'Terapkan', cls: 'btn-primary', aksi: (t, w) => { res($('[data-v]', w).value.trim()); return true; } }] })); if (!o) return; nilai = o; }
    if (aksi === 'hapusManual' && !await konfirmasi({ judul: 'Hapus kontak impor manual?', pesan: 'Hanya kontak bersumber impor manual yang dihapus. Kontak dari data sekolah tetap.', ok: 'Hapus', bahaya: true })) return;
    await sibuk(b, async () => { const x = await api('crm.bulk', { ids: Array.from(el._pilih), aksi, nilai }); if (!x.success) return galat(x); toast(x.message); el._pilih.clear(); muatCrm(el); });
  });
}
async function detailKontak(el, id) {
  const dr = laci({ judul: 'Kontak', isi: '<div class="sk sk-blk"></div>' });
  const r = await api('crm.detail', { kontakId: id });
  if (!r.success) { dr.body.innerHTML = galatHtml(r); return; }
  const { kontak: k, timeline, tautan, sumberLabel } = r.data;
  dr.setJudul(esc(k.nama), esc(k.segmen) + ' · sumber ' + esc(sumberLabel));
  dr.body.innerHTML = '<form class="form-grid" data-form novalidate><div class="field full"><label>Nama</label><input name="nama" value="' + esc(k.nama) + '"></div><div class="field"><label>WhatsApp</label><input name="noWA" value="' + esc(k.noWA) + '" inputmode="tel"></div><div class="field"><label>Email</label><input name="email" value="' + esc(k.email) + '" type="email"></div><div class="field full"><label>Tag (pisahkan koma)</label><input name="tag" value="' + esc(k.tag.join(', ')) + '"></div><div class="field full"><label>Catatan</label><textarea name="catatan" rows="2">' + esc(k.catatan) + '</textarea></div><div class="full">' + swHtml('optOut', k.optOut, 'Tidak ingin menerima blast (opt-out)', 'Notifikasi sistem tetap dikirim') + '</div></form>' +
    (k.sumber !== 'manual' ? '<div class="note mt12">' + ikon('info', 'sm') + '<span>Perubahan nama/nomor/email ditulis balik ke data sumber (' + esc(sumberLabel) + ').' + (tautan ? ' <a href="' + esc(tautan) + '">Buka data sumber</a>' : '') + '</span></div>' : '') +
    (Object.keys(k.info || {}).length ? '<div class="sec-t">Info</div><div class="kv-box">' + Object.keys(k.info).filter(x => k.info[x]).map(x => '<div class="kv-row"><span class="k">' + esc(x) + '</span><span class="v">' + esc(k.info[x]) + '</span></div>').join('') + '</div>' : '') +
    '<div class="sec-t">Catat interaksi</div><div class="flex gap8"><select class="inp" data-kanal style="width:auto"><option>Telepon</option><option>WA Manual</option><option>Kunjungan</option><option>Catatan</option></select><input class="inp" data-ring placeholder="Ringkasan interaksi…"><button class="btn" data-int>' + ikon('plus', 'sm') + '</button></div>' +
    '<div class="sec-t">Riwayat</div><div class="timeline">' + (timeline.length ? timeline.map(t => '<div class="tl-i ' + (t.status === 'Terkirim' ? 'ok' : t.status === 'Gagal' ? 'no' : '') + '"><div class="ta">' + esc(t.jenis) + ' · ' + esc(t.kanal) + ' <span class="xs muted">' + esc(t.status) + '</span></div><div class="tw">' + esc(fmtWaktu(t.waktu)) + (t.oleh ? ' · ' + esc(t.oleh) : '') + '</div><div class="tc">' + esc(t.ringkasan) + '</div></div>').join('') : '<div class="small muted">Belum ada interaksi.</div>') + '</div>';
  dr.setKaki('<button class="btn" data-tutup>Tutup</button><button class="btn btn-primary" data-simpan>' + ikon('check') + 'Simpan</button>');
  $('[data-tutup]', dr.el).onclick = () => dr.tutup();
  const form = $('[data-form]', dr.el);
  $('[data-simpan]', dr.el).onclick = e => sibuk(e.currentTarget, async () => {
    const x = await api('crm.save', { kontak: { id: k.id, nama: form.nama.value.trim(), noWA: form.noWA.value.trim(), email: form.email.value.trim(), tag: form.tag.value.split(',').map(s => s.trim()).filter(String), catatan: form.catatan.value, optOut: form.optOut.checked } });
    if (!x.success) return galat(x); toast('Kontak tersimpan.'); dr.tutup(); muatCrm(el);
  });
  $('[data-int]', dr.el).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('crm.interaksi', { kontakId: k.id, kanal: $('[data-kanal]', dr.el).value, ringkasan: $('[data-ring]', dr.el).value }); if (!x.success) return galat(x); dr.tutup(); detailKontak(el, k.id); });
}
async function duplikatCrm(el) {
  const m = modal({ judul: 'Kontak ganda', sub: 'Pilih kontak utama, lalu gabungkan sisanya (tag, catatan, jumlah pesan digabung).', ukuran: 'lg', isi: '<div class="sk sk-blk"></div>' });
  const r = await api('crm.duplikat');
  const b = $('.modal-b', m.el);
  if (!r.success) { b.innerHTML = galatHtml(r); return; }
  if (!r.data.length) { b.innerHTML = kosongHtml('check-check', 'Tidak ada kontak ganda', ''); return; }
  b.innerHTML = r.data.map((g, i) => '<div class="card mb12" data-g="' + i + '"><div class="lbl mb8">' + esc(g.kunci) + '</div>' + g.kontak.map((k, j) => '<label class="check" style="display:flex;padding:6px 0"><input type="radio" name="u' + i + '" value="' + esc(k.id) + '"' + (j === 0 ? ' checked' : '') + '> <b>' + esc(k.nama) + '</b> <span class="xs muted">' + esc(k.segmen + ' · ' + k.sumber) + '</span></label>').join('') + '<button class="btn btn-sm btn-primary mt8" data-gab>' + ikon('git-merge', 'sm') + 'Gabungkan</button></div>').join('');
  $$('[data-g]', b).forEach(c => $('[data-gab]', c).onclick = e => sibuk(e.currentTarget, async () => {
    const g = r.data[+c.dataset.g], u = $('input:checked', c).value;
    const x = await api('crm.merge', { utama: u, gabung: g.kontak.map(k => k.id).filter(x2 => x2 !== u) });
    if (!x.success) return galat(x); toast(x.message); c.remove(); muatCrm(el);
  }));
}
function imporCrm(el) {
  modal({
    judul: 'Impor kontak', sub: 'Excel/CSV dengan kolom Nama, WA/HP, Email, Segmen, Tag', ikon: 'upload',
    isi: '<div class="field"><label>Berkas (.xlsx, .xls, .csv)</label><input type="file" data-f accept=".xlsx,.xls,.csv"></div><div class="hint mt8">Kontak dengan nomor yang sama akan diperbarui (tidak dobel). Baris tanpa nomor & email valid dilewati.</div>',
    tombol: [{ teks: 'Batal' }, {
      teks: 'Impor', cls: 'btn-primary', aksi: async (t, w) => {
        const f = $('[data-f]', w).files[0]; if (!f) { toast('Pilih berkas.', 'warn'); return false; }
        try {
          const { header, rows } = await bacaTabel(f);
          const idx = n => header.findIndex(h => n.some(x => normKolom(h) === x));
          const iN = idx(['nama', 'nama lengkap', 'name']), iW = idx(['wa', 'whatsapp', 'hp', 'no hp', 'nomor hp', 'nomor wa', 'telepon']), iE = idx(['email', 'e mail', 'surel']), iS = idx(['segmen', 'kelompok']), iT = idx(['tag', 'label']);
          if (iN < 0) { toast('Kolom "Nama" tidak ditemukan.', 'warn'); return false; }
          const data = rows.map(r => ({ nama: r[iN], wa: iW >= 0 ? r[iW] : '', email: iE >= 0 ? r[iE] : '', segmen: iS >= 0 ? r[iS] : '', tag: iT >= 0 ? r[iT] : '' }));
          const x = await api('crm.import', { rows: data.slice(0, 3000) });
          if (!x.success) { galat(x); return false; }
          toast(x.message); muatCrm(el); return true;
        } catch (e) { toast(e.message, 'err'); return false; }
      }
    }]
  });
}
function normKolom(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
/** Baca Excel/CSV di browser → {header, rows, barisJudul} (tanggal → yyyy-mm-dd) */
async function bacaTabel(file, namaSheet) {
  const X = await pakaiXlsx();
  const wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true });
  const sn = namaSheet && wb.SheetNames.indexOf(namaSheet) >= 0 ? namaSheet : wb.SheetNames[0];
  const aoa = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }).map(r => r.map(c => c instanceof Date ? new Date(c.getTime() - c.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : c));
  let hi = 0, skor = -1;
  for (let i = 0; i < Math.min(10, aoa.length); i++) { const s = aoa[i].filter(c => String(c).trim() && isNaN(Number(c))).length; if (s > skor) { skor = s; hi = i; } }
  return { header: (aoa[hi] || []).map(String), rows: aoa.slice(hi + 1).filter(r => r.some(c => String(c).trim())), barisJudul: hi + 1, sheets: wb.SheetNames, sheet: sn };
}

/* ---------------------------------------------------------------------
 * Master Data
 * ------------------------------------------------------------------- */
daftarHalaman('master', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) { el._j = 'klasifikasi'; el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Master Data'], judul: 'Master Data', sub: 'Pilihan yang dipakai di formulir: klasifikasi arsip, kelas & kuota rombel, alasan, jenis cuti, ceklis verifikasi, dan lainnya.' }) + '<div class="grid g-12"><div class="card s3 p0" data-jenis style="padding:8px"></div><div class="card s9 p0" data-isi style="grid-column:span 9"></div></div>'; }
    muatMaster(el);
  }
});
async function muatMaster(el) {
  const r = await api('ref.list');
  if (!r.success) { $('[data-isi]', el).innerHTML = galatHtml(r); return; }
  el._ref = r.data;
  const nj = {}; r.data.rows.forEach(x => { nj[x.jenis] = (nj[x.jenis] || 0) + 1; });
  $('[data-jenis]', el).innerHTML = Object.keys(r.data.jenis).map(j => '<button class="pi" data-j="' + j + '" style="' + (j === el._j ? 'background:var(--primary-tint);color:var(--primary-hover);font-weight:600' : '') + '"><span class="grow">' + esc(r.data.jenis[j]) + '</span><span class="xs muted">' + (nj[j] || 0) + '</span></button>').join('');
  $$('[data-j]', el).forEach(b => b.onclick = () => { el._j = b.dataset.j; muatMasterIsi(el); $$('[data-j]', el).forEach(x => { x.style.cssText = x === b ? 'background:var(--primary-tint);color:var(--primary-hover);font-weight:600' : ''; }); });
  muatMasterIsi(el);
}
function muatMasterIsi(el) {
  const j = el._j, rows = el._ref.rows.filter(x => x.jenis === j), kelas = j === 'kelas';
  const box = $('[data-isi]', el);
  box.innerHTML = '<div class="card-h" style="padding:18px 20px 0"><div class="ttl">' + esc(el._ref.jenis[j]) + '</div><button class="btn btn-sm btn-primary" data-tambah>' + ikon('plus', 'sm') + 'Tambah</button></div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:70px">Urut</th><th>Kode</th><th>Nama / keterangan</th>' + (kelas ? '<th>Kuota</th>' : '') + '<th>Aktif</th><th></th></tr></thead><tbody data-tb>' + rows.map(x => '<tr data-id="' + esc(x.id) + '"><td class="nowrap"><button class="icon-btn" data-up aria-label="Naik">' + ikon('arrow-up', 'sm') + '</button><button class="icon-btn" data-dn aria-label="Turun">' + ikon('arrow-down', 'sm') + '</button></td><td class="mono b">' + esc(x.kode) + '</td><td>' + esc(x.nama) + '</td>' + (kelas ? '<td>' + esc(x.nilai || '–') + '</td>' : '') + '<td>' + (x.aktif === 'YA' ? '<span class="chip chip-ok">Aktif</span>' : '<span class="chip chip-muted">Nonaktif</span>') + '</td><td class="right nowrap"><button class="btn btn-sm" data-ubah>' + ikon('pencil', 'sm') + '</button> <button class="btn btn-sm btn-danger-soft" data-hapus>' + ikon('trash-2', 'sm') + '</button></td></tr>').join('') + '</tbody></table></div>' +
    '<div class="tbl-foot"><span>' + (kelas ? 'Kuota kelas dipakai di dashboard Distribusi Kelas (SPMB).' : 'Data lama yang memakai kode tetap menyimpan kodenya meski item dihapus.') + '</span><button class="btn btn-sm" data-urut hidden>' + ikon('check', 'sm') + 'Simpan urutan</button></div>';
  const tb = $('[data-tb]', box);
  tb.onclick = e => { const tr = e.target.closest('tr'); if (!tr) return; let pindah = false; if (e.target.closest('[data-up]') && tr.previousElementSibling) { tb.insertBefore(tr, tr.previousElementSibling); pindah = true; } if (e.target.closest('[data-dn]') && tr.nextElementSibling) { tb.insertBefore(tr.nextElementSibling, tr); pindah = true; } if (pindah) $('[data-urut]', box).hidden = false; };
  $('[data-urut]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('ref.urut', { ids: $$('tr[data-id]', tb).map(t => t.dataset.id) }); if (!x.success) return galat(x); terapkanRef(x.data.ref); toast(x.message); muatMaster(el); });
  $('[data-tambah]', box).onclick = () => formRef(el, { jenis: j });
  $$('[data-ubah]', box).forEach(b => b.onclick = () => formRef(el, rows.find(x => x.id === b.closest('tr').dataset.id)));
  $$('[data-hapus]', box).forEach(b => b.onclick = async () => { const x0 = rows.find(x => x.id === b.closest('tr').dataset.id); if (!await konfirmasi({ judul: 'Hapus "' + x0.nama + '"?', pesan: 'Pilihan ini tidak muncul lagi di formulir. Lebih aman menonaktifkan bila masih dipakai.', ok: 'Hapus', bahaya: true })) return; const x = await api('ref.hapus', { id: x0.id }); if (!x.success) return galat(x); terapkanRef(x.data.ref); toast(x.message); muatMaster(el); });
}
function terapkanRef(ref) { if (ref) { S.ref = ref; if (S.boot) { S.boot.ref = ref; simpanBoot(S.boot); } } }
function formRef(el, x) {
  const kelas = x.jenis === 'kelas';
  modal({
    judul: x.id ? 'Ubah item' : 'Tambah item', sub: el._ref.jenis[x.jenis],
    isi: '<div class="form-grid"><div class="field" data-f="kode"><label>Kode <span class="req">*</span></label><input data-k class="mono" value="' + esc(x.kode || '') + '" maxlength="40"><div class="ferr" hidden></div></div><div class="field" data-f="nilai"><label>' + (kelas ? 'Kuota siswa' : 'Nilai (opsional)') + '</label><input data-v value="' + esc(x.nilai || '') + '"' + (kelas ? ' inputmode="numeric"' : '') + '><div class="ferr" hidden></div></div><div class="field full" data-f="nama"><label>Nama / keterangan <span class="req">*</span></label><input data-n value="' + esc(x.nama || '') + '" maxlength="150"><div class="ferr" hidden></div></div>' + (x.id ? '<div class="field"><label>Status</label><select data-a><option value="YA">Aktif</option><option value="TIDAK"' + (x.aktif === 'TIDAK' ? ' selected' : '') + '>Nonaktif</option></select></div>' : '') + '</div>',
    tombol: [{ teks: 'Batal' }, {
      teks: 'Simpan', cls: 'btn-primary', aksi: async (t, w) => {
        const item = { id: x.id || '', jenis: x.jenis, kode: $('[data-k]', w).value.trim(), nama: $('[data-n]', w).value.trim(), nilai: $('[data-v]', w).value.trim(), aktif: $('[data-a]', w) ? $('[data-a]', w).value : 'YA' };
        if (tandaiGalat(w, { kode: item.kode ? '' : 'Wajib.', nama: item.nama ? '' : 'Wajib.', nilai: kelas && item.nilai && !/^\d{1,3}$/.test(item.nilai) ? 'Harus angka.' : '' })) return false;
        const r = await api('ref.simpan', { item });
        if (!r.success) { if (r.errors) tandaiGalat(w, r.errors); galat(r); return false; }
        terapkanRef(r.data.ref); toast(r.message); muatMaster(el); return true;
      }
    }]
  });
}

/* ---------------------------------------------------------------------
 * Impor & Backup (migrasi data)
 * ------------------------------------------------------------------- */
daftarHalaman('migrasi', {
  auth: 'admin',
  tampil(el, s, params, o) {
    if (o.baru) {
      el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Impor & Backup'], judul: 'Impor Data Lama & Backup', sub: 'Pindahkan arsip dari Excel/spreadsheet lama dengan Pindai (uji coba) lebih dulu. Impor aman diulang — data yang sama tidak menjadi ganda.' }) +
        tabsHtml([['berkas', 'Impor Excel/CSV', 'file-spreadsheet'], ['sheet', 'Dari Spreadsheet Lama', 'table'], ['log', 'Riwayat Impor', 'history'], ['backup', 'Backup & Pulihkan', 'archive'], ['lain', 'Ekspor & Data Demo', 'package']], 'berkas') + '<div data-isi></div>';
      pasangTabs(el, t => tabMigrasi(el, t));
      el._modul = params.modul && S.modul[params.modul] ? params.modul : 'sm';
      tabMigrasi(el, 'berkas');
    }
  }
});
function tabMigrasi(el, t) {
  const box = $('[data-isi]', el);
  if (t === 'berkas') return imporBerkas(el, box);
  if (t === 'sheet') return imporSheet(el, box);
  if (t === 'log') return logImpor(el, box);
  if (t === 'backup') return halBackup(el, box);
  box.innerHTML = '<div class="grid g2"><div class="card"><div class="card-h"><div class="ttl">Ekspor seluruh data (JSON)</div></div><p class="small t2">Salinan lengkap semua sheet dalam satu berkas .json.gz — untuk arsip mandiri atau pindah server. Tidak memuat sandi atau token.</p><button class="btn btn-primary mt16" data-json>' + ikon('download') + 'Unduh ekspor JSON</button></div>' +
    '<div class="card"><div class="card-h"><div class="ttl">Data demo pelatihan</div></div><p class="small t2">Isi ±100 data fiktif bertanda "(Demo)" untuk latihan staf, lalu hapus sekaligus sebelum dipakai sungguhan.</p><div class="flex gap8 mt16"><button class="btn" data-seed>' + ikon('sparkles') + 'Isi data demo</button><button class="btn btn-danger-soft" data-hapus>' + ikon('trash-2') + 'Hapus data demo</button></div></div></div>';
  $('[data-json]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('data.eksporJson', {}, { timeout: 180000 }); if (!x.success) return galat(x); unduhB64(x.data.nama, 'application/gzip', x.data.base64); toast('Ekspor ' + bytes(x.data.ukuran) + ' (sebelum dikompres).'); });
  $('[data-seed]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('demo.seed', {}, { timeout: 180000 }); if (!x.success) return galat(x); toast(x.message); Object.keys(S.modul).forEach(k => invalidasi('list:' + k)); invalidasi('dash', 'verif:'); });
  $('[data-hapus]', box).onclick = async e => { const b = e.currentTarget; if (!await konfirmasi({ judul: 'Hapus semua data demo?', pesan: 'Hanya baris bersumber DEMO yang dihapus.', ok: 'Hapus', bahaya: true })) return; sibuk(b, async () => { const x = await api('demo.hapus', {}, { timeout: 180000 }); if (!x.success) return galat(x); toast(x.message); Object.keys(S.modul).forEach(k => invalidasi('list:' + k)); invalidasi('dash', 'verif:'); }); };
}
function opsiModul(v) { return Object.keys(S.modul).map(k => '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(S.modul[k].label) + '</option>').join(''); }
function laporanImpor(lap, uji) {
  return '<div class="grid g3" style="gap:10px">' + [['Akan ditambah', lap.ditambah, 'ok'], ['Diperbarui', lap.diperbarui, 'teal'], ['Dilewati', lap.dilewati, 'wait']].map(x => '<div class="kv-box" style="padding:10px 14px"><div class="xs muted">' + (uji ? x[0] : x[0].replace('Akan ditambah', 'Ditambah')) + '</div><div class="metric-n md ' + x[2] + '-t">' + angka(x[1]) + '</div></div>').join('') + '</div>' +
    (lap.kolom ? '<div class="small mt12"><b>Kolom dikenali:</b> ' + lap.kolom.dikenal.map(k => '<span class="tag" style="margin:2px">' + esc(k.header) + ' → ' + esc(k.kolom) + '</span>').join('') + (lap.kolom.diabaikan.length ? '<div class="mt4 muted"><b>Diabaikan:</b> ' + lap.kolom.diabaikan.map(esc).join(', ') + '</div>' : '') + '</div>' : '') +
    (lap.peringatan && lap.peringatan.length ? '<details class="mt12"><summary class="small b wait-t" style="cursor:pointer">' + lap.peringatan.length + ' catatan per baris</summary><ul class="list-plain small mt8">' + lap.peringatan.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></details>' : '');
}
function imporBerkas(el, box) {
  box.innerHTML = '<div class="grid g-12"><div class="card s5"><div class="card-h"><div class="ttl">1. Pilih berkas</div></div><div class="field"><label>Modul tujuan</label><select data-mod>' + opsiModul(el._modul) + '</select></div><div class="field mt12"><label>Berkas Excel/CSV</label><input type="file" data-f accept=".xlsx,.xls,.csv"><div class="hint">Baris judul dideteksi otomatis. Nama kolom boleh berbeda (mis. "No. Surat", "Pengirim").</div></div>' +
    '<div class="form-grid mt12"><div class="field"><label>Bila data sudah ada</label><select data-mode><option value="isi">Isi kolom yang kosong saja</option><option value="timpa">Timpa dengan data berkas</option></select></div><div class="field"><label>Status data baru</label><select data-st><option value="TERVERIFIKASI">Langsung terverifikasi (arsip lama)</option><option value="MENUNGGU">Masuk antrean verifikasi</option></select></div></div>' +
    '<div class="note mt12">' + ikon('info', 'sm') + '<span>Kunci pencocokan: Surat Masuk = nomor + pengirim + tanggal; Surat Keluar = nomor; siswa = NISN; GTK = NIP/NUPTK. Backup otomatis dibuat sebelum impor nyata.</span></div></div>' +
    '<div class="card s7"><div class="card-h"><div class="ttl">2. Pindai & impor</div></div><div data-out>' + kosongHtml('file-spreadsheet', 'Belum ada berkas', 'Pilih berkas di sebelah kiri.') + '</div></div></div>';
  let data = null;
  const out = $('[data-out]', box);
  $('[data-mod]', box).onchange = e => { el._modul = e.target.value; data && pratinjau(); };
  const pratinjau = () => {
    out.innerHTML = '<div class="small t2 mb8">' + esc(data.nama) + ' · sheet <b>' + esc(data.sheet) + '</b> · ' + angka(data.rows.length) + ' baris data (judul di baris ' + data.barisJudul + ')</div><div class="tbl-wrap" style="border:1px solid var(--border);border-radius:10px;max-height:220px"><table class="tbl"><thead><tr>' + data.header.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + data.rows.slice(0, 5).map(r => '<tr>' + data.header.map((h, i) => '<td class="small nowrap">' + esc(r[i]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="flex gap8 mt16"><button class="btn" data-uji>' + ikon('scan-line') + 'Pindai (uji coba)</button><button class="btn btn-primary" data-jalan disabled>' + ikon('upload') + 'Jalankan impor</button></div><div data-lap class="mt16"></div>';
    $('[data-uji]', out).onclick = e => sibuk(e.currentTarget, async () => {
      const agg = { ditambah: 0, diperbarui: 0, dilewati: 0, peringatan: [], kolom: null };
      for (let i = 0; i < data.rows.length; i += 2000) {
        const x = await api('impor.jalankan', { modul: el._modul, header: data.header, rows: data.rows.slice(i, i + 2000), mode: $('[data-mode]', box).value, status: $('[data-st]', box).value, dryRun: true, offsetBaris: data.barisJudul + 1 + i }, { timeout: 120000 });
        if (!x.success) return galat(x);
        agg.ditambah += x.data.ditambah; agg.diperbarui += x.data.diperbarui; agg.dilewati += x.data.dilewati; agg.peringatan = agg.peringatan.concat(x.data.peringatan).slice(0, 100); agg.kolom = x.data.kolom;
      }
      $('[data-lap]', out).innerHTML = '<div class="lbl mb8">Hasil pindai — belum ada data yang ditulis</div>' + laporanImpor(agg, true);
      $('[data-jalan]', out).disabled = !(agg.ditambah + agg.diperbarui);
    });
    $('[data-jalan]', out).onclick = async e => {
      const b = e.currentTarget;
      if (!await konfirmasi({ judul: 'Jalankan impor ke ' + S.modul[el._modul].label + '?', pesan: angka(data.rows.length) + ' baris akan diproses per 500 baris. Backup spreadsheet dibuat otomatis lebih dulu.', ok: 'Jalankan impor' })) return;
      const batchId = 'IMP-' + new Date(Date.now() + 8 * 3600e3).toISOString().replace(/\D/g, '').slice(0, 14);
      const n = Math.ceil(data.rows.length / 500), agg = { ditambah: 0, diperbarui: 0, dilewati: 0, peringatan: [] };
      const lap = $('[data-lap]', out);
      await sibuk(b, async () => {
        for (let i = 0; i < n; i++) {
          lap.innerHTML = '<div class="lbl">Mengimpor bagian ' + (i + 1) + ' dari ' + n + '…</div><div class="prog mt8"><i style="width:' + Math.round(i / n * 100) + '%"></i></div>';
          const x = await api('impor.jalankan', { modul: el._modul, header: data.header, rows: data.rows.slice(i * 500, (i + 1) * 500), mode: $('[data-mode]', box).value, status: $('[data-st]', box).value, batchId, bagian: i + 1, totalBagian: n, offsetBaris: data.barisJudul + 1 + i * 500, sumberLabel: data.nama }, { timeout: 300000, reqId: batchId + '-' + i });
          if (!x.success) { lap.innerHTML = '<div class="note err">' + ikon('circle-x', 'sm') + '<span>Berhenti di bagian ' + (i + 1) + ': ' + esc(x.message) + ' — bagian sebelumnya sudah tersimpan; ulangi impor (aman, tidak dobel).</span></div>'; return; }
          agg.ditambah += x.data.ditambah; agg.diperbarui += x.data.diperbarui; agg.dilewati += x.data.dilewati; agg.peringatan = agg.peringatan.concat(x.data.peringatan).slice(0, 100);
        }
        lap.innerHTML = '<div class="note ok mb12">' + ikon('circle-check', 'sm') + '<span>Impor selesai · batch <b class="mono">' + batchId + '</b>. Bisa dibatalkan dari tab Riwayat Impor.</span></div>' + laporanImpor(agg);
        Object.keys(S.modul).forEach(k => invalidasi('list:' + k)); invalidasi('dash', 'verif:');
        toast('Impor selesai: +' + agg.ditambah + ', diperbarui ' + agg.diperbarui + '.');
      });
    };
  };
  $('[data-f]', box).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    out.innerHTML = '<div class="boot-load" style="padding:30px">' + ikon('loader-circle', 'spin') + '<span>Membaca berkas…</span></div>';
    try { const t = await bacaTabel(f); data = Object.assign(t, { nama: f.name }); if (!t.rows.length) throw new Error('Tidak ada baris data di berkas.'); pratinjau(); }
    catch (er) { out.innerHTML = '<div class="note err">' + ikon('circle-x', 'sm') + '<span>' + esc(er.message) + '</span></div>'; }
  };
}
function imporSheet(el, box) {
  box.innerHTML = '<div class="card"><div class="card-h"><div class="ttl">Spreadsheet lama (hanya dibaca)</div></div><div class="flex gap8 wrap"><input class="inp grow" data-url placeholder="https://docs.google.com/spreadsheets/d/…" style="min-width:260px"><button class="btn btn-primary" data-buka>' + ikon('search') + 'Baca daftar sheet</button></div><div class="hint mt8">Spreadsheet harus bisa dibuka akun Google pemilik Apps Script. Isi spreadsheet lama tidak diubah.</div><div data-out class="mt16"></div></div>';
  const out = $('[data-out]', box);
  $('[data-buka]', box).onclick = e => sibuk(e.currentTarget, async () => {
    const url = $('[data-url]', box).value.trim();
    const x = await api('impor.sumber', { url }, { timeout: 90000 });
    if (!x.success) return galat(x);
    out.innerHTML = '<div class="lbl mb8">' + esc(x.data.nama) + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sheet</th><th>Baris</th><th>Judul kolom</th><th>Modul tujuan</th><th></th></tr></thead><tbody>' + x.data.sheets.map((s, i) => '<tr data-i="' + i + '"><td class="b">' + esc(s.nama) + '</td><td>' + angka(s.baris) + '</td><td class="wrap-t small">' + esc(s.header.filter(String).slice(0, 8).join(' · ')) + '</td><td><select class="inp sm" data-m><option value="">— lewati —</option>' + opsiModul(s.saran) + '</select></td><td class="nowrap"><button class="btn btn-sm" data-uji>Pindai</button> <button class="btn btn-sm btn-primary" data-jalan>Impor</button></td></tr>').join('') + '</tbody></table></div><div data-lap class="mt16"></div>';
    const lap = $('[data-lap]', out);
    $$('tr[data-i]', out).forEach(tr => {
      const s = x.data.sheets[+tr.dataset.i];
      if (!s.saran) $('[data-m]', tr).value = '';
      $('[data-uji]', tr).onclick = ev => sibuk(ev.currentTarget, async () => {
        const modul = $('[data-m]', tr).value; if (!modul) return toast('Pilih modul tujuan.', 'warn');
        const y = await api('impor.dariSheet', { url, sheet: s.nama, modul, dryRun: true, mode: 'isi' }, { timeout: 300000 });
        if (!y.success) return galat(y);
        lap.innerHTML = '<div class="lbl mb8">Pindai "' + esc(s.nama) + '" (2.000 baris pertama) — belum ditulis</div>' + laporanImpor(y.data, true);
      });
      $('[data-jalan]', tr).onclick = async ev => {
        const b = ev.currentTarget, modul = $('[data-m]', tr).value; if (!modul) return toast('Pilih modul tujuan.', 'warn');
        const mode = await new Promise(res => modal({ judul: 'Impor sheet "' + s.nama + '"', isi: '<div class="field"><label>Bila data sudah ada</label><select data-mode><option value="isi">Isi kolom kosong saja</option><option value="timpa">Timpa</option></select></div><div class="field mt12"><label>Status data baru</label><select data-st><option value="TERVERIFIKASI">Langsung terverifikasi</option><option value="MENUNGGU">Masuk antrean verifikasi</option></select></div>', onTutup: () => res(null), tombol: [{ teks: 'Batal' }, { teks: 'Impor', cls: 'btn-primary', aksi: (t, w) => { res({ mode: $('[data-mode]', w).value, status: $('[data-st]', w).value }); return true; } }] }));
        if (!mode) return;
        await sibuk(b, async () => {
          let mulai = 0, batchId = '', agg = { ditambah: 0, diperbarui: 0, dilewati: 0, peringatan: [] };
          for (let i = 0; i < 50; i++) {
            lap.innerHTML = '<div class="lbl">Mengimpor "' + esc(s.nama) + '"… ' + angka(agg.ditambah + agg.diperbarui + agg.dilewati) + ' / ' + angka(s.baris) + ' baris</div><div class="prog mt8"><i style="width:' + Math.round((agg.ditambah + agg.diperbarui + agg.dilewati) / Math.max(1, s.baris) * 100) + '%"></i></div>';
            const y = await api('impor.dariSheet', { url, sheet: s.nama, modul, mode: mode.mode, status: mode.status, mulai, batchId }, { timeout: 300000 });
            if (!y.success) { lap.innerHTML = '<div class="note err">' + ikon('circle-x', 'sm') + '<span>' + esc(y.message) + '</span></div>'; return; }
            agg.ditambah += y.data.ditambah; agg.diperbarui += y.data.diperbarui; agg.dilewati += y.data.dilewati; agg.peringatan = agg.peringatan.concat(y.data.peringatan || []).slice(0, 100);
            batchId = y.data.batchId; mulai = y.data.berikut;
            if (y.data.selesai) break;
          }
          lap.innerHTML = '<div class="note ok mb12">' + ikon('circle-check', 'sm') + '<span>Selesai · batch <b class="mono">' + esc(batchId) + '</b></span></div>' + laporanImpor(agg);
          Object.keys(S.modul).forEach(k => invalidasi('list:' + k)); invalidasi('dash', 'verif:');
        });
      };
    });
  });
}
async function logImpor(el, box) {
  box.innerHTML = '<div class="card p0">' + skeletonTabel(3) + '</div>';
  const r = await api('impor.log');
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  box.innerHTML = '<div class="card p0">' + (r.data.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Batch</th><th>Modul</th><th>Sumber</th><th>Hasil</th><th>Waktu</th><th>Status</th><th></th></tr></thead><tbody>' + r.data.map(l => '<tr><td class="mono small">' + esc(l.batchId) + '</td><td>' + esc(l.label) + '</td><td class="wrap-t small">' + esc(l.sumber) + ' · mode ' + esc(l.mode) + '</td><td class="nowrap small">+' + l.ditambah + ' · ~' + l.diperbarui + ' · lewat ' + l.dilewati + '</td><td class="nowrap">' + esc(fmtWaktu(l.waktu)) + '<div class="sub">' + esc(l.oleh) + '</div></td><td>' + (l.status === 'DIBATALKAN' ? '<span class="chip chip-muted">Dibatalkan</span>' : '<span class="chip chip-ok">Selesai</span>') + '</td><td>' + (l.status !== 'DIBATALKAN' && l.ditambah ? '<button class="btn btn-sm btn-danger-soft" data-b="' + esc(l.batchId) + '">Batalkan</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : kosongHtml('history', 'Belum ada impor', '')) + '</div>';
  $$('[data-b]', box).forEach(b => b.onclick = async () => {
    if (!await konfirmasi({ judul: 'Batalkan impor ' + b.dataset.b + '?', pesan: 'Baris yang DITAMBAH oleh impor ini dihapus. Baris lama yang sempat diperbarui tidak dikembalikan (gunakan backup pra-impor bila perlu).', ok: 'Batalkan impor', bahaya: true })) return;
    sibuk(b, async () => { const x = await api('impor.batal', { batchId: b.dataset.b }, { timeout: 180000 }); if (!x.success) return galat(x); toast(x.message); Object.keys(S.modul).forEach(k => invalidasi('list:' + k)); logImpor(el, box); });
  });
}
async function halBackup(el, box) {
  box.innerHTML = '<div class="card p0">' + skeletonTabel(3) + '</div>';
  const r = await api('backup.list');
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  box.innerHTML = '<div class="flex between mb16 wrap gap8"><div class="small t2">Backup harian otomatis pukul 01.00 WITA (disimpan ' + esc(S.setting.BACKUP_SIMPAN || '30') + ' hari), plus backup sebelum impor/hapus permanen/pulihkan.</div><button class="btn btn-primary" data-buat>' + ikon('archive') + 'Buat backup sekarang</button></div>' +
    '<div class="card p0">' + (r.data.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Waktu</th><th>Ukuran</th><th></th></tr></thead><tbody>' + r.data.map(b => '<tr><td class="b">' + esc(b.nama) + '</td><td class="nowrap">' + esc(fmtWaktu(b.waktu)) + '</td><td>' + (b.ukuran ? bytes(b.ukuran) : '–') + '</td><td class="right"><button class="btn btn-sm" data-p="' + esc(b.id) + '">' + ikon('undo-2', 'sm') + 'Pulihkan…</button></td></tr>').join('') + '</tbody></table></div>' : kosongHtml('archive', 'Belum ada backup', '')) + '</div>';
  $('[data-buat]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('backup.buat', {}, { timeout: 180000 }); if (!x.success) return galat(x); toast(x.message); halBackup(el, box); });
  $$('[data-p]', box).forEach(b => b.onclick = async () => {
    const m = modal({ judul: 'Pulihkan dari backup', sub: r.data.find(x => x.id === b.dataset.p).nama, ikon: 'undo-2', ikonCls: 'no', ukuran: 'lg', isi: '<div class="sk sk-blk"></div>' });
    const x = await api('backup.isi', { id: b.dataset.p });
    const mb = $('.modal-b', m.el);
    if (!x.success) { mb.innerHTML = galatHtml(x); return; }
    mb.innerHTML = '<div class="note err mb12">' + ikon('triangle-alert', 'sm') + '<span>Isi sheet terpilih DIGANTI seluruhnya dengan isi backup. Backup kondisi saat ini dibuat otomatis lebih dulu.</span></div><div class="grid g2" style="gap:6px">' + x.data.map(s => '<label class="ck-box"><input type="checkbox" value="' + esc(s.nama) + '"> ' + esc(s.nama) + ' <span class="xs muted">(' + s.baris + ' baris)</span></label>').join('') + '</div><div class="field mt16"><label>Ketik <b class="mono">PULIHKAN</b></label><input data-k autocomplete="off"></div><div class="flex end gap8 mt16"><button class="btn" data-x2>Batal</button><button class="btn btn-danger" data-go>' + ikon('undo-2') + 'Pulihkan</button></div>';
    $('[data-x2]', mb).onclick = m.tutup;
    $('[data-go]', mb).onclick = e => sibuk(e.currentTarget, async () => {
      const sheets = $$('input[type=checkbox]:checked', mb).map(c => c.value);
      if (!sheets.length) return toast('Pilih minimal satu sheet.', 'warn');
      const y = await api('backup.pulihkan', { id: b.dataset.p, sheets, konfirmasi: $('[data-k]', mb).value.trim() }, { timeout: 300000 });
      if (!y.success) return galat(y);
      toast(y.message); m.tutup(); Store.hapusAwalan(''); setTimeout(() => location.reload(), 1200);
    });
  });
}

/* ---------------------------------------------------------------------
 * Audit Log
 * ------------------------------------------------------------------- */
daftarHalaman('audit', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) {
      el._f = { q: '', aksi: '', dari: '', sampai: '', page: 1, per: 25 };
      el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Audit Log'], judul: 'Audit Log', sub: 'Jejak aksi pengguna: masuk, input, verifikasi, perubahan data terverifikasi, pengaturan, dan keamanan. Nilai rahasia & data pribadi otomatis disamarkan.' }) +
        '<div class="card p0"><div class="toolbar"><label class="inp-ic">' + ikon('search', 'sm') + '<input class="inp" data-q placeholder="Cari nama, ID data, ringkasan…"></label><select class="inp" data-aksi><option value="">Semua aksi</option></select><input type="date" class="inp" data-dari><input type="date" class="inp" data-sampai></div><div data-tabel>' + skeletonTabel(8) + '</div><div class="tbl-foot" data-foot hidden></div></div>';
      const f = el._f;
      $('[data-q]', el).addEventListener('input', debounce(e => { f.q = e.target.value.trim(); f.page = 1; muatAudit(el); }, 350));
      $('[data-aksi]', el).onchange = e => { f.aksi = e.target.value; f.page = 1; muatAudit(el); };
      $('[data-dari]', el).onchange = e => { f.dari = e.target.value; f.page = 1; muatAudit(el); };
      $('[data-sampai]', el).onchange = e => { f.sampai = e.target.value; f.page = 1; muatAudit(el); };
    }
    muatAudit(el);
  }
});
async function muatAudit(el) {
  const r = await api('audit.list', el._f), box = $('[data-tabel]', el), foot = $('[data-foot]', el);
  if (!r.success) { box.innerHTML = galatHtml(r); pasangUlang(box, () => muatAudit(el)); return; }
  const d = r.data, sel = $('[data-aksi]', el), v = sel.value;
  sel.innerHTML = '<option value="">Semua aksi</option>' + d.daftarAksi.map(a => '<option' + (a === v ? ' selected' : '') + '>' + esc(a) + '</option>').join('');
  const warna = a => /GAGAL|DARURAT|HAPUS|TOLAK|TARIK|RAHASIA|ROTASI/.test(a) ? 'chip-no' : /VERIFIKASI|LOGIN$|TERBIT/.test(a) ? 'chip-ok' : /UBAH|PULIH|IMPOR|BACKUP/.test(a) ? 'chip-or' : 'chip-muted';
  box.innerHTML = d.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Modul · ID</th><th>Ringkasan</th><th>Perangkat</th></tr></thead><tbody>' + d.rows.map(x => '<tr><td class="nowrap">' + esc(fmtWaktu(x.waktu)) + '</td><td><b>' + esc(x.nama) + '</b><div class="sub">' + esc(x.peran) + '</div></td><td><span class="chip ' + warna(x.aksi) + '">' + esc(x.aksi) + '</span></td><td class="small">' + esc(x.modul) + (x.dataId ? '<div class="mono sub">' + esc(x.dataId) + '</div>' : '') + '</td><td class="wrap-t small">' + esc(x.ringkasan) + '</td><td class="xs muted">' + esc(x.klien) + (x.ms ? ' · ' + x.ms + ' ms' : '') + '</td></tr>').join('') + '</tbody></table></div>' : kosongHtml('scroll-text', 'Tidak ada catatan', '');
  foot.hidden = !d.rows.length; foot.innerHTML = pagerHtml(d.total, d.page, d.per);
  $$('[data-pg]', foot).forEach(b => b.onclick = () => { el._f.page = +b.dataset.pg; muatAudit(el); });
}

/* ---------------------------------------------------------------------
 * Pengaturan
 * ------------------------------------------------------------------- */
const SET_GRUP = {
  sekolah: ['NAMA_SEKOLAH', 'SINGKATAN', 'NPSN', 'PEMERINTAH', 'DINAS', 'ALAMAT', 'KOTA_SURAT', 'TELEPON', 'EMAIL_SEKOLAH', 'LAMAN', 'KODE_SEKOLAH', 'TAHUN_AJARAN', 'SEMESTER'],
  alur: ['ADMIN_AUTO_VERIF', 'STAF_BOLEH_UNDUH', 'TARGET_SURAT_MASUK', 'KUOTA_CUTI_TAHUNAN', 'HARI_KERJA', 'JAM_RINGKASAN', 'BACKUP_SIMPAN', 'CRM_SYNC_MENIT', 'APP_URL']
};
const SET_SAKLAR = ['ADMIN_AUTO_VERIF', 'STAF_BOLEH_UNDUH', 'GOOGLE_LOGIN_AKTIF'];
daftarHalaman('pengaturan', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) {
      el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Pengaturan'], judul: 'Pengaturan', sub: 'Identitas sekolah (kop surat), alur kerja, keamanan login, dan status sistem.' }) + tabsHtml([['sekolah', 'Sekolah & Kop', 'school'], ['alur', 'Alur Kerja', 'sliders-horizontal'], ['aman', 'Keamanan & Login', 'shield'], ['sistem', 'Sistem', 'server']], 'sekolah') + '<div data-isi></div>';
      pasangTabs(el, t => tabSet(el, t));
    }
    tabSet(el, $('[data-tabs] .on', el).dataset.t);
  }
});
async function tabSet(el, t) {
  const box = $('[data-isi]', el);
  box.innerHTML = '<div class="card sk sk-blk"></div>';
  if (t === 'aman') return setKeamanan(el, box);
  if (t === 'sistem') return setSistem(el, box);
  const r = await api('set.get');
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  const peta = {}; r.data.daftar.forEach(x => { peta[x.kunci] = x; });
  const ctl = k => {
    const x = peta[k]; if (!x) return '';
    if (SET_SAKLAR.indexOf(k) >= 0) return '<div class="field full">' + swHtml(k, x.nilai === 'YA', x.keterangan) + '</div>';
    if (k === 'HARI_KERJA') return '<div class="field"><label>' + esc(x.keterangan) + '</label><select name="' + k + '"><option value="6"' + (x.nilai !== '5' ? ' selected' : '') + '>6 hari (Senin–Sabtu)</option><option value="5"' + (x.nilai === '5' ? ' selected' : '') + '>5 hari (Senin–Jumat)</option></select></div>';
    if (k === 'SEMESTER') return '<div class="field"><label>' + esc(x.keterangan) + '</label><select name="' + k + '"><option value="">Otomatis (' + esc(r.data.semesterAktif) + ')</option><option' + (x.nilai === 'Ganjil' ? ' selected' : '') + '>Ganjil</option><option' + (x.nilai === 'Genap' ? ' selected' : '') + '>Genap</option></select></div>';
    return '<div class="field' + (/ALAMAT|NAMA_SEKOLAH|PEMERINTAH|DINAS|APP_URL/.test(k) ? ' full' : '') + '"><label>' + esc(x.keterangan) + '</label><input name="' + k + '" value="' + esc(x.nilai) + '" placeholder="' + esc(k === 'TAHUN_AJARAN' ? 'Otomatis: ' + r.data.tahunAjaranAktif : x.bawaan || '') + '"' + (/KUOTA|TARGET|JAM|BACKUP|MENIT/.test(k) ? ' inputmode="numeric"' : '') + '></div>';
  };
  box.innerHTML = '<div class="grid g-12"><div class="card ' + (t === 'sekolah' ? 's8' : 's12') + '"><form class="form-grid" data-form novalidate>' + SET_GRUP[t].map(ctl).join('') + '</form><div class="flex end mt16"><button class="btn btn-primary" data-simpan>' + ikon('check') + 'Simpan</button></div></div>' +
    (t === 'sekolah' ? '<div class="card s4"><div class="card-h"><div class="ttl">Logo sekolah</div></div><div class="ctr"><div class="brand-logo" style="width:96px;height:96px;margin:0 auto;border-radius:20px;background:' + (r.data.logo ? '#fff' : 'var(--primary)') + ';border:1px solid var(--border)">' + (r.data.logo ? '<img src="' + esc(r.data.logo) + '" alt="Logo">' : ikon('school', 'xl')) + '</div><p class="small t2 mt12">Tampil di halaman masuk, menu, dan kop surat. PNG/JPG ≤ 300 KB.</p><input type="file" data-logo accept="image/png,image/jpeg" hidden><div class="flex center gap8 mt12"><button class="btn" data-pilih>' + ikon('upload') + 'Unggah logo</button>' + (r.data.logo ? '<button class="btn btn-danger-soft" data-hapus>Hapus</button>' : '') + '</div></div></div>' : '') + '</div>';
  const form = $('[data-form]', box);
  $('[data-simpan]', box).onclick = e => sibuk(e.currentTarget, async () => {
    const nilai = {};
    SET_GRUP[t].forEach(k => { const i = form.querySelector('[name=' + k + ']'); if (!i) return; nilai[k] = i.type === 'checkbox' ? (i.checked ? 'YA' : 'TIDAK') : i.value.trim(); });
    const x = await api('set.simpan', { nilai }); if (!x.success) return galat(x);
    toast(x.message); Pref.set('publik', null); segarkanBoot().then(() => renderShell() || rute());
  });
  const lg = $('[data-logo]', box);
  if (lg) {
    $('[data-pilih]', box).onclick = () => lg.click();
    lg.onchange = () => { const f = lg.files[0]; if (!f) return; if (f.size > 300 * 1024) return toast('Logo maksimal 300 KB.', 'warn'); sibuk($('[data-pilih]', box), async () => { const x = await api('set.logo', { base64: await bacaBase64(f), mime: f.type }); if (!x.success) return galat(x); toast(x.message); S.publik = Object.assign({}, S.publik, { logo: x.data.logo }); Pref.set('publik', S.publik); renderShell(); rute(); }); };
    const h = $('[data-hapus]', box); if (h) h.onclick = () => sibuk(h, async () => { const x = await api('set.logo', { hapus: true }); if (!x.success) return galat(x); S.publik = Object.assign({}, S.publik, { logo: '' }); Pref.set('publik', S.publik); renderShell(); rute(); });
  }
}
async function setKeamanan(el, box) {
  const [r, s] = await Promise.all([api('rahasia.status'), api('set.get')]);
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  const d = r.data, set = {}; (s.success ? s.data.daftar : []).forEach(x => { set[x.kunci] = x.nilai; });
  box.innerHTML = '<div class="grid g2"><div class="card"><div class="card-h"><div class="ttl">Masuk dengan akun Google</div>' + (set.GOOGLE_LOGIN_AKTIF === 'YA' ? '<span class="chip chip-ok">Aktif</span>' : '<span class="chip chip-muted">Nonaktif</span>') + '</div>' +
    '<div class="field"><label>OAuth Client ID (Web)</label><input data-cid class="mono" placeholder="1234-abcd.apps.googleusercontent.com" value="' + esc(d.GOOGLE_CLIENT_ID.samar || '') + '"><div class="hint">Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). Tambahkan alamat GitHub Pages ke "Authorized JavaScript origins".</div></div>' +
    '<div class="flex gap8 mt12"><button class="btn" data-scid>' + ikon('check', 'sm') + 'Simpan Client ID</button>' + (d.GOOGLE_CLIENT_ID.ada ? '<button class="btn btn-danger-soft" data-hcid>Hapus</button>' : '') + '</div>' +
    '<div class="divider"></div>' + swHtml('GOOGLE_LOGIN_AKTIF', set.GOOGLE_LOGIN_AKTIF === 'YA', 'Tampilkan tombol "Masuk dengan Google"', 'Hanya email yang terdaftar & aktif di Kelola Pengguna yang bisa masuk') +
    '<div class="field mt12"><label>Batasi ke domain (opsional)</label><input data-dom value="' + esc(set.GOOGLE_DOMAIN || '') + '" placeholder="sekolah.sch.id"></div><div class="flex end mt12"><button class="btn btn-primary" data-sg>' + ikon('check') + 'Simpan</button></div></div>' +
    '<div class="card"><div class="card-h"><div class="ttl">Akses darurat</div>' + (d.darurat.terkunci ? '<span class="chip chip-no">Terkunci</span>' : d.darurat.wajibRotasi ? '<span class="chip chip-wait">Wajib dirotasi</span>' : '<span class="chip chip-ok">Siap</span>') + '</div><p class="small t2">Untuk masuk bila akun Admin terkunci/lupa. Terkunci 15 menit setelah 5 kali salah dan setiap pemakaian dilaporkan ke Admin.</p>' +
    '<div class="kv-box mt12"><div class="kv-row"><span class="k">Nama pengguna</span><span class="v mono">' + esc(d.darurat.user || '–') + '</span></div><div class="kv-row"><span class="k">Halaman</span><span class="v mono">#/darurat</span></div></div>' +
    '<div class="field mt16"><label>Sandi darurat baru (≥ 12 karakter, huruf & angka)</label><input type="password" data-dp autocomplete="new-password"></div><button class="btn btn-teal mt12" data-rot>' + ikon('key-round') + 'Ganti sandi darurat</button>' +
    '<div class="divider"></div><div class="card-h" style="margin-bottom:6px"><div class="ttl">Sesi</div></div><p class="small t2">Token sesi berlaku 12 jam (HMAC-SHA256). Untuk mengakhiri SEMUA sesi semua pengguna, jalankan <span class="mono">rotasiSecretSesi()</span> dari editor Apps Script.</p><button class="btn mt12" data-semua>' + ikon('fingerprint') + 'Keluar dari semua perangkat saya</button></div></div>';
  $('[data-scid]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: $('[data-cid]', box).value.trim() }); x.success ? (toast('Client ID tersimpan.'), setKeamanan(el, box)) : galat(x); });
  const h = $('[data-hcid]', box); if (h) h.onclick = async () => { if (!await konfirmasi({ judul: 'Hapus Client ID?', pesan: 'Login Google otomatis dinonaktifkan.', ok: 'Hapus', bahaya: true })) return; const x = await api('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: '__HAPUS__' }); x.success ? setKeamanan(el, box) : galat(x); };
  $('[data-sg]', box).onclick = e => sibuk(e.currentTarget, async () => { const x = await api('set.simpan', { nilai: { GOOGLE_LOGIN_AKTIF: box.querySelector('[name=GOOGLE_LOGIN_AKTIF]').checked ? 'YA' : 'TIDAK', GOOGLE_DOMAIN: $('[data-dom]', box).value.trim() } }); x.success ? (toast(x.message), Pref.set('publik', null)) : galat(x); });
  $('[data-rot]', box).onclick = e => sibuk(e.currentTarget, async () => { const p = $('[data-dp]', box).value; if (p.length < 12 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) return toast('Minimal 12 karakter berisi huruf dan angka.', 'warn'); const x = await api('rahasia.simpan', { aksi: 'rotasiDarurat', sandiBaru: p }); if (!x.success) return galat(x); $('[data-dp]', box).value = ''; toast(x.message); setKeamanan(el, box); });
  $('[data-semua]', box).onclick = async () => { if (!await konfirmasi({ judul: 'Keluar dari semua perangkat?', pesan: 'Termasuk sesi ini.', ok: 'Keluar semua', bahaya: true })) return; const x = await api('auth.logoutSemua'); if (x.success) keluar(true); else galat(x); };
}
async function setSistem(el, box) {
  const r = await api('sistem.status');
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  const d = r.data;
  const perf = Perf.rows.filter(x => x.server != null);
  const rata = perf.length ? Math.round(perf.reduce((a, x) => a + x.total, 0) / perf.length) : null;
  box.innerHTML = '<div class="grid g2"><div class="card"><div class="card-h"><div class="ttl">Status sistem</div></div><div class="kv-box">' + [['Versi aplikasi', d.versi], ['Versi skema', d.skema], ['Script Properties', d.propsKB + ' KB dari ±500 KB'], ['Trigger', (d.trigger || []).join(', ') || 'belum terpasang'], ['Pemanas cache', d.keepWarm ? 'aktif' : 'mati'], ['Google Drive', d.drive && d.drive.batas ? bytes(d.drive.pakai) + ' / ' + bytes(d.drive.batas) : '–'], ['Rata-rata respons (sesi ini)', rata == null ? '–' : rata + ' ms (' + perf.length + ' panggilan)']].map(x => '<div class="kv-row"><span class="k">' + esc(x[0]) + '</span><span class="v">' + esc(x[1]) + '</span></div>').join('') + '</div>' +
    '<div class="flex gap8 wrap mt16">' + (d.spreadsheetUrl ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(d.spreadsheetUrl) + '">' + ikon('table', 'sm') + 'Buka Spreadsheet</a>' : '') + (d.folderUrl ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(d.folderUrl) + '">' + ikon('folder-open', 'sm') + 'Buka Folder Drive</a>' : '') + '</div><div class="note warn mt16">' + ikon('lock', 'sm') + '<span>Spreadsheet & folder hanya bisa dibuka akun pemilik. Jangan bagikan ke orang lain; batasi editor proyek Apps Script.</span></div></div>' +
    '<div class="card"><div class="card-h"><div class="ttl">Periksa Berkas</div></div><p class="small t2">Mencocokkan setiap berkas tercatat dengan Google Drive (hilang, terhapus, atau ukurannya berubah).</p><button class="btn btn-primary mt12" data-periksa>' + ikon('file-search') + 'Mulai pemeriksaan</button><div data-hasil class="mt16"></div></div></div>';
  $('[data-periksa]', box).onclick = e => sibuk(e.currentTarget, async () => {
    const out = $('[data-hasil]', box); let offset = 0, masalah = [], total = 0;
    for (let i = 0; i < 40; i++) {
      const x = await api('berkas.periksa', { offset }, { timeout: 60000 });
      if (!x.success) return galat(x);
      total = x.data.total; offset = x.data.offset; masalah = masalah.concat(x.data.masalah);
      out.innerHTML = '<div class="prog"><i style="width:' + Math.round(offset / Math.max(1, total) * 100) + '%"></i></div><div class="xs muted mt4">' + offset + ' / ' + total + ' berkas diperiksa</div>';
      if (x.data.selesai) break;
    }
    out.innerHTML = masalah.length ? '<div class="note err mb8">' + ikon('triangle-alert', 'sm') + '<span>' + masalah.length + ' berkas bermasalah dari ' + total + '.</span></div>' + masalah.map(m => '<div class="file-i"><div class="file-ic">' + ikon('file-x') + '</div><div class="grow"><div class="fn">' + esc(m.nama) + '</div><div class="fs">' + esc(m.masalah) + ' · <a href="#/m/' + m.modul + '/' + encodeURIComponent(m.dataId) + '">' + esc(m.dataId) + '</a></div></div></div>').join('') : '<div class="note ok">' + ikon('circle-check', 'sm') + '<span>Semua ' + total + ' berkas utuh.</span></div>';
  });
}

/* ---------------------------------------------------------------------
 * Profil
 * ------------------------------------------------------------------- */
daftarHalaman('profil', {
  tampil(el) {
    el.innerHTML = headHalaman({ crumbs: ['Akun', 'Profil'], judul: 'Profil & Kata Sandi' }) +
      '<div class="grid g2"><div class="card"><div class="flex gap12 mb16"><span class="av ' + (isAdmin() ? 'teal' : '') + '" style="width:52px;height:52px;font-size:17px">' + esc(S.me.inisial || inisial(S.me.nama)) + '</span><div><div class="b" style="font-size:16px">' + esc(S.me.nama) + '</div><div class="small muted">' + esc(S.me.email) + ' · ' + (isAdmin() ? 'Admin Operator' : 'Staf Tata Usaha') + '</div></div></div>' +
      '<form class="form-grid" data-p novalidate><div class="field full" data-f="nama"><label>Nama lengkap</label><input name="nama" value="' + esc(S.me.nama) + '"><div class="ferr" hidden></div></div><div class="field full" data-f="nomorHp"><label>No. HP / WhatsApp (untuk notifikasi)</label><input name="nomorHp" inputmode="tel" value="' + esc((S.boot && S.boot.me && S.boot.me.nomorHp) || '') + '" placeholder="08xxxxxxxxxx"><div class="ferr" hidden></div></div></form><div class="flex end mt16"><button class="btn btn-primary" data-sp>' + ikon('check') + 'Simpan profil</button></div>' +
      (isAdmin() ? '' : '<div class="sec-t">Izin modul Anda</div><div>' + (S.me.izin || []).map(i => '<span class="tag" style="margin:2px">' + esc(IZIN_PENDEK[i] || i) + '</span>').join('') + '</div>') + '</div>' +
      '<div class="card"><div class="card-h"><div class="ttl">Ganti kata sandi</div></div><form class="flex-col gap12" style="display:flex" data-g novalidate><div class="field"><label>Sandi saat ini</label><input type="password" name="lama" autocomplete="current-password"></div><div class="field"><label>Sandi baru</label><input type="password" name="baru" autocomplete="new-password"><div class="hint">Minimal 8 karakter berisi huruf dan angka.</div></div><div class="field"><label>Ulangi sandi baru</label><input type="password" name="ulang" autocomplete="new-password"></div></form><div class="flex end mt16"><button class="btn btn-primary" data-sg>' + ikon('key-round') + 'Ganti sandi</button></div><div class="note mt16">' + ikon('info', 'sm') + '<span>Mengganti sandi mengakhiri sesi Anda di perangkat lain.</span></div></div></div>';
    $('[data-sp]', el).onclick = e => sibuk(e.currentTarget, async () => {
      const f = $('[data-p]', el), d = { nama: f.nama.value.trim(), nomorHp: f.nomorHp.value.trim() };
      if (tandaiGalat(f, { nama: d.nama.length < 3 ? 'Minimal 3 karakter.' : '', nomorHp: d.nomorHp && !V.hp(d.nomorHp) ? 'Nomor HP tidak valid.' : '' })) return;
      const x = await api('profil.simpan', d); if (!x.success) return galat(x);
      S.me = Object.assign(S.me, x.data.me); simpanSesi(); toast(x.message); segarkanBoot(); renderShell(); rute();
    });
    $('[data-sg]', el).onclick = e => sibuk(e.currentTarget, async () => {
      const f = $('[data-g]', el);
      if (!V.sandi(f.baru.value)) return toast('Sandi baru minimal 8 karakter berisi huruf dan angka.', 'warn');
      if (f.baru.value !== f.ulang.value) return toast('Ulangan sandi tidak sama.', 'warn');
      const x = await api('auth.gantiSandi', { sandiLama: f.lama.value, sandiBaru: f.baru.value }); if (!x.success) return galat(x);
      S.token = x.data.token; simpanSesi(); f.reset(); toast('Kata sandi diganti. Sesi lain telah diakhiri.');
    });
  }
});

/* ---------------------------------------------------------------------
 * Panduan
 * ------------------------------------------------------------------- */
daftarHalaman('panduan', {
  tampil(el, s, p, o) {
    if (!o.baru) return;
    el.innerHTML = headHalaman({ crumbs: ['Bantuan', 'Panduan'], judul: 'Panduan Pemakaian', sub: 'Alur kerja harian SIM Tata Usaha ' + esc((S.publik && S.publik.singkatan) || '') }) +
      '<div class="grid g-12"><div class="card s8 help">' +
      '<h3>1. Alur data: input → verifikasi → arsip resmi</h3><p>Staf menginput data dan melampirkan berkas (PDF/JPG, maks. 10 MB). Data berstatus <span class="chip chip-wait">Menunggu Verifikasi</span> sampai Admin Operator memeriksanya di menu <b>Verifikasi Data</b>. Admin dapat <b>menyetujui</b> (data menjadi <span class="chip chip-ok">Terverifikasi</span> dan berkas dipindah ke folder arsip) atau <b>menolak</b> dengan kategori & uraian (<span class="chip chip-no">Ditolak</span>).</p>' +
      '<h3>2. Memperbaiki data yang ditolak</h3><p>Data yang ditolak muncul di Dashboard bagian <b>Perlu Diperbaiki</b> beserta alasannya. Klik <b>Perbaiki</b>, sesuaikan isian atau ganti berkas, lalu simpan — data otomatis masuk antrean lagi sebagai revisi.</p>' +
      '<h3>3. Surat keluar & dokumen ber-QR</h3><p>Gunakan <b>Buat Dokumen</b> untuk surat dinas, lembar disposisi, surat keterangan pindah, dan buku agenda. Nomor surat diambil otomatis dari register, dokumen diberi QR verifikasi, dan (untuk surat bernomor) otomatis tercatat di Surat Keluar. Cetak PDF, tanda tangani basah, dan stempel. Siapa pun dapat memindai QR untuk memastikan keaslian.</p>' +
      '<h3>4. Data pribadi</h3><p>NISN, tanggal lahir, nama ibu kandung, dan HP orang tua tampil tersamar (mis. <span class="mono samar">00••••4567</span>) bagi staf tanpa izin "data pribadi". Jangan menuliskan data pribadi di kolom keterangan atau nama berkas.</p>' +
      '<h3>5. Ekspor & laporan</h3><p>Setiap modul memiliki tombol <b>Ekspor</b> ke Excel/PDF sesuai filter yang sedang aktif. Menu <b>Laporan & Ekspor</b> menampilkan rekap per bulan.</p>' +
      '<h3>6. Tips cepat</h3><ul><li>Tekan <span class="kbd">Ctrl</span> + <span class="kbd">/</span> untuk mencari arsip dari halaman mana pun.</li><li>Formulir input menyimpan draf otomatis — aman bila tab tertutup tidak sengaja.</li><li>Di Verifikasi, tombol <span class="kbd">J</span>/<span class="kbd">K</span> berpindah ke data berikutnya/sebelumnya.</li><li>Centang "Ingat saya" hanya di perangkat pribadi.</li></ul>' +
      '</div><div class="s4 flex-col gap16" style="display:flex"><div class="card"><div class="card-h"><div class="ttl">Status data</div></div><div class="flex-col gap8" style="display:flex"><div class="flex between">' + chipStatus('MENUNGGU') + '<span class="xs muted">diperiksa Admin</span></div><div class="flex between">' + chipStatus('TERVERIFIKASI') + '<span class="xs muted">arsip resmi</span></div><div class="flex between">' + chipStatus('DITOLAK') + '<span class="xs muted">perlu diperbaiki</span></div></div></div>' +
      '<div class="card"><div class="card-h"><div class="ttl">Butuh bantuan?</div></div><p class="small t2">Hubungi Admin Operator sekolah untuk akun, izin modul, atau data yang keliru.</p><div class="divider"></div><div class="xs muted">SIM Tata Usaha v' + esc((S.boot && S.boot.versi) || '') + '<br>Penyedia: Kelas @khoirulfajarid · khoirulfajar.abughazi@gmail.com</div></div></div></div>';
  }
});
