/* =====================================================================
   SIM TATA USAHA — pages-dash.js
   Dashboard Admin Operator (komposisi arsip, kartu metrik, alasan
   pindah, tren surat, distribusi kelas, antrean, persetujuan kilat,
   sinkronisasi cloud, produktivitas) dan Dashboard Staf.
   ===================================================================== */
'use strict';

function menuTambahData(btn) {
  const items = ['sm', 'sk', 'pm', 'pk', 'spmb', 'gtk', 'cuti'].filter(modulBoleh);
  popover(btn, items.map(k => '<a class="pi" href="#/m/' + k + '?baru=1" data-tutup>' + ikon(ikonModul(k)) + esc(LABEL_TOMBOL[k]) + '</a>').join('') + (bolehDokumen() ? '<hr><a class="pi" href="#/dokumen" data-tutup>' + ikon('file-plus') + 'Buat dokumen ber-QR</a>' : ''));
}

daftarHalaman('dash', {
  tampil(el, sisa, params, o) {
    if (!isAdmin()) return dashStaf(el, o);
    if (o.baru) {
      const bulanIni = hariIni().slice(0, 7);
      el.innerHTML = headHalaman({ crumbs: ['Beranda', 'Dashboard Admin'], judul: 'Dashboard Admin Operator', aksi: '<label class="flex gap8 inp" style="height:38px;width:auto;padding:0 10px">' + ikon('calendar', 'sm') + '<input type="month" data-bulan value="' + bulanIni + '" max="' + bulanIni + '" style="border:0;outline:0;font:600 13px var(--font-data);background:none" aria-label="Bulan"></label><button class="btn btn-primary" data-tambah>' + ikon('plus') + 'Tambah Data</button>' }) + '<div data-isi>' + skeletonDash() + '</div>';
      $('[data-tambah]', el).onclick = e => menuTambahData(e.currentTarget);
      $('[data-bulan]', el).onchange = () => muatDashAdmin(el, true);
      document.addEventListener('sinyal', () => { if (!el.hidden) muatDashAdmin(el, true); });
    }
    muatDashAdmin(el, false);
  }
});
function skeletonDash() { return '<div class="grid g-12"><div class="card s5 sk-blk sk"></div><div class="s7 grid g2"><div class="card sk" style="height:110px"></div><div class="card sk" style="height:110px"></div><div class="card sk" style="height:110px"></div><div class="card sk" style="height:110px"></div></div><div class="card s4 sk" style="height:300px"></div><div class="card s5 sk" style="height:300px"></div><div class="card s3 sk" style="height:300px"></div></div>'; }
function muatDashAdmin(el, paksa) {
  const bulan = $('[data-bulan]', el).value || hariIni().slice(0, 7);
  return swr('dashA:' + bulan, 'dash.admin', { bulan }, d => gambarDashAdmin(el, d), { fresh: 45000, force: paksa, onError: r => { $('[data-isi]', el).innerHTML = galatHtml(r); pasangUlang(el, () => muatDashAdmin(el, true)); } });
}
function gambarDashAdmin(el, d) {
  const k = d.kartu, kp = d.komposisi;
  const blnNama = BULAN[Number(d.bulan.slice(5)) - 1] + ' ' + d.bulan.slice(0, 4);
  const hariLabel = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const idxHari = d.mingguan.findIndex(x => x.tgl === d.hari);
  const alasanWarna = [WARNA.or, WARNA.tealD, WARNA.amber, WARNA.teal, WARNA.abu];
  const totMut = d.alasan.reduce((a, x) => a + x.n, 0);
  const prodKey = Pref.get('prodRentang', '7H');
  const prod = d.produktivitas.filter(p => p.peran !== 'ADMIN' || p.n[prodKey] || p.verif[prodKey]);
  const html =
    '<div class="grid g-12">' +
    // Komposisi
    '<div class="card s5"><div class="card-h"><div class="ttl">Komposisi Arsip Digital</div><span class="chip chip-teal">Terverifikasi</span></div><div class="card-sub">Total arsip resmi di Google Drive & Sheets sekolah.</div>' +
    '<div class="stack mt16"><i style="width:' + kp.surat + '%;background:' + WARNA.or + '"></i><i style="width:' + kp.siswa + '%;background:' + WARNA.tealD + '"></i><i style="width:' + kp.gtk + '%;background:' + WARNA.amber + '"></i></div>' +
    '<div class="legend mt12"><span><i style="background:' + WARNA.or + '"></i>Surat (' + kp.surat + '%)</span><span><i style="background:' + WARNA.tealD + '"></i>Kesiswaan (' + kp.siswa + '%)</span><span><i style="background:' + WARNA.amber + '"></i>Pegawai & GTK (' + kp.gtk + '%)</span></div>' +
    '<div class="grid g3 mt16" style="background:#F0F3FF;border-radius:12px;padding:16px;gap:12px"><div><div class="lbl">Total Surat</div><div class="metric-n">' + angka(kp.nSurat) + '</div><div class="xs muted">Masuk / Keluar</div></div><div><div class="lbl">Berkas Siswa</div><div class="metric-n">' + angka(kp.nSiswa) + '</div><div class="xs muted">Mutasi & SPMB</div></div><div><div class="lbl">Data GTK</div><div class="metric-n">' + angka(kp.gtkAktif) + '</div><div class="xs muted">GTK aktif</div></div></div></div>' +
    // 4 metrik
    '<div class="s7 grid g2" style="gap:16px">' +
    metricHtml({ ikon: 'inbox', label: 'Surat Masuk', sub: blnNama, nilai: angka(k.sm.n), satuan: 'surat', tren: trenHtml(k.sm.tren), kanan: k.sm.target ? 'Target ' + k.sm.target + '/bln' : (k.sm.menunggu ? k.sm.menunggu + ' menunggu' : ''), klik: '#/m/sm' }) +
    metricHtml({ ikon: 'send', label: 'Surat Keluar', sub: blnNama, nilai: angka(k.sk.n), satuan: 'surat', tren: trenHtml(k.sk.tren), kanan: k.sk.menunggu ? k.sk.menunggu + ' menunggu' : 'SK & pemberitahuan', klik: '#/m/sk', warna: 'teal' }) +
    metricHtml({ ikon: 'users', label: 'Siswa Pindah', sub: 'T.A. ' + d.tahunAjaran, nilai: '<span class="ok-t">' + k.pindah.masuk + '</span><small>masuk</small> / <span class="no-t">' + k.pindah.keluar + '</span><small>keluar</small>', tren: '<span class="chip chip-muted">' + (k.pindah.net === 0 ? 'Stabil' : k.pindah.net > 0 ? 'Bertambah' : 'Berkurang') + '</span>', kanan: 'Net ' + (k.pindah.net > 0 ? '+' : '') + k.pindah.net + ' siswa', klik: '#/m/pm', warna: 'teal' }) +
    metricHtml({ ikon: 'user-check', label: 'Pendaftar SPMB', sub: 'T.A. ' + d.tahunAjaran, nilai: angka(k.spmb.n), satuan: 'siswa', tren: trenHtml(k.spmb.tren), kanan: k.spmb.kuota ? 'Kuota ' + k.spmb.kuota + ' (' + String(k.spmb.persen).replace('.', ',') + '%)' : '', klik: '#/m/spmb', warna: 'wait' }) +
    '</div>' +
    // Alasan pindah
    '<div class="card s4"><div class="card-h"><div class="ttl">Alasan Pindah</div></div><div class="card-sub">Mutasi siswa masuk & keluar T.A. ' + esc(d.tahunAjaran) + '</div><div class="donut-wrap mt8">' + grafikDonat(d.alasan.map((a, i) => ({ n: a.n, warna: alasanWarna[i % 5] })), 160, String(totMut), 'Total mutasi') +
    '<div class="lst">' + (d.alasan.length ? d.alasan.slice(0, 5).map((a, i) => '<div class="li"><span><i class="dot" style="background:' + alasanWarna[i % 5] + '"></i><span class="ellipsis">' + esc(a.nama) + '</span></span><b class="tnum nowrap">' + Math.round(a.n / (totMut || 1) * 100) + '% <span class="muted">(' + a.n + ')</span></b></div>').join('') : '<div class="small muted ctr">Belum ada data mutasi.</div>') + '</div></div></div>' +
    // Tren mingguan
    '<div class="card s5"><div class="card-h"><div class="ttl">Tren Surat Mingguan</div><div class="legend"><span><i style="background:' + WARNA.or + '"></i>Masuk</span><span><i style="background:' + WARNA.tealD + '"></i>Keluar</span></div></div><div class="card-sub">Senin – Minggu pekan berjalan</div>' +
    grafikBatang(hariLabel, [{ nama: 'Surat masuk', warna: WARNA.or, data: d.mingguan.map(x => x.masuk) }, { nama: 'Surat keluar', warna: WARNA.tealD, data: d.mingguan.map(x => x.keluar) }], { tinggi: 200, sorot: idxHari, aria: 'Tren surat mingguan' }) +
    '<div class="mini3 mt12"><div><div class="xs muted">Rata-rata harian</div><div class="b">' + String(d.mini.rataHarian).replace('.', ',') + ' surat/hari</div></div><div><div class="xs muted">Berlampiran PDF/JPG</div><div class="b ok-t">' + (d.mini.lampiran == null ? '–' : String(d.mini.lampiran).replace('.', ',') + '%') + '</div></div><div><div class="xs muted">Median waktu verifikasi</div><div class="b">' + (d.mini.slaJam == null ? '–' : '< ' + String(Math.max(.1, d.mini.slaJam)).replace('.', ',') + ' jam') + '</div></div></div></div>' +
    // Distribusi kelas
    '<div class="card s3"><div class="card-h"><div class="ttl">Distribusi Kelas</div></div><div class="card-sub">Pengisian kuota rombel SPMB</div>' +
    (d.distribusi.length ? d.distribusi.map((x, i) => { const p = x.kuota ? Math.round(x.n / x.kuota * 100) : 0; return '<div class="prog-row"><div class="pr-h"><span>Kelas ' + esc(x.nama) + '</span><span class="' + (p >= 95 ? 'or-t' : 'teal-t') + '">' + p + '% <span class="muted b">(' + x.n + '/' + x.kuota + ')</span></span></div><div class="prog"><i class="' + (i % 2 ? 'teal' : '') + '" style="width:' + Math.min(100, p) + '%"></i></div></div>'; }).join('') : '<div class="small muted">Atur kuota kelas di Master Data → Kelas.</div>') +
    '<div class="flex between mt16" style="border-top:1px solid var(--border);padding-top:12px"><span class="xs muted b">TOTAL SISA KURSI</span><span class="chip ' + (d.sisaKursi ? 'chip-no' : 'chip-ok') + '">' + d.sisaKursi + ' kursi tersedia</span></div></div>' +
    // Antrean input staf
    '<div class="card s4"><div class="card-h"><div class="ttl">Antrean Input Staf</div><span class="chip chip-or">' + d.antrean.total + '</span></div><div class="card-sub">Menunggu pemeriksaan Admin</div>' +
    (d.antreanTerbaru.length ? d.antreanTerbaru.map(a => '<div class="q-item"><span class="av sm">' + esc(inisial(a.pencatat)) + '</span><div class="grow"><div class="qt ellipsis">' + esc(a.pencatat) + '</div><div class="qs ellipsis">' + esc(a.label) + ' · ' + esc(a.judul) + '</div></div><div class="right nowrap"><div class="xs wait-t b">' + esc(relatif(a.waktuInput)) + '</div><a class="small b" href="#/verifikasi?modul=' + a.modul + '&id=' + encodeURIComponent(a.id) + '">Tinjau</a></div></div>').join('') : kosongHtml('check-check', 'Antrean bersih', 'Semua data sudah diperiksa.')) +
    '<div class="ctr mt12"><a class="small b" href="#/verifikasi">Lihat semua ' + d.antrean.total + ' data menunggu →</a></div></div>' +
    // Pusat antrean (teal)
    '<div class="card s4 hero-teal"><span class="chip" style="background:rgba(255,255,255,.12);color:#fff">PUSAT ANTREAN</span><div class="flex between mt16"><div><div class="lbl">Perlu validasi</div><div class="metric-n" style="color:#fff;font-size:40px;line-height:46px">' + d.antrean.total + '</div><div class="small" style="opacity:.75">' + esc(blnNama) + '</div></div>' + cincin(d.antrean.persenBerkas, 92, '#F26522') + '</div>' +
    '<p class="small mt12" style="opacity:.85;line-height:20px">' + (d.antrean.persenBerkas == null ? 'Antrean tidak memuat data berlampiran.' : d.antrean.persenBerkas + '% data dalam antrean sudah melampirkan berkas dan siap diperiksa.') + '</p>' +
    '<button class="btn btn-lg w100 mt16" style="background:#fff;color:var(--teal);border:0" onclick="location.hash=\'#/verifikasi\'">' + ikon('play') + 'Mulai Verifikasi Cepat</button></div>' +
    // Persetujuan kilat
    '<div class="card s4"><div class="card-h"><div class="ttl">Persetujuan Kilat</div><span class="xs muted b">Data terlama</span></div>' +
    (d.kilat.length ? d.kilat.map(a => '<div class="q-item" data-kilat="' + esc(a.modul + '|' + a.id + '|' + a.versi) + '"><div class="grow"><div class="flex gap8 wrap"><span class="qt mono nowrap">' + esc(a.id) + '</span><span class="chip chip-teal">' + esc(a.label) + '</span></div><div class="qs ellipsis mt4">' + esc(a.judul) + (a.sub ? ' — ' + esc(a.sub) : '') + '</div></div><div class="flex-col gap4" style="display:flex"><button class="btn btn-primary btn-sm" data-ok>Setujui</button><button class="btn btn-danger-soft btn-sm" data-no>Tolak</button></div></div>').join('') : kosongHtml('sparkles', 'Tidak ada antrean', '')) +
    '<div class="flex between mt12 xs muted"><span>Setujui tanpa membuka berkas hanya bila sudah diperiksa fisik.</span><a class="b" href="#/verifikasi">Buka split-view</a></div></div>' +
    // Grafik bulanan
    '<div class="card s6"><div class="card-h"><div class="ttl">Surat per Bulan ' + esc(d.bulan.slice(0, 4)) + '</div><div class="legend"><span><i style="background:' + WARNA.or + '"></i>Masuk</span><span><i style="background:' + WARNA.tealD + '"></i>Keluar</span></div></div>' +
    grafikBatang(BLN, [{ nama: 'Masuk', warna: WARNA.or, data: d.bulanan.map(x => x.masuk) }, { nama: 'Keluar', warna: WARNA.tealD, data: d.bulanan.map(x => x.keluar) }], { tinggi: 210, sorot: Number(d.bulan.slice(5)) - 1 }) + '</div>' +
    '<div class="card s6"><div class="card-h"><div class="ttl">Mutasi Siswa per Bulan</div><div class="legend"><span><i style="background:' + WARNA.hijau + '"></i>Pindah masuk</span><span><i style="background:' + WARNA.merah + '"></i>Pindah keluar</span></div></div>' +
    grafikGaris(d.mutasi.map(x => BLN[Number(x.bulan.slice(5)) - 1]), [{ nama: 'Masuk', warna: WARNA.hijau, data: d.mutasi.map(x => x.masuk) }, { nama: 'Keluar', warna: WARNA.merah, data: d.mutasi.map(x => x.keluar) }], { tinggi: 210, area: true }) + '</div>' +
    // Cloud
    '<div class="card s5"><div class="card-h"><div class="ttl">Sinkronisasi Cloud</div><span class="chip chip-ok titik">Google Apps Script</span></div><div class="card-sub">Berkas JPG/PDF tersimpan privat di Drive sekolah</div><div class="flex gap8" style="align-items:baseline"><div class="metric-n">' + angka(d.cloud.totalBerkas) + '</div><span class="small t2">berkas</span></div>' + sparkline(d.cloud.spark.map(x => x.n)) +
    '<div class="flex between mt8 xs muted b" style="border-top:1px solid var(--border);padding-top:10px"><span>KAPASITAS TERPAKAI</span><span class="t2">' + (d.drive && d.drive.batas ? bytes(d.drive.pakai) + ' / ' + bytes(d.drive.batas) + ' (' + String(d.drive.persen).replace('.', ',') + '%)' : '–') + '</span></div></div>' +
    // Produktivitas
    '<div class="card s7"><div class="card-h"><div class="ttl">Produktivitas Tata Usaha</div><div class="seg" data-prod>' + ['1H', '7H', '1B', '1T'].map(x => '<button class="' + (x === prodKey ? 'on' : '') + '" data-r="' + x + '">' + x + '</button>').join('') + '</div></div><div class="card-sub">Jumlah data diinput (staf) dan diverifikasi (Admin)</div>' +
    lollipop(prod, prodKey) + '</div>' +
    '</div>';
  $('[data-isi]', el).innerHTML = html;
  $$('[data-klik]', el).forEach(c => c.onclick = () => { location.hash = c.dataset.klik; });
  $$('[data-prod] button', el).forEach(b => b.onclick = () => { Pref.set('prodRentang', b.dataset.r); gambarDashAdmin(el, d); });
  $$('[data-kilat]', el).forEach(row => {
    const [modul, id, versi] = row.dataset.kilat.split('|');
    $('[data-ok]', row).onclick = e => sibuk(e.currentTarget, async () => {
      const r = await api('verif.setujui', { modul, id, versi, catatan: 'Disetujui dari Persetujuan Kilat' });
      if (!r.success) return galat(r);
      toast('Data ' + id + ' terverifikasi.'); S.sinyal = r.data.sinyal; perbaruiBadge(); invalidasi('list:' + modul, 'verif:'); muatDashAdmin(el, true);
    });
    $('[data-no]', row).onclick = () => tolakData(modul, id, versi, () => { invalidasi('list:' + modul, 'verif:'); muatDashAdmin(el, true); });
  });
}
function lollipop(rows, kk) {
  if (!rows.length) return kosongHtml('users', 'Belum ada aktivitas', '');
  const nilai = rows.map(r => r.peran === 'ADMIN' ? r.verif[kk] : r.n[kk]);
  const maks = Math.max(1, ...nilai);
  return '<div class="lollipop">' + rows.map((r, i) => { const v = nilai[i]; return '<div class="lp ' + (r.peran === 'ADMIN' ? 'teal' : v ? '' : 'muted') + '" title="' + esc(r.nama + ': ' + v + (r.peran === 'ADMIN' ? ' diverifikasi' : ' diinput')) + '"><div class="hd">' + v + '</div><div class="st" style="height:' + Math.max(6, v / maks * 110) + 'px"></div></div>'; }).join('') + '</div>' +
    '<div class="lollipop-l">' + rows.map(r => '<div><b>' + esc(r.nama.replace(/,.*$/, '')) + '</b><span>' + esc(r.peran === 'ADMIN' ? 'Verifikator' : (r.bidang || 'Staf TU')) + '</span></div>').join('') + '</div>';
}

/* Tolak cepat (dipakai dashboard & verifikasi) */
function tolakData(modul, id, versi, selesai) {
  const opsi = (S.ref.alasan_tolak || []).map(r => '<option value="' + esc(r.kode) + '">' + esc(r.nama) + '</option>').join('');
  modal({
    judul: 'Tolak data ' + id, sub: 'Data dikembalikan ke staf pencatat untuk diperbaiki.', ikon: 'circle-x', ikonCls: 'no',
    isi: '<div class="field" data-f="kategori"><label>Kategori alasan <span class="req">*</span></label><select data-kat><option value="">— Pilih kategori —</option>' + opsi + '</select><div class="ferr" hidden></div></div>' +
      '<div class="field mt12" data-f="alasan"><label>Uraian untuk staf <span class="req">*</span></label><textarea data-al rows="3" maxlength="500" placeholder="Contoh: Lampiran halaman 2 terpotong, mohon pindai ulang."></textarea><div class="ferr" hidden></div></div>',
    tombol: [{ teks: 'Batal' }, {
      teks: 'Tolak & kembalikan', cls: 'btn-danger', ikon: 'circle-x', aksi: async (t, w) => {
        const kat = $('[data-kat]', w).value, al = $('[data-al]', w).value.trim();
        if (tandaiGalat(w, { kategori: kat ? '' : 'Pilih kategori.', alasan: al.length >= 5 ? '' : 'Minimal 5 karakter.' })) return false;
        const r = await api('verif.tolak', { modul, id, versi, kategori: kat, alasan: al });
        if (!r.success) { galat(r); return r.konflik ? true : false; }
        toast('Data ditolak dan dikembalikan ke staf.'); S.sinyal = r.data.sinyal; perbaruiBadge();
        selesai && selesai(); return true;
      }
    }]
  });
}

/* ---------------------------------------------------------------------
 * Dashboard Staf (mode staf: pribadi; mode admin: rekap per staf)
 * ------------------------------------------------------------------- */
daftarHalaman('dash/staf', { auth: 'admin', tampil(el, s, p, o) { dashStaf(el, o, true); } });
function dashStaf(el, o, modeAdmin) {
  if (o.baru) {
    const jam = Number(new Date(Date.now() + 8 * 3600e3).toISOString().slice(11, 13));
    const salam = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
    el.innerHTML = headHalaman({ crumbs: ['Beranda', modeAdmin ? 'Dashboard Staf' : 'Dashboard'], judul: modeAdmin ? 'Kinerja Staf Tata Usaha' : salam + ', ' + S.me.nama.replace(/,.*$/, ''), sub: modeAdmin ? 'Rekap input, antrean, dan penolakan per staf bulan ini.' : 'Ringkasan pekerjaan Anda hari ini · ' + fmtTgl(hariIni(), true), aksi: modeAdmin ? '' : '<button class="btn btn-primary" data-tambah>' + ikon('plus') + 'Input Data</button>' }) + '<div data-isi>' + skeletonDash() + '</div>';
    const t = $('[data-tambah]', el); if (t) t.onclick = e => menuTambahData(e.currentTarget);
  }
  swr(modeAdmin ? 'dashS:admin' : 'dashS', 'dash.staf', {}, d => d.mode === 'admin' ? gambarDashStafAdmin(el, d) : gambarDashStafSaya(el, d), { fresh: 30000, force: o.pindah && !o.baru, onError: r => { $('[data-isi]', el).innerHTML = galatHtml(r); pasangUlang(el, () => dashStaf(el, { baru: false }, modeAdmin)); } });
}
function gambarDashStafSaya(el, d) {
  const s = d.saya;
  const html = '<div class="grid g4">' +
    metricHtml({ ikon: 'notebook-pen', label: 'Input Saya', sub: 'Bulan ini', nilai: angka(s.inputBulan), satuan: 'data' }) +
    metricHtml({ ikon: 'clock', label: 'Menunggu Verifikasi', sub: 'Belum diperiksa Admin', nilai: angka(s.menunggu), satuan: 'data', warna: 'wait' }) +
    metricHtml({ ikon: 'circle-x', label: 'Perlu Diperbaiki', sub: 'Ditolak Admin', nilai: angka(s.ditolak), satuan: 'data', warna: 'no' }) +
    metricHtml({ ikon: 'circle-check', label: 'Terverifikasi', sub: 'Bulan ini', nilai: angka(s.verifBulan), satuan: 'data', warna: 'ok' }) + '</div>' +
    '<div class="grid g-12 mt24"><div class="card s7"><div class="card-h"><div class="ttl">Perlu Diperbaiki</div>' + (s.ditolak ? '<span class="chip chip-no">' + s.ditolak + '</span>' : '') + '</div>' +
    (d.ditolak.length ? d.ditolak.map(x => '<div class="q-item"><div class="mi no" style="width:36px;height:36px">' + ikon(ikonModul(x.modul), 'sm') + '</div><div class="grow"><div class="qt ellipsis">' + esc(x.judul) + ' <span class="xs muted mono">' + esc(x.id) + '</span></div><div class="qs"><b class="no-t">' + esc(x.kategori || 'Ditolak') + ':</b> ' + esc(x.alasan) + '</div><div class="xs muted mt4">' + esc(x.label) + ' · ' + esc(relatif(x.waktu)) + '</div></div><a class="btn btn-sm btn-primary" href="#/m/' + x.modul + '/' + encodeURIComponent(x.id) + '?edit=1">' + ikon('pencil', 'sm') + 'Perbaiki</a></div>').join('') : kosongHtml('check-check', 'Tidak ada yang perlu diperbaiki', 'Kerja bagus! Semua input Anda lolos pemeriksaan.')) + '</div>' +
    '<div class="card s5"><div class="card-h"><div class="ttl">Modul Saya</div><span class="xs muted b">Bulan ini / total</span></div>' +
    d.sekolah.map(x => '<a class="q-item" href="#/m/' + x.modul + '" style="text-decoration:none;color:inherit"><div class="mi teal" style="width:36px;height:36px">' + ikon(ikonModul(x.modul), 'sm') + '</div><div class="grow"><div class="qt">' + esc(x.label) + '</div><div class="qs">' + angka(x.bulanIni) + ' bulan ini · ' + angka(x.total) + ' total</div></div><span class="btn btn-sm" onclick="event.preventDefault();location.hash=\'#/m/' + x.modul + '?baru=1\'">' + ikon('plus', 'sm') + 'Input</span></a>').join('') + '</div>' +
    '<div class="card s12 p0"><div class="card-h" style="padding:18px 20px 0"><div class="ttl">Input Terakhir Saya</div></div>' +
    (d.terbaru.length ? '<div class="tbl-wrap tbl-resp"><table class="tbl"><thead><tr><th>Data</th><th>Modul</th><th>Waktu input</th><th>Status</th></tr></thead><tbody>' + d.terbaru.map(x => '<tr class="klik" data-h="#/m/' + x.modul + '/' + encodeURIComponent(x.id) + '"><td><b>' + esc(x.judul) + '</b><div class="sub">' + esc(x.id) + (x.sub ? ' · ' + esc(x.sub) : '') + '</div></td><td>' + esc(x.label) + '</td><td class="nowrap">' + esc(relatif(x.waktuInput)) + '</td><td>' + chipStatus(x.status) + '</td></tr>').join('') + '</tbody></table>' +
      '<div class="mlist">' + d.terbaru.map(x => '<div class="mitem" data-h="#/m/' + x.modul + '/' + encodeURIComponent(x.id) + '"><div class="grow"><div class="mt">' + esc(x.judul) + '</div><div class="ms">' + esc(x.label) + '</div><div class="mm">' + chipStatus(x.status, true) + '<span>' + esc(relatif(x.waktuInput)) + '</span></div></div></div>').join('') + '</div></div>' : kosongHtml('notebook-pen', 'Belum ada input', 'Mulai dengan tombol Input Data.')) + '</div></div>';
  $('[data-isi]', el).innerHTML = html;
  $$('[data-h]', el).forEach(r => r.onclick = () => { location.hash = r.dataset.h; });
}
function gambarDashStafAdmin(el, d) {
  $('[data-isi]', el).innerHTML = '<div class="card p0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Staf</th><th class="right">Input bulan ini</th><th class="right">Menunggu</th><th class="right">Ditolak</th><th class="right">Terverifikasi bulan ini</th><th>Terakhir masuk</th></tr></thead><tbody>' +
    d.staf.map(s => '<tr><td><div class="flex gap12"><span class="av ' + (s.peran === 'ADMIN' ? 'teal' : '') + '">' + esc(s.inisial) + '</span><div><b>' + esc(s.nama) + '</b><div class="sub">' + esc(s.bidang || (s.peran === 'ADMIN' ? 'Admin Operator' : 'Staf TU')) + '</div></div></div></td><td class="right b">' + s.inputBulan + '</td><td class="right">' + (s.menunggu ? '<span class="chip chip-wait">' + s.menunggu + '</span>' : '0') + '</td><td class="right">' + (s.ditolak ? '<span class="chip chip-no">' + s.ditolak + '</span>' : '0') + '</td><td class="right">' + s.verifBulan + '</td><td class="nowrap">' + esc(s.terakhir ? relatif(s.terakhir) : 'belum pernah') + '</td></tr>').join('') + '</tbody></table></div></div>' +
    '<div class="card p0 mt24"><div class="card-h" style="padding:18px 20px 0"><div class="ttl">Aktivitas Input Terbaru</div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Modul</th><th>Pencatat</th><th>Waktu</th><th>Status</th></tr></thead><tbody>' +
    d.terbaru.map(x => '<tr class="klik" data-h="#/m/' + x.modul + '/' + encodeURIComponent(x.id) + '"><td><b>' + esc(x.judul) + '</b><div class="sub">' + esc(x.id) + '</div></td><td>' + esc(x.label) + '</td><td>' + esc(x.pencatat) + '</td><td class="nowrap">' + esc(relatif(x.waktuInput)) + '</td><td>' + chipStatus(x.status, true) + '</td></tr>').join('') + '</tbody></table></div></div>';
  $$('[data-h]', el).forEach(r => r.onclick = () => { location.hash = r.dataset.h; });
}
