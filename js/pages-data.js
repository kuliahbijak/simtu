/* =====================================================================
   SIM TATA USAHA — pages-data.js
   Halaman generik 7 modul (daftar, filter, ekspor, detail, formulir
   input/ubah/revisi, berkas), Pusat Verifikasi (split-view), Sampah.
   ===================================================================== */
'use strict';

function fmtNilai(f, v) {
  if (v == null || v === '') return '';
  if (f.t === 'date') return /^\d{4}-\d{2}-\d{2}/.test(v) ? fmtTgl(v) : v;
  if (f.t === 'select' && f.ref) return f.ref === 'klasifikasi' ? v : refNama(f.ref, v);
  if (f.k === 'lamaHari') return v + ' hari kerja';
  return v;
}
function selNilai(f, v) {
  const t = fmtNilai(f, v);
  if (!t) return '<span class="muted">–</span>';
  const samar = /•/.test(String(v));
  return '<span class="' + (f.mono ? 'mono ' : '') + (samar ? 'samar' : '') + '"' + (samar ? ' title="Data pribadi tersamar"' : '') + '>' + esc(t) + '</span>';
}
function judulRow(m, r) { return r[m.judul] || r.id; }
const STD_KOSONG = { tab: 'semua', q: '', status: '', filter: {}, dari: '', sampai: '', page: 1, per: 10, sort: '', arah: 'desc' };

/* ---------------------------------------------------------------------
 * Halaman modul: #/m/<modul>[/<id>][?baru=1|edit=1]
 * ------------------------------------------------------------------- */
daftarHalaman('m', {
  kunci: s => 'm/' + s[0],
  boleh: s => modulBoleh(s[0]),
  tampil(el, sisa, params, o) {
    const k = sisa[0], m = S.modul[k];
    if (o.baru || !el._st) bangunModul(el, k, m);
    if (o.pindah || o.baru) muatDaftar(el);
    const id = sisa[1];
    if (id && (!el._dr || el._drId !== id)) bukaDetail(el, id, { edit: params.edit === '1' });
    else if (!id && el._dr) { const d = el._dr; el._dr = null; el._drId = null; d.tutup(true); }
    if (params.baru === '1' && !el._form) { history.replaceState(null, '', '#/m/' + k); bukaForm(el, null); }
  }
});

function bangunModul(el, k, m) {
  const simpan = (() => { try { return JSON.parse(sessionStorage.getItem(LS + 'q:' + k) || 'null'); } catch (e) { return null; } })();
  el._st = Object.assign({}, STD_KOSONG, simpan || {}, { filter: Object.assign({}, (simpan && simpan.filter) || {}) });
  el._k = k; el._m = m;
  const filterF = m.fields.filter(f => f.filter && f.t === 'select' && f.ref);
  el.innerHTML = headHalaman({
    crumbs: [GRUP_LABEL[m.grup] || 'Data', m.label], judul: JUDUL_MODUL[k] || m.label,
    sub: { sm: 'Pencatatan surat masuk beserta berkas pindaian; diverifikasi Admin sebelum menjadi arsip resmi.', sk: 'Register surat keluar bernomor otomatis — termasuk yang terbit dari menu Dokumen.', pm: 'Data siswa pindahan yang diterima sekolah, lengkap dengan berkas mutasi (PDF).', pk: 'Siswa yang pindah ke sekolah lain; NISN wajib diisi.', spmb: 'Pendaftar siswa baru per tahun ajaran dan pengisian kuota rombel.', gtk: 'Data guru dan tenaga kependidikan; NIP/NUPTK unik.', cuti: 'Pengajuan cuti GTK dengan hitung hari kerja & sisa cuti tahunan otomatis.' }[k],
    aksi: (punyaIzin('ekspor') ? '<button class="btn" data-ekspor>' + ikon('download') + 'Ekspor</button>' : '') + (isAdmin() ? '<a class="btn hide-m" href="#/migrasi?modul=' + k + '">' + ikon('upload') + 'Impor</a>' : '') + '<button class="btn btn-primary" data-baru>' + ikon('plus') + esc(LABEL_TOMBOL[k]) + '</button>'
  }) +
    '<div class="grid g5 mb16" data-ring>' + Array(5).fill('<div class="card sk" style="height:112px"></div>').join('') + '</div>' +
    '<div class="card p0"><div class="toolbar" style="border-bottom:0;padding-bottom:4px"><div class="seg" data-tab>' + [['semua', 'Semua'], ['bulanIni', 'Bulan Ini'], ['review', 'Perlu Review'], ['saya', 'Input Saya']].map(t => '<button data-t="' + t[0] + '">' + t[1] + '<span class="n" data-n="' + t[0] + '" hidden></span></button>').join('') + '</div></div>' +
    '<div class="toolbar"><label class="inp-ic">' + ikon('search', 'sm') + '<input class="inp" data-q placeholder="Cari ' + esc(m.fields.filter(f => f.cari && (!f.pribadi || isAdmin() || punyaIzin('pribadi'))).slice(0, 3).map(f => f.l.toLowerCase().replace(/ \(.*\)/, '')).join(', ')) + '…" aria-label="Cari"></label>' +
    '<select class="inp" data-status aria-label="Status"><option value="">Semua status</option><option value="MENUNGGU">Menunggu</option><option value="TERVERIFIKASI">Terverifikasi</option><option value="DITOLAK">Ditolak</option></select>' +
    filterF.map(f => '<select class="inp" data-fk="' + f.k + '" aria-label="' + esc(f.l) + '">' + opsiRef(f.ref, '', 'Semua ' + f.l.toLowerCase()) + '</select>').join('') +
    '<span class="flex gap4 hide-m"><input type="date" class="inp" data-dari aria-label="Dari tanggal" title="Dari tanggal"><span class="muted">–</span><input type="date" class="inp" data-sampai aria-label="Sampai tanggal" title="Sampai tanggal"></span>' +
    '<button class="btn btn-link btn-sm" data-reset hidden>Reset filter</button></div>' +
    '<div data-tabel>' + skeletonTabel(6) + '</div><div class="tbl-foot" data-foot hidden></div></div>';
  const st = el._st;
  // isi kontrol dari state
  $('[data-q]', el).value = st.q; $('[data-status]', el).value = st.status; $('[data-dari]', el).value = st.dari; $('[data-sampai]', el).value = st.sampai;
  $$('[data-fk]', el).forEach(s => { s.value = st.filter[s.dataset.fk] || ''; });
  const ubah = (p, reset) => { Object.assign(st, p); if (reset !== false) st.page = 1; try { sessionStorage.setItem(LS + 'q:' + k, JSON.stringify(st)); } catch (e) { /* abaikan */ } muatDaftar(el); };
  $$('[data-tab] button', el).forEach(b => b.onclick = () => ubah({ tab: b.dataset.t }));
  $('[data-q]', el).addEventListener('input', debounce(e => ubah({ q: e.target.value.trim() }), 350));
  $('[data-status]', el).onchange = e => ubah({ status: e.target.value });
  $$('[data-fk]', el).forEach(s => s.onchange = () => { st.filter[s.dataset.fk] = s.value; ubah({}); });
  $('[data-dari]', el).onchange = e => ubah({ dari: e.target.value });
  $('[data-sampai]', el).onchange = e => ubah({ sampai: e.target.value });
  $('[data-reset]', el).onclick = () => { Object.assign(st, JSON.parse(JSON.stringify(STD_KOSONG)), { per: st.per }); $('[data-q]', el).value = ''; $('[data-status]', el).value = ''; $('[data-dari]', el).value = ''; $('[data-sampai]', el).value = ''; $$('[data-fk]', el).forEach(s => { s.value = ''; }); ubah({}); };
  $('[data-baru]', el).onclick = () => bukaForm(el, null);
  const eb = $('[data-ekspor]', el);
  if (eb) eb.onclick = e => popover(e.currentTarget, '<button class="pi" data-x="xlsx">' + ikon('file-spreadsheet') + 'Excel (.xlsx) — sesuai filter</button><button class="pi" data-x="pdf">' + ikon('file-down') + 'PDF — sesuai filter</button>').querySelectorAll('[data-x]').forEach(b => b.onclick = () => { tutupPop(); eksporModul(el, b.dataset.x, eb); });
  el._ubah = ubah;
}
function kunciDaftar(el) { const st = el._st; return 'list:' + el._k + ':' + JSON.stringify({ tab: st.tab, q: st.q, status: st.status, filter: st.filter, dari: st.dari, sampai: st.sampai, page: st.page, per: st.per, sort: st.sort, arah: st.arah }); }
function muatDaftar(el, paksa) {
  const st = el._st, k = el._k;
  $$('[data-tab] button', el).forEach(b => b.classList.toggle('on', b.dataset.t === st.tab));
  const aktifFilter = st.q || st.status || st.dari || st.sampai || Object.keys(st.filter).some(x => st.filter[x]);
  $('[data-reset]', el).hidden = !aktifFilter;
  const payload = { modul: k, tab: st.tab, q: st.q, status: st.status, filter: st.filter, dari: st.dari, sampai: st.sampai, page: st.page, per: st.per, sort: st.sort, arah: st.arah };
  const kunci = kunciDaftar(el);
  el._kunci = kunci;
  return swr(kunci, 'data.list', payload, (d, dariCache) => { if (el._kunci === kunci) gambarDaftar(el, d); }, {
    fresh: 30000, force: paksa,
    onError: r => { $('[data-tabel]', el).innerHTML = galatHtml(r); pasangUlang(el, () => muatDaftar(el, true)); }
  }).then(r => {
    // pra-muat halaman berikutnya saat idle
    if (r && r.success && r.data && r.data.total > st.page * st.per) {
      const nx = Object.assign({}, payload, { page: st.page + 1 });
      const kk = 'list:' + k + ':' + JSON.stringify({ tab: st.tab, q: st.q, status: st.status, filter: st.filter, dari: st.dari, sampai: st.sampai, page: st.page + 1, per: st.per, sort: st.sort, arah: st.arah });
      if (!Store.get(kk, null)) saatSenggang(() => api('data.list', nx).then(x => { if (x.success) Store.set(kk, { t: Date.now(), h: hashStr(JSON.stringify(x.data)), data: x.data }); }), 1200);
    }
  });
}
function gambarDaftar(el, d) {
  const m = el._m, k = el._k, st = el._st, rg = d.ringkas;
  const thn = hariIni().slice(0, 4);
  $('[data-ring]', el).innerHTML =
    metricHtml({ ikon: ikonModul(k), label: 'Total Arsip', sub: angka(rg.tahunIni) + ' tercatat tahun ' + thn, nilai: angka(rg.total), satuan: 'data' }) +
    metricHtml({ ikon: 'calendar-days', label: 'Bulan Ini', sub: BULAN[Number(hariIni().slice(5, 7)) - 1], nilai: angka(rg.bulanIni), satuan: 'data', warna: 'teal' }) +
    metricHtml({ ikon: 'clock', label: 'Menunggu Verifikasi', sub: 'Antrean Admin', nilai: angka(rg.menunggu), warna: 'wait', klik: '' }) +
    metricHtml({ ikon: 'circle-x', label: 'Ditolak', sub: 'Perlu revisi staf', nilai: angka(rg.ditolak), warna: 'no' }) +
    (m.berkas ? metricHtml({ ikon: 'cloud', label: 'Penyimpanan', sub: 'Berkas modul ini di Drive', nilai: bytes(rg.penyimpanan).replace(/ (\w+)$/, '<small>$1</small>'), warna: 'teal' })
      : metricHtml({ ikon: 'shield-check', label: 'Akurasi Input', sub: 'Lolos tanpa revisi', nilai: rg.akurasi == null ? '–' : String(rg.akurasi).replace('.', ',') + '<small>%</small>', warna: 'ok' }));
  const n = $('[data-n="review"]', el); n.hidden = !(rg.menunggu + rg.ditolak); n.textContent = rg.menunggu + rg.ditolak;
  const n2 = $('[data-n="saya"]', el); n2.hidden = !rg.saya; n2.textContent = rg.saya;
  const listF = m.fields.filter(f => f.list && f.k !== m.judul && f.k !== m.sub);
  const fj = m.fields.find(f => f.k === m.judul) || {}, fs = m.fields.find(f => f.k === m.sub) || {};
  const tabel = $('[data-tabel]', el), foot = $('[data-foot]', el);
  if (!d.rows.length) {
    const ada = st.q || st.status || st.dari || st.sampai || st.tab !== 'semua' || Object.keys(st.filter).some(x => st.filter[x]);
    tabel.innerHTML = kosongHtml(ada ? 'search' : ikonModul(k), ada ? 'Tidak ada data yang cocok' : 'Belum ada data', ada ? 'Ubah kata kunci atau reset filter.' : 'Mulai dengan menekan tombol ' + LABEL_TOMBOL[k] + '.', ada ? '' : '<button class="btn btn-primary" data-baru2>' + ikon('plus') + esc(LABEL_TOMBOL[k]) + '</button>');
    const b2 = $('[data-baru2]', tabel); if (b2) b2.onclick = () => bukaForm(el, null);
    foot.hidden = true; return;
  }
  const th = (f, l) => '<th class="sortable" data-s="' + f + '">' + esc(l) + (st.sort === f ? ikon(st.arah === 'asc' ? 'arrow-up' : 'arrow-down', 'sm') : '') + '</th>';
  tabel.innerHTML = '<div class="tbl-wrap tbl-resp"><table class="tbl"><thead><tr>' + th(m.judul, fj.l || 'Data') + listF.map(f => th(f.k, f.l)).join('') + th('status', 'Status') + th('waktuInput', 'Pencatat') + '<th></th></tr></thead><tbody>' +
    d.rows.map(r => '<tr class="klik" data-id="' + esc(r.id) + '"><td><div class="b ' + (fj.mono ? 'mono' : '') + '">' + esc(judulRow(m, r)) + '</div><div class="sub">' + esc(fs.k ? fmtNilai(fs, r[fs.k]) : '') + '</div></td>' +
      listF.map(f => '<td class="' + (f.t === 'textarea' ? 'wrap-t' : 'nowrap') + '">' + selNilai(f, r[f.k]) + '</td>').join('') +
      '<td>' + chipStatus(r.status, true) + (Number(r.revisiKe) ? '<div class="sub">revisi ke-' + r.revisiKe + '</div>' : '') + '</td><td class="nowrap"><div>' + esc(r.pencatat) + '</div><div class="sub">' + esc(relatif(r.waktuInput)) + '</div></td><td>' + (Number(r.jumlahBerkas) ? '<span class="muted" title="' + r.jumlahBerkas + ' berkas">' + ikon('paperclip', 'sm') + '</span>' : '') + '</td></tr>').join('') +
    '</tbody></table><div class="mlist">' + d.rows.map(r => '<div class="mitem" data-id="' + esc(r.id) + '"><div class="mi ' + (r.status === 'TERVERIFIKASI' ? 'ok' : r.status === 'DITOLAK' ? 'no' : 'wait') + '" style="width:36px;height:36px">' + ikon(ikonModul(k), 'sm') + '</div><div class="grow"><div class="mt ' + (fj.mono ? 'mono' : '') + '">' + esc(judulRow(m, r)) + '</div><div class="ms">' + esc(fs.k ? fmtNilai(fs, r[fs.k]) : '') + '</div><div class="mm">' + chipStatus(r.status, true) + '<span>' + esc(relatif(r.waktuInput)) + '</span>' + (Number(r.jumlahBerkas) ? '<span>' + ikon('paperclip', 'sm') + r.jumlahBerkas + '</span>' : '') + '</div></div>' + ikon('chevron-right', 'muted') + '</div>').join('') + '</div></div>';
  $$('[data-id]', tabel).forEach(r => r.onclick = () => { location.hash = '#/m/' + k + '/' + encodeURIComponent(r.dataset.id); });
  $$('th[data-s]', tabel).forEach(t => t.onclick = () => { const s = t.dataset.s; el._ubah({ sort: s, arah: st.sort === s && st.arah === 'desc' ? 'asc' : 'desc' }); });
  foot.hidden = false;
  foot.innerHTML = pagerHtml(d.total, d.page, d.per) + '<label class="flex gap8">Baris <select class="inp sm" data-per style="width:auto;height:30px">' + [10, 25, 50, 100].map(x => '<option' + (x === d.per ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>';
  $$('[data-pg]', foot).forEach(b => b.onclick = () => { el._ubah({ page: +b.dataset.pg }, false); el.scrollIntoView({ block: 'start' }); });
  $('[data-per]', foot).onchange = e => el._ubah({ per: +e.target.value });
}

async function eksporModul(el, fmt, btn) {
  const m = el._m, k = el._k, st = el._st;
  await sibuk(btn, async () => {
    const r = await api('data.list', { modul: k, tab: st.tab, q: st.q, status: st.status, filter: st.filter, dari: st.dari, sampai: st.sampai, sort: st.sort, arah: st.arah, ekspor: true }, { timeout: 90000 });
    if (!r.success) return galat(r);
    if (!r.data.rows.length) return toast('Tidak ada data untuk diekspor.', 'warn');
    const kol = [{ l: 'ID', k: 'id', w: 16 }].concat(m.fields.filter(f => !f.sistem || ['namaGtk', 'nipNuptk'].indexOf(f.k) >= 0).filter(f => fmt === 'xlsx' || f.list || f.k === m.judul || f.k === m.sub).map(f => ({ l: f.l, w: f.t === 'textarea' ? 40 : 18, v: rr => fmtNilai(f, rr[f.k]) })))
      .concat([{ l: 'Status', v: rr => ST_LABEL[rr.status] || rr.status, w: 16 }, { l: 'Pencatat', k: 'pencatat', w: 20 }].concat(fmt === 'xlsx' ? [{ l: 'Waktu Input', v: rr => fmtWaktu(rr.waktuInput), w: 20 }, { l: 'Verifikator', k: 'verifikator', w: 20 }] : []));
    const info = [st.tab !== 'semua' ? { bulanIni: 'Bulan ini', review: 'Perlu review', saya: 'Input saya' }[st.tab] : '', st.status ? ST_LABEL[st.status] : '', st.q ? 'Cari: ' + st.q : '', st.dari || st.sampai ? 'Periode ' + (st.dari ? fmtTgl(st.dari) : '…') + ' – ' + (st.sampai ? fmtTgl(st.sampai) : '…') : ''].concat(Object.keys(st.filter).filter(x => st.filter[x]).map(x => { const f = m.fields.find(y => y.k === x); return f.l + ': ' + fmtNilai(f, st.filter[x]); })).filter(String).join(' · ') || 'Semua data';
    const nama = (JUDUL_MODUL[k] || m.label) + ' ' + hariIni();
    try {
      if (fmt === 'xlsx') await eksporExcel(nama, JUDUL_MODUL[k] || m.label, kol, r.data.rows, info + ' · ' + r.data.total + ' baris');
      else await eksporPdf(nama, JUDUL_MODUL[k] || m.label, kol, r.data.rows, info + ' · ' + r.data.total + ' baris');
      toast('Ekspor ' + (fmt === 'xlsx' ? 'Excel' : 'PDF') + ' selesai (' + r.data.rows.length + ' baris).' + (r.data.terbatas ? ' Dibatasi 5.000 baris.' : ''));
    } catch (e) { toast(e.message, 'err'); }
  });
}

/* ---------------------------------------------------------------------
 * Detail (laci geser)
 * ------------------------------------------------------------------- */
async function bukaDetail(el, id, opsi) {
  const k = el._k, m = el._m;
  if (el._dr) { el._dr.tutup(true); }
  const dr = laci({ judul: esc(m.label), sub: esc(id), isi: '<div class="sk sk-line" style="width:60%"></div><div class="sk sk-line"></div><div class="sk sk-blk mt16"></div>', onTutup: () => { if (el._dr === dr) { el._dr = null; el._drId = null; if (urai(location.hash).seg[2]) history.replaceState(null, '', '#/m/' + k); } } });
  el._dr = dr; el._drId = id;
  const r = await api('data.get', { modul: k, id });
  if (el._dr !== dr) return;
  if (!r.success) { dr.body.innerHTML = galatHtml(r); pasangUlang(dr.body, () => bukaDetail(el, id, opsi)); return; }
  gambarDetail(el, dr, r.data);
  if (opsi && opsi.edit && r.data.boleh.edit) bukaForm(el, r.data);
}
function gambarDetail(el, dr, d) {
  const k = el._k, m = el._m;
  dr.setJudul(esc(judulRow(m, d)), esc(m.label) + ' · <span class="mono">' + esc(d.id) + '</span>');
  dr.hact.innerHTML = chipStatus(d.status);
  const isiF = m.fields.filter(f => !f.sistem || (d[f.k] && ['namaGtk', 'nipNuptk', 'statusWA'].indexOf(f.k) >= 0));
  const riwayat = (d.riwayat || []).slice().reverse();
  const tolakTerakhir = riwayat.find(x => x.a === 'TOLAK');
  let h = '';
  if (d.dihapusPada) h += '<div class="reject-box mb16">' + ikon('trash-2', 'sm') + ' <b>Data ini ada di Sampah</b> — dihapus ' + esc(fmtWaktu(d.dihapusPada)) + '. Alasan: ' + esc(d.alasanHapus) + '</div>';
  if (d.status === 'DITOLAK') h += '<div class="reject-box mb16"><div class="flex gap8 b">' + ikon('circle-x', 'sm') + 'Ditolak: ' + esc(refNama('alasan_tolak', d.kategoriTolak)) + '</div><div class="small mt4" style="color:var(--text)">' + esc(d.alasanTolak) + '</div><div class="xs mt8">oleh ' + esc(d.verifikator || 'Admin') + ' · ' + esc(fmtWaktu(d.waktuVerifikasi)) + '</div>' + (d.boleh.edit ? '<button class="btn btn-sm btn-primary mt12" data-edit2>' + ikon('pencil', 'sm') + 'Perbaiki sekarang</button>' : '') + '</div>';
  else if (d.status === 'MENUNGGU') h += '<div class="note warn mb16">' + ikon('clock', 'sm') + '<span>Menunggu verifikasi Admin Operator' + (Number(d.revisiKe) ? ' · revisi ke-' + d.revisiKe : '') + '. Data belum menjadi arsip resmi.</span></div>';
  if (d._samar) h += '<div class="note mb16">' + ikon('lock', 'sm') + '<span>Sebagian data pribadi disamarkan. Hubungi Admin bila Anda memerlukan akses data pribadi.</span></div>';
  h += '<dl class="kv">' + isiF.map(f => '<dt>' + esc(f.l) + '</dt><dd>' + selNilai(f, d[f.k]) + '</dd>').join('') + '</dl>';
  if (k === 'cuti' && d.sisaCuti) h += '<div class="note mt16">' + ikon('calendar-days', 'sm') + '<span>Sisa cuti tahunan ' + d.sisaCuti.tahun + ': <b>' + d.sisaCuti.sisa + ' dari ' + d.sisaCuti.kuota + ' hari</b> (terpakai ' + d.sisaCuti.terpakai + ' hari, di luar pengajuan ini).</span></div>';
  if (m.berkas) {
    h += '<div class="sec-t">Berkas lampiran (' + d.berkas.length + ')</div>' + (d.berkas.length ? d.berkas.map(b => '<div class="file-i"><div class="file-ic ' + (/jpe?g/.test(b.mime) ? 'jpg' : '') + '">' + ikon(/jpe?g/.test(b.mime) ? 'image' : 'file-text') + '</div><div class="grow"><div class="fn">' + esc(b.nama) + '</div><div class="fs">' + bytes(b.ukuran) + ' · ' + esc(b.oleh) + ' · ' + esc(relatif(b.waktu)) + '</div></div><button class="btn btn-sm" data-lihat="' + esc(b.id) + '">' + ikon('eye', 'sm') + '<span class="hide-m">Lihat</span></button>' + (d.boleh.berkas ? '<button class="icon-btn" data-hb="' + esc(b.id) + '" aria-label="Hapus berkas">' + ikon('trash-2', 'sm') + '</button>' : '') + '</div>').join('') : '<div class="small muted">Belum ada berkas.</div>') +
      (d.boleh.berkas && d.berkas.length < m.berkas.maks ? '<div class="mt12" data-up></div><button class="btn btn-sm mt8" data-simpanb hidden>' + ikon('check', 'sm') + 'Simpan berkas tambahan</button>' : '');
  }
  if (d.dokumen && d.dokumen.length) h += '<div class="sec-t">Dokumen terbit</div>' + d.dokumen.map(x => '<a class="file-i" style="text-decoration:none;color:inherit" href="#/dokumen/riwayat?id=' + encodeURIComponent(x.id) + '"><div class="file-ic">' + ikon('qr-code') + '</div><div class="grow"><div class="fn">' + esc(x.perihal || x.kode) + '</div><div class="fs mono">' + esc(x.nomor || x.id) + ' · ' + esc(fmtTgl(x.terbit)) + '</div></div>' + (x.status === 'TERBIT' ? '<span class="chip chip-ok">Terbit</span>' : '<span class="chip chip-no">Ditarik</span>') + '</a>').join('');
  const tpl = (Store.get('docjenis', null) || { data: [] }).data.filter(t => t.modul === k && !t.periode);
  if (tpl.length && !d.dihapusPada && d.status !== 'DITOLAK') h += '<div class="sec-t">Buat dokumen dari data ini</div><div class="flex wrap gap8">' + tpl.map(t => '<a class="btn btn-sm" href="#/dokumen/buat/' + encodeURIComponent(t.id) + '?data=' + encodeURIComponent(d.id) + '">' + ikon('file-plus', 'sm') + esc(t.nama) + '</a>').join('') + '</div>';
  h += '<div class="sec-t">Pencatatan & verifikasi</div><div class="kv-box">' +
    [['Pencatat', d.pencatat + ' · ' + fmtWaktu(d.waktuInput)], d.verifikator ? ['Verifikator', d.verifikator + ' · ' + fmtWaktu(d.waktuVerifikasi)] : null, d.catatanVerifikasi ? ['Catatan verifikasi', d.catatanVerifikasi] : null, ['Sumber', { APP: 'Input aplikasi', IMPOR: 'Impor data lama', DOKUMEN: 'Terbit dari menu Dokumen', DEMO: 'Data demo' }[d.sumber] || d.sumber || '–'], ['Versi data', 'v' + d.versi]].filter(Boolean)
      .map(x => '<div class="kv-row"><span class="k">' + esc(x[0]) + '</span><span class="v">' + esc(x[1]) + '</span></div>').join('') + '</div>';
  h += '<div class="sec-t">Riwayat</div><div class="timeline">' + riwayat.map(x => '<div class="tl-i ' + ({ VERIFIKASI: 'ok', TOLAK: 'no', INPUT: 'or', REVISI: 'or' }[x.a] || '') + '"><div class="ta">' + esc({ INPUT: 'Diinput', UBAH: 'Diubah', REVISI: 'Direvisi staf', VERIFIKASI: 'Diverifikasi', TOLAK: 'Ditolak', HAPUS: 'Dihapus', PULIHKAN: 'Dipulihkan', DOKUMEN: 'Dokumen diterbitkan', HAPUS_BERKAS: 'Berkas dihapus', IMPOR: 'Impor', UBAH_DARI_CRM: 'Diubah dari CRM', DOKUMEN_DITARIK: 'Dokumen ditarik' }[x.a] || x.a) + ' · ' + esc(x.o) + '</div><div class="tw">' + esc(fmtWaktu(x.w)) + '</div>' + (x.c ? '<div class="tc">' + esc(x.c) + '</div>' : '') + '</div>').join('') + '</div>';
  dr.body.innerHTML = h;
  // kaki
  const kaki = [];
  if (d.boleh.hapus) kaki.push('<button class="btn btn-danger-soft" data-hapus>' + ikon('trash-2') + 'Hapus</button>');
  if (d.dihapusPada && isAdmin()) kaki.push('<button class="btn" data-pulih>' + ikon('undo-2') + 'Pulihkan</button>');
  kaki.push('<span class="grow hide-m"></span>');
  if (d.boleh.edit) kaki.push('<button class="btn' + (d.boleh.verifikasi ? '' : ' btn-primary') + '" data-edit>' + ikon('pencil') + (d.status === 'DITOLAK' && !isAdmin() ? 'Perbaiki' : 'Ubah') + '</button>');
  if (d.boleh.verifikasi) kaki.push('<a class="btn btn-primary" href="#/verifikasi?modul=' + k + '&id=' + encodeURIComponent(d.id) + '">' + ikon('shield-check') + 'Verifikasi</a>');
  dr.setKaki(kaki.join(''));
  const ed = () => bukaForm(el, d);
  $$('[data-edit],[data-edit2]', dr.el).forEach(b => b.onclick = ed);
  $$('[data-lihat]', dr.el).forEach(b => b.onclick = () => lihatBerkas(d.berkas.find(x => x.id === b.dataset.lihat), d.boleh.unduh));
  $$('[data-hb]', dr.el).forEach(b => b.onclick = async () => {
    const bb = d.berkas.find(x => x.id === b.dataset.hb);
    if (!await konfirmasi({ judul: 'Hapus berkas?', pesan: '<b>' + esc(bb.nama) + '</b> akan dipindah ke folder sampah Drive.', ok: 'Hapus', bahaya: true })) return;
    const r = await api('berkas.hapus', { id: bb.id }); if (!r.success) return galat(r);
    toast('Berkas dihapus.'); invalidasi('list:' + k); refreshDetail(el, dr, d.id);
  });
  const upEl = $('[data-up]', dr.el);
  if (upEl) {
    const sb = $('[data-simpanb]', dr.el);
    const up = Pengunggah(upEl, { modul: k, mime: m.berkas.mime, maks: m.berkas.maks, sudah: d.berkas.length, label: m.berkas.label, onChange: () => { sb.hidden = !up.ada(); sb.disabled = up.sibuk(); } });
    sb.onclick = () => sibuk(sb, async () => {
      const r = await api('data.simpan', { modul: k, id: d.id, versi: d.versi, data: {}, berkasIds: up.ids(), catatanUbah: d.status === 'TERVERIFIKASI' ? 'Menambah berkas lampiran' : '' });
      if (!r.success) return galat(r);
      toast('Berkas ditambahkan.'); invalidasi('list:' + k, 'verif:'); refreshDetail(el, dr, d.id);
    });
  }
  const hb = $('[data-hapus]', dr.el);
  if (hb) hb.onclick = async () => {
    const o = await konfirmasi({ judul: 'Hapus ' + m.label.toLowerCase() + '?', pesan: 'Data dipindah ke <b>Sampah</b> dan masih bisa dipulihkan.' + (k === 'sk' && d.nomorSurat ? '<br>Nomor <b class="mono">' + esc(d.nomorSurat) + '</b> akan tercatat <b>BATAL</b> dan tidak dipakai ulang.' : ''), ok: 'Pindahkan ke Sampah', bahaya: true, alasan: { label: 'Alasan penghapusan', ph: 'Contoh: data ganda dengan SM-2026-0012' } });
    if (!o) return;
    const r = await api('data.hapus', { modul: k, id: d.id, alasan: o.alasan }); if (!r.success) return galat(r);
    toast(r.message); invalidasi('list:' + k, 'verif:', 'dash'); dr.tutup(); muatDaftar(el, true);
  };
  const pb = $('[data-pulih]', dr.el);
  if (pb) pb.onclick = () => sibuk(pb, async () => { const r = await api('data.pulihkan', { modul: k, id: d.id }); if (!r.success) return galat(r); toast(r.message); invalidasi('list:' + k); refreshDetail(el, dr, d.id); muatDaftar(el, true); });
}
async function refreshDetail(el, dr, id) { const r = await api('data.get', { modul: el._k, id }); if (r.success && el._dr === dr) gambarDetail(el, dr, r.data); }

/* ---------------------------------------------------------------------
 * Formulir input / ubah / revisi
 * ------------------------------------------------------------------- */
function bukaForm(el, d) {
  const k = el._k, m = el._m, baru = !d, admin = isAdmin();
  const drafKey = 'draf:' + k;
  let draf = null;
  if (baru) { try { draf = JSON.parse(sessionStorage.getItem(LS + drafKey) || 'null'); } catch (e) { draf = null; } }
  const nilai = {};
  m.fields.forEach(f => {
    let v = d ? d[f.k] : '';
    if (baru) { if (f.bawaan === 'hariIni') v = hariIni(); else if (f.bawaan === 'tahunAjaran') v = S.boot.tahunAjaran; else if (f.bawaan) v = f.bawaan; }
    if (baru && draf && draf[f.k] != null && draf[f.k] !== '') v = draf[f.k];
    nilai[f.k] = v;
  });
  const butuhCatatan = d && admin && d.status === 'TERVERIFIKASI';
  const fields = m.fields.filter(f => !f.sistem);
  let h = '';
  if (draf && Object.keys(draf).some(x => draf[x])) h += '<div class="note or mb16" data-draf>' + ikon('notebook-pen', 'sm') + '<span class="grow">Draf terakhir dipulihkan otomatis.</span><button type="button" class="btn-link btn-sm btn" data-buang>Buang draf</button></div>';
  if (d && d.status === 'DITOLAK') h += '<div class="reject-box mb16 small"><b>' + esc(refNama('alasan_tolak', d.kategoriTolak)) + ':</b> ' + esc(d.alasanTolak) + '<div class="xs mt4">Perbaiki sesuai catatan, lalu simpan — data otomatis dikirim ulang ke antrean verifikasi.</div></div>';
  if (butuhCatatan) h += '<div class="note warn mb16">' + ikon('shield-alert', 'sm') + '<span>Data ini sudah <b>terverifikasi</b>. Setiap perubahan wajib diberi catatan dan tercatat di Audit Log.</span></div>';
  h += '<form class="form-grid" novalidate data-form>';
  fields.forEach(f => {
    if (f.auto === 'AGENDA') {
      h += '<div class="field" data-f="nomorAgenda"><label>' + esc(f.l) + '</label><input name="nomorAgenda" class="mono" readonly value="' + esc(nilai.nomorAgenda || '') + '" placeholder="Otomatis saat disimpan">' + (admin ? '<label class="check xs mt4"><input type="checkbox" data-manual="agenda"> Isi manual (arsip lama)</label>' : '<div class="hint">' + esc(f.hint || '') + '</div>') + '<div class="ferr" hidden></div></div>';
      return;
    }
    if (f.auto === 'SK') {
      h += '<div class="field" data-f="nomorSurat"><label>' + esc(f.l) + '</label><input name="nomorSurat" class="mono" readonly value="' + esc(nilai.nomorSurat || '') + '" placeholder="Pilih klasifikasi untuk melihat nomor">' + (admin ? '<label class="check xs mt4"><input type="checkbox" data-manual="sk"> Nomor manual (surat lama / di luar register)</label>' : '<div class="hint">Nomor diambil dari register saat disimpan — tidak bisa dipakai ganda.</div>') + '<div class="ferr" hidden></div></div>';
      return;
    }
    if (f.k === 'lamaHari') { h += '<div class="field" data-f="lamaHari"><label>' + esc(f.l) + '</label><input name="lamaHari" inputmode="numeric" value="' + esc(nilai.lamaHari || '') + '"' + (admin ? '' : ' readonly') + '><div class="hint" data-lama-hint>Dihitung otomatis (tanpa hari Minggu' + (S.setting.HARI_KERJA === '5' ? ' & Sabtu' : '') + ')</div><div class="ferr" hidden></div></div>'; return; }
    h += fieldHtml(f, nilai[f.k], { samar: d && d._samar });
    if (f.t === 'gtk') h += '<div class="full" data-sisa></div>';
  });
  if (m.berkas) h += '<div class="field full"><label>Lampiran berkas ' + (d ? '<span class="muted xs">(' + (d.berkas || []).length + ' sudah ada)</span>' : '') + '</label><div data-up></div></div>';
  if (butuhCatatan) h += '<div class="field full" data-f="_catatan"><label>Catatan perubahan <span class="req">*</span></label><textarea name="_catatan" rows="2" maxlength="200" placeholder="Contoh: koreksi tanggal surat sesuai fisik"></textarea><div class="ferr" hidden></div></div>';
  h += '</form>';
  const dr = laci({
    judul: esc(baru ? LABEL_TOMBOL[k] : (d.status === 'DITOLAK' && !admin ? 'Perbaiki ' : 'Ubah ') + m.label), sub: baru ? 'Kolom bertanda <span class="no-t">*</span> wajib diisi' : '<span class="mono">' + esc(d.id) + '</span>',
    isi: h, kaki: '<button class="btn" data-batal>Batal</button><button class="btn btn-primary" data-simpan>' + ikon('check') + (baru ? (admin && S.setting.ADMIN_AUTO_VERIF === 'YA' ? 'Simpan & Resmikan' : 'Simpan & Kirim Verifikasi') : d.status === 'DITOLAK' && !admin ? 'Simpan & Kirim Ulang' : 'Simpan Perubahan') + '</button>',
    onTutup: () => { el._form = null; }
  });
  el._form = dr;
  const form = $('[data-form]', dr.el);
  const up = m.berkas ? Pengunggah($('[data-up]', dr.el), { modul: k, mime: m.berkas.mime, maks: m.berkas.maks, sudah: d ? (d.berkas || []).length : 0, label: m.berkas.label, onChange: () => { $('[data-simpan]', dr.el).disabled = up.sibuk(); } }) : null;
  $('[data-batal]', dr.el).onclick = () => dr.tutup();
  const buang = $('[data-buang]', dr.el);
  if (buang) buang.onclick = () => { try { sessionStorage.removeItem(LS + drafKey); } catch (e) { /* abaikan */ } dr.tutup(); bukaForm(el, null); };
  // draf otomatis (input baru)
  if (baru) form.addEventListener('input', debounce(() => { if (form.dataset.selesai) return; const o = {}; fields.forEach(f => { const v = bacaField(form, f); if (v) o[f.k] = v; }); try { sessionStorage.setItem(LS + drafKey, JSON.stringify(o)); } catch (e) { /* abaikan */ } }, 600));
  // nomor otomatis (pratinjau)
  const prNomor = debounce(async () => {
    const inp = form.querySelector('[name=nomorSurat]'), man = form.querySelector('[data-manual=sk]');
    if (!inp || (man && man.checked) || !baru) return;
    const kl = (form.querySelector('[name=klasifikasi]') || {}).value, tg = (form.querySelector('[name=tanggalSurat]') || {}).value;
    if (!kl) { inp.value = ''; return; }
    const r = await api('nomor.pratinjau', { kode: 'SK', klasifikasi: kl, tanggal: tg });
    if (r.success && !(man && man.checked)) { inp.value = r.data.nomor; inp.title = 'Perkiraan nomor; nomor final diambil saat disimpan'; }
  }, 300);
  const prAgenda = debounce(async () => {
    const inp = form.querySelector('[name=nomorAgenda]'), man = form.querySelector('[data-manual=agenda]');
    if (!inp || (man && man.checked) || !baru) return;
    const r = await api('nomor.pratinjau', { kode: 'AGENDA', tanggal: (form.querySelector('[name=tanggalTerima]') || {}).value });
    if (r.success && !(man && man.checked)) inp.value = r.data.nomor;
  }, 300);
  if (k === 'sk') { ['klasifikasi', 'tanggalSurat'].forEach(n => { const x = form.querySelector('[name=' + n + ']'); if (x) x.addEventListener('change', prNomor); }); prNomor(); }
  if (k === 'sm') { const x = form.querySelector('[name=tanggalTerima]'); if (x) x.addEventListener('change', prAgenda); prAgenda(); }
  $$('[data-manual]', form).forEach(c => c.onchange = () => {
    const inp = form.querySelector(c.dataset.manual === 'sk' ? '[name=nomorSurat]' : '[name=nomorAgenda]');
    inp.readOnly = !c.checked; if (c.checked) { inp.value = d ? inp.value : ''; inp.focus(); inp.placeholder = 'Ketik nomor'; } else (c.dataset.manual === 'sk' ? prNomor : prAgenda)();
  });
  // cuti: pilihan GTK + sisa + hitung hari
  if (k === 'cuti') siapkanCuti(form, d, nilai);
  // tanggal terima ≥ tanggal surat (bantuan)
  $('[data-simpan]', dr.el).onclick = e => simpanForm(el, dr, form, d, up, e.currentTarget, butuhCatatan, false);
}
async function siapkanCuti(form, d, nilai) {
  const sel = form.querySelector('[data-gtk]'), box = form.querySelector('[data-sisa]');
  const r = await api('gtk.pilihan');
  if (!r.success) { sel.innerHTML = '<option value="">Gagal memuat — tutup lalu buka lagi</option>'; return; }
  sel.innerHTML = '<option value="">— Pilih guru / tenaga kependidikan —</option>' + r.data.map(g => '<option value="' + esc(g.id) + '"' + (g.id === nilai.gtkId ? ' selected' : '') + '>' + esc(g.nama) + (g.nipNuptk ? ' · ' + esc(g.nipNuptk) : '') + '</option>').join('');
  const lamaInp = form.querySelector('[name=lamaHari]');
  const hitung = () => {
    const a = form.querySelector('[name=tanggalMulai]').value, b = form.querySelector('[name=tanggalSelesai]').value;
    if (!V.tgl(a) || !V.tgl(b) || b < a) return;
    let n = 0, t = a, g = 0; const lima = S.setting.HARI_KERJA === '5';
    while (t <= b && g++ < 400) { const p = tglP(t), w = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); if (w !== 0 && !(lima && w === 6)) n++; t = tglTambah(t, 1); }
    lamaInp.value = n;
  };
  const sisa = async () => {
    const id = sel.value; if (!id) { box.innerHTML = ''; return; }
    const th = (form.querySelector('[name=tanggalMulai]').value || hariIni()).slice(0, 4);
    const x = await api('cuti.sisa', { gtkId: id, tahun: th, kecuali: d ? d.id : '' });
    if (x.success) box.innerHTML = '<div class="note">' + ikon('calendar-days', 'sm') + '<span>Sisa cuti tahunan ' + x.data.tahun + ': <b>' + x.data.sisa + ' hari</b> dari kuota ' + x.data.kuota + ' (terpakai ' + x.data.terpakai + ' hari terverifikasi).</span></div>';
  };
  sel.onchange = sisa; if (sel.value) sisa();
  ['tanggalMulai', 'tanggalSelesai'].forEach(n => form.querySelector('[name=' + n + ']').addEventListener('change', () => { hitung(); sisa(); }));
}
async function simpanForm(el, dr, form, d, up, btn, butuhCatatan, paksa) {
  const k = el._k, m = el._m, baru = !d;
  if (up && up.sibuk()) return toast('Tunggu sampai unggahan berkas selesai.', 'warn');
  const data = {}, errors = {};
  m.fields.filter(f => !f.sistem).forEach(f => {
    if (f.auto) return;
    const v = bacaField(form, f);
    if (v === undefined) return;
    data[f.k] = v;
    if (!(d && d._samar && /•/.test(v))) { const e = validasiField(f, v); if (e) errors[f.k] = e; }
  });
  if (k === 'sm' && data.tanggalSurat && data.tanggalTerima && data.tanggalTerima < data.tanggalSurat) errors.tanggalTerima = 'Tanggal terima tidak boleh sebelum tanggal surat.';
  if (k === 'cuti' && data.tanggalMulai && data.tanggalSelesai && data.tanggalSelesai < data.tanggalMulai) errors.tanggalSelesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  if (data.tanggalLahir && /^\d{4}/.test(data.tanggalLahir) && data.tanggalLahir >= hariIni()) errors.tanggalLahir = 'Tanggal lahir tidak wajar.';
  const manSk = form.querySelector('[data-manual=sk]'), manAg = form.querySelector('[data-manual=agenda]');
  if (manSk && manSk.checked) { data.nomorManual = true; data.nomorSurat = form.querySelector('[name=nomorSurat]').value.trim(); if (!data.nomorSurat) errors.nomorSurat = 'Isi nomor surat manual.'; }
  if (manAg && manAg.checked) { data.nomorAgendaManual = true; data.nomorAgenda = form.querySelector('[name=nomorAgenda]').value.trim(); }
  if (k === 'cuti' && isAdmin()) data.lamaHari = form.querySelector('[name=lamaHari]').value;
  let catatan = '';
  if (butuhCatatan) { catatan = form.querySelector('[name=_catatan]').value.trim(); if (catatan.length < 5) errors._catatan = 'Minimal 5 karakter.'; }
  if (tandaiGalat(form, errors)) return toast('Periksa kembali isian yang ditandai.', 'warn');
  // hanya kirim yang berubah saat mengubah (hindari menimpa nilai tersamar)
  const kirim = baru ? data : Object.keys(data).reduce((o, x) => { if (String(d[x] == null ? '' : d[x]) !== String(data[x]) || x === 'nomorManual' || x === 'nomorAgendaManual') o[x] = data[x]; return o; }, {});
  const berkasIds = up ? up.ids() : [];
  if (!baru && !Object.keys(kirim).length && !berkasIds.length && !(d.status === 'DITOLAK' && !isAdmin())) { toast('Tidak ada perubahan.'); dr.tutup(); return; }
  await sibuk(btn, async () => {
    const r = await api('data.simpan', { modul: k, id: d ? d.id : '', versi: d ? d.versi : '', data: kirim, berkasIds, paksa: !!paksa, catatanUbah: catatan });
    if (!r.success) {
      if (r.code === 409 && r.peringatan) {
        const ok = await konfirmasi({ judul: 'Kemungkinan data ganda', pesan: '<ul class="list-plain">' + r.peringatan.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul><p class="mt12">Tetap simpan?</p>', ok: 'Tetap simpan', ikon: 'triangle-alert' });
        if (ok) return setTimeout(() => simpanForm(el, dr, form, d, up, btn, butuhCatatan, true), 0);
        return;
      }
      if (r.errors) { const e = Object.assign({}, r.errors); if (e._catatan) e._catatan = r.errors._catatan; tandaiGalat(form, e); }
      return galat(r);
    }
    form.dataset.selesai = '1';
    try { sessionStorage.removeItem(LS + 'draf:' + k); } catch (e) { /* abaikan */ }
    toast(r.message, 'ok', baru ? 'Tersimpan' : '');
    invalidasi('list:' + k, 'verif:', 'dash', 'docjenis');
    dr.tutup(true);
    muatDaftar(el, true);
    api('sinyal').then(x => { if (x.success) { S.sinyal = x.data; perbaruiBadge(); } });
    if (el._dr) refreshDetail(el, el._dr, r.data.id);
    else location.hash = '#/m/' + k + '/' + encodeURIComponent(r.data.id);
  });
}

/* ---------------------------------------------------------------------
 * Pusat Verifikasi (Admin) — split-view
 * ------------------------------------------------------------------- */
const CEKLIS_GRUP = { sm: 'surat', sk: 'surat', pm: 'siswa', pk: 'siswa', spmb: 'siswa', gtk: 'gtk', cuti: 'gtk' };
daftarHalaman('verifikasi', {
  auth: 'admin',
  tampil(el, sisa, params, o) {
    if (o.baru) bangunVerif(el);
    const st = el._st;
    if (params.modul !== undefined && params.modul !== st.modul && S.modul[params.modul]) { st.modul = params.modul; st.page = 1; }
    if (params.id) st.target = params.id;
    muatAntrean(el, !o.baru && o.pindah);
  }
});
function bangunVerif(el) {
  el._st = { modul: '', urut: Pref.get('verifUrut', 'lama'), page: 1, per: 10, pilih: new Set(), sel: null, rows: [] };
  el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Verifikasi Data'], pill: '<span class="pill-wait" data-pill hidden><span class="dot pulse" style="background:var(--wait)"></span><span data-pn>0</span> data menunggu</span>', judul: 'Pusat Verifikasi Data & Arsip',
    aksi: '<div class="seg" data-urut><button data-u="lama">Terlama</button><button data-u="baru">Terbaru</button></div><button class="btn btn-teal" data-massal disabled>' + ikon('check-check') + 'Setujui Terpilih (<span data-mn>0</span>)</button>' }) +
    '<div class="flex wrap gap12 mb16 between"><div class="seg or" data-tabm></div><span class="small muted flex gap8">' + ikon('shield-check', 'sm teal-t') + 'Mode otoritas Admin Operator · pintasan <span class="kbd">J</span>/<span class="kbd">K</span> pindah data</span></div>' +
    '<div class="split" data-split><div class="viewer" data-viewer><div class="vw-body">' + kosongHtml('file-search', 'Memuat antrean…', '') + '</div></div><div class="card" data-panel><div class="sk sk-line"></div><div class="sk sk-blk mt16"></div></div></div>' +
    '<div class="card p0 mt24"><div class="card-h" style="padding:18px 20px 4px"><div class="ttl">Antrean Data Berikutnya</div><span class="xs muted b" data-info></span></div><div data-tabel>' + skeletonTabel(4) + '</div><div class="tbl-foot" data-foot hidden></div></div>';
  const st = el._st;
  $$('[data-urut] button', el).forEach(b => { b.classList.toggle('on', b.dataset.u === st.urut); b.onclick = () => { st.urut = b.dataset.u; Pref.set('verifUrut', st.urut); $$('[data-urut] button', el).forEach(x => x.classList.toggle('on', x === b)); st.page = 1; muatAntrean(el); }; });
  $('[data-massal]', el).onclick = e => verifMassal(el, e.currentTarget);
  document.addEventListener('keydown', e => {
    if (el.hidden || _lapisan.length || /input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'j' || e.key === 'k') { const i = st.rows.findIndex(r => r.id === (st.sel && st.sel.id)); const n = st.rows[i + (e.key === 'j' ? 1 : -1)]; if (n) pilihItem(el, n); }
  });
}
function kunciVerif(st) { return 'verif:' + JSON.stringify({ page: st.page, per: st.per, urut: st.urut, modul: st.modul }); }
function muatAntrean(el, paksa) {
  const st = el._st;
  return swr(kunciVerif(st), 'verif.antrean', { modul: st.modul, urut: st.urut, page: st.page, per: st.per }, d => gambarAntrean(el, d), { fresh: 15000, force: paksa, onError: r => { $('[data-tabel]', el).innerHTML = galatHtml(r); pasangUlang(el, () => muatAntrean(el, true)); } });
}
function gambarAntrean(el, d) {
  const st = el._st;
  st.rows = d.rows; st.ceklis = d.ceklis;
  S.sinyal.menunggu = d.hitung.total; perbaruiBadge();
  $('[data-pill]', el).hidden = !d.hitung.total; $('[data-pn]', el).textContent = d.hitung.total;
  $('[data-tabm]', el).innerHTML = '<button data-m=""' + (!st.modul ? ' class="on"' : '') + '>Semua <span class="n">' + d.hitung.total + '</span></button>' + Object.keys(S.modul).map(k => '<button data-m="' + k + '"' + (st.modul === k ? ' class="on"' : '') + '>' + esc(S.modul[k].label) + ' <span class="n">' + (d.hitung.per[k] || 0) + '</span></button>').join('');
  $$('[data-tabm] button', el).forEach(b => b.onclick = () => { st.modul = b.dataset.m; st.page = 1; st.pilih.clear(); setQuery({ modul: st.modul }); muatAntrean(el); });
  $('[data-info]', el).textContent = d.total ? 'Menampilkan ' + d.rows.length + ' dari ' + d.total : '';
  const tabel = $('[data-tabel]', el), foot = $('[data-foot]', el);
  if (!d.rows.length) {
    tabel.innerHTML = kosongHtml('check-check', 'Antrean bersih', 'Tidak ada data yang menunggu verifikasi' + (st.modul ? ' di modul ini' : '') + '.');
    foot.hidden = true; st.sel = null;
    $('[data-viewer]', el).innerHTML = '<div class="vw-body">' + kosongHtml('sparkles', 'Semua data sudah diverifikasi', 'Data baru dari staf akan muncul otomatis.') + '</div>';
    $('[data-panel]', el).innerHTML = '<div class="ttl">Tidak ada data dipilih</div><p class="small muted mt8">Antrean verifikasi kosong.</p>';
    perbaruiMassal(el); return;
  }
  tabel.innerHTML = '<div class="tbl-wrap tbl-resp"><table class="tbl"><thead><tr><th class="cb"><input type="checkbox" data-all aria-label="Pilih semua"></th><th>Tipe & modul</th><th>Nomor / identitas</th><th>Asal / keterangan</th><th>Staf penginput</th><th>Waktu masuk</th><th>Status</th><th></th></tr></thead><tbody>' +
    d.rows.map(r => '<tr class="klik" data-id="' + esc(r.id) + '"><td class="cb"><input type="checkbox" data-cb="' + esc(r.id) + '"' + (st.pilih.has(r.modul + '|' + r.id) ? ' checked' : '') + ' aria-label="Pilih"></td><td><span class="chip chip-teal">' + esc(r.label) + '</span></td><td><div class="mono b">' + esc(r.judul) + '</div><div class="sub">' + esc(r.id) + '</div></td><td class="wrap-t">' + esc(r.sub || r.ringkas || '–') + '</td><td>' + esc(r.pencatat) + '</td><td class="nowrap">' + esc(relatif(r.waktuInput)) + '</td><td>' + (r.revisiKe ? '<span class="chip chip-or">Revisi ke-' + r.revisiKe + '</span>' : '<span class="chip chip-wait">Menunggu</span>') + '</td><td>' + (r.jumlahBerkas ? ikon('paperclip', 'sm muted') : '') + '</td></tr>').join('') +
    '</tbody></table><div class="mlist">' + d.rows.map(r => '<div class="mitem" data-id="' + esc(r.id) + '"><input type="checkbox" data-cb="' + esc(r.id) + '"' + (st.pilih.has(r.modul + '|' + r.id) ? ' checked' : '') + ' aria-label="Pilih" style="margin-top:4px"><div class="grow"><div class="mt mono">' + esc(r.judul) + '</div><div class="ms">' + esc(r.label) + ' · ' + esc(r.pencatat) + '</div><div class="mm">' + (r.revisiKe ? '<span class="chip chip-or">Revisi ' + r.revisiKe + '</span>' : '') + '<span>' + esc(relatif(r.waktuInput)) + '</span></div></div></div>').join('') + '</div></div>';
  $$('[data-id]', tabel).forEach(tr => tr.onclick = e => { if (e.target.matches('input')) return; pilihItem(el, st.rows.find(x => x.id === tr.dataset.id)); if (innerWidth < 1100) $('[data-split]', el).scrollIntoView({ behavior: 'smooth' }); });
  $$('[data-cb]', tabel).forEach(c => c.onchange = () => { const r = st.rows.find(x => x.id === c.dataset.cb); const kk = r.modul + '|' + r.id; c.checked ? st.pilih.add(kk) : st.pilih.delete(kk); perbaruiMassal(el); });
  const all = $('[data-all]', tabel);
  if (all) all.onchange = () => { st.rows.forEach(r => { const kk = r.modul + '|' + r.id; all.checked ? st.pilih.add(kk) : st.pilih.delete(kk); }); $$('[data-cb]', tabel).forEach(c => { c.checked = all.checked; }); perbaruiMassal(el); };
  foot.hidden = false; foot.innerHTML = pagerHtml(d.total, d.page, d.per);
  $$('[data-pg]', foot).forEach(b => b.onclick = () => { st.page = +b.dataset.pg; muatAntrean(el); });
  perbaruiMassal(el);
  // pilih target dari URL, atau pertahankan pilihan, atau ambil pertama
  let t = st.target ? st.rows.find(r => r.id === st.target) : null;
  if (st.target && !t) { t = { id: st.target, modul: urai(location.hash).params.modul || st.modul, label: '', judul: st.target }; }
  st.target = null;
  if (!t && st.sel) t = st.rows.find(r => r.id === st.sel.id);
  if (!t) t = st.rows[0];
  if (t && (!st.sel || st.sel.id !== t.id || !el._detail)) pilihItem(el, t);
  else tandaiBaris(el);
}
function perbaruiMassal(el) { const n = el._st.pilih.size; $('[data-mn]', el).textContent = n; $('[data-massal]', el).disabled = !n; }
function tandaiBaris(el) { const id = el._st.sel && el._st.sel.id; $$('[data-tabel] tr[data-id]', el).forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id)); }
async function pilihItem(el, item) {
  const st = el._st;
  if (!item || !item.modul) return;
  st.sel = item; tandaiBaris(el);
  const panel = $('[data-panel]', el), viewer = $('[data-viewer]', el);
  panel.innerHTML = '<div class="sk sk-line" style="width:50%"></div><div class="sk sk-blk mt16"></div><div class="sk sk-line mt16"></div>';
  const tiket = Symbol(); el._tiket = tiket;
  const r = await api('data.get', { modul: item.modul, id: item.id });
  if (el._tiket !== tiket) return;
  if (!r.success) { panel.innerHTML = galatHtml(r); pasangUlang(panel, () => pilihItem(el, item)); return; }
  const d = r.data, m = S.modul[item.modul];
  el._detail = d;
  // Penampil berkas
  if (!m.berkas || !d.berkas.length) {
    viewer.innerHTML = '<div class="vw-h"><span class="vw-tools" style="padding:6px 10px">' + ikon(ikonModul(item.modul), 'sm') + '</span><div class="grow"><div class="fn">' + esc(m.label) + ' · ' + esc(d.id) + '</div><div class="xs muted">' + (m.berkas ? 'Tanpa lampiran berkas' : 'Modul ini tidak memakai berkas') + '</div></div></div><div class="vw-body"><div class="card" style="max-width:520px;width:100%"><div class="ttl mb12">Ringkasan data</div><dl class="kv">' + m.fields.filter(f => !f.sistem && d[f.k]).map(f => '<dt>' + esc(f.l) + '</dt><dd>' + selNilai(f, d[f.k]) + '</dd>').join('') + '</dl>' + (m.berkas ? '<div class="note warn mt16">' + ikon('triangle-alert', 'sm') + '<span>Staf belum melampirkan berkas. Pertimbangkan menolak dengan kategori "Berkas".</span></div>' : '') + '</div></div>';
  } else {
    viewer.innerHTML = '<div class="vw-h"><span class="file-ic" style="width:30px;height:30px">' + ikon('file-text', 'sm') + '</span><div class="grow" style="min-width:160px"><div class="fn ellipsis" data-fn></div><div class="xs muted" data-fm></div></div><div class="vw-tools"><button class="icon-btn" data-zo aria-label="Perkecil">' + ikon('zoom-out', 'sm') + '</button><span data-zp>100%</span><button class="icon-btn" data-zi aria-label="Perbesar">' + ikon('zoom-in', 'sm') + '</button><button class="icon-btn" data-rt aria-label="Putar">' + ikon('rotate-cw', 'sm') + '</button><button class="icon-btn" data-ob aria-label="Buka di tab baru">' + ikon('external-link', 'sm') + '</button></div></div>' +
      (d.berkas.length > 1 ? '<div class="vw-ftab">' + d.berkas.map((b, i) => '<button data-fi="' + i + '"' + (i ? '' : ' class="on"') + '>' + esc((i + 1) + '. ' + b.nama) + '</button>').join('') + '</div>' : '') +
      '<div class="vw-body"></div><div class="vw-f"><span class="flex gap8">' + ikon('lock', 'sm ok-t') + '<span data-hash></span></span><span class="flex gap8"><span data-hal></span><span class="chip chip-teal">Drive privat</span></span></div>';
    const tampil = i => {
      const b = d.berkas[i];
      $('[data-fn]', viewer).textContent = b.nama;
      $('[data-fm]', viewer).textContent = bytes(b.ukuran) + ' · diunggah ' + b.oleh + ' · ' + relatif(b.waktu);
      $('[data-hash]', viewer).textContent = 'Integritas SHA-256: ' + (b.hash ? b.hash.slice(0, 16) + '…' : '–');
      $('[data-hal]', viewer).textContent = 'Berkas ' + (i + 1) + ' dari ' + d.berkas.length;
      $$('[data-fi]', viewer).forEach(x => x.classList.toggle('on', +x.dataset.fi === i));
      tampilkanBerkas($('.vw-body', viewer), b, { zoomIn: $('[data-zi]', viewer), zoomOut: $('[data-zo]', viewer), putar: $('[data-rt]', viewer), buka: $('[data-ob]', viewer), persen: $('[data-zp]', viewer) });
    };
    $$('[data-fi]', viewer).forEach(x => x.onclick = () => tampil(+x.dataset.fi));
    tampil(0);
    // pra-muat berkas data berikutnya
    const i = st.rows.findIndex(x => x.id === d.id), nx = st.rows[i + 1];
    if (nx && nx.jumlahBerkas) setTimeout(() => api('data.get', { modul: nx.modul, id: nx.id }).then(x => { if (x.success && x.data.berkas[0]) ambilBerkas(x.data.berkas[0].id).catch(() => {}); }), 1500);
  }
  // Panel kanan
  const grup = CEKLIS_GRUP[item.modul], ceklis = (st.ceklis && st.ceklis[grup]) || [];
  const tolak = (d.riwayat || []).slice().reverse().find(x => x.a === 'TOLAK');
  const panjang = m.fields.filter(f => f.t === 'textarea' && d[f.k]);
  panel.innerHTML = '<div class="card-h"><div class="ttl">Detail Data yang Diinputkan</div>' + chipStatus(d.status) + '</div>' +
    (Number(d.revisiKe) && tolak ? '<div class="note or mb12">' + ikon('history', 'sm') + '<span><b>Revisi ke-' + d.revisiKe + '.</b> Penolakan sebelumnya: ' + esc(tolak.c) + '</span></div>' : '') +
    '<div class="kv-box"><div class="kv-row"><span class="k">Kategori modul</span><span class="v"><span class="chip chip-teal">' + ikon(ikonModul(item.modul), 'sm') + esc(m.label) + '</span></span></div>' +
    '<div class="kv-row"><span class="k">Pencatat (staf TU)<br>Waktu input</span><span class="v">' + esc(d.pencatat) + '<div class="xs muted">' + esc(fmtWaktu(d.waktuInput)) + ' WITA</div></span></div>' +
    m.fields.filter(f => !f.sistem && f.t !== 'textarea' && d[f.k]).map(f => '<div class="kv-row"><span class="k">' + esc(f.l) + '</span><span class="v' + (f.mono ? ' mono' : '') + '">' + esc(fmtNilai(f, d[f.k])) + '</span></div>').join('') + '</div>' +
    panjang.map(f => '<div class="lbl mt12 mb8">' + esc(f.l) + '</div><div class="small t2" style="background:var(--canvas);border:1px solid var(--border);border-radius:10px;padding:10px 12px;white-space:pre-line">' + esc(d[f.k]) + '</div>').join('') +
    (ceklis.length ? '<div class="lbl mt16 mb8">Ceklis kesesuaian fisik & input</div><div class="grid g2" style="gap:8px">' + ceklis.map((c, i) => '<label class="ck-box"><input type="checkbox" data-ck value="' + esc(c) + '"> ' + esc(c) + '</label>').join('') + '</div>' : '') +
    '<div class="flex between mt16 mb8"><span class="lbl">Catatan operator (opsional · masuk riwayat)</span><span class="xs muted" data-cnt>0/200</span></div><textarea class="inp" data-cat rows="2" maxlength="200" placeholder="Tuliskan catatan verifikasi atau disposisi lanjutan…"></textarea>' +
    '<div class="act-big mt16 verif-act-m"><button class="btn btn-primary" data-setuju>' + ikon('shield-check') + 'SETUJUI & RESMIKAN ARSIP</button><button class="btn btn-danger-soft" data-tolak>' + ikon('x') + 'TOLAK BERKAS</button></div>' +
    '<div class="note mt12">' + ikon('info', 'sm') + '<span>Persetujuan mengunci data sebagai arsip resmi, memindahkan berkas ke folder arsip ' + esc((d[m.tglKey] || hariIni()).slice(0, 4)) + ' di Drive, dan mencatatnya di Audit Log.</span></div>' +
    '<div class="flex between mt12"><a class="small b" href="#/m/' + item.modul + '/' + encodeURIComponent(d.id) + '">Buka detail lengkap →</a>' + (isAdmin() ? '<a class="small" href="#/m/' + item.modul + '/' + encodeURIComponent(d.id) + '?edit=1">' + ikon('pencil', 'sm') + ' Koreksi data</a>' : '') + '</div>';
  const cat = $('[data-cat]', panel);
  cat.oninput = () => { $('[data-cnt]', panel).textContent = cat.value.length + '/200'; };
  $('[data-setuju]', panel).onclick = e => sibuk(e.currentTarget, async () => {
    const ck = $$('[data-ck]:checked', panel).map(c => c.value);
    if (ceklis.length && ck.length < ceklis.length) {
      const ok = await konfirmasi({ judul: 'Ceklis belum lengkap', pesan: 'Baru ' + ck.length + ' dari ' + ceklis.length + ' poin ceklis yang ditandai. Tetap setujui?', ok: 'Tetap setujui' });
      if (!ok) return;
    }
    const r = await api('verif.setujui', { modul: item.modul, id: d.id, versi: d.versi, catatan: cat.value.trim(), ceklis: ck });
    if (!r.success) { galat(r); if (r.konflik) muatAntrean(el, true); return; }
    toast('Data ' + d.id + ' terverifikasi dan diresmikan.');
    selesaiVerif(el, d, r.data.sinyal);
  });
  $('[data-tolak]', panel).onclick = () => tolakData(item.modul, d.id, d.versi, () => selesaiVerif(el, d));
}
function selesaiVerif(el, d, sinyal) {
  const st = el._st;
  if (sinyal) { S.sinyal = sinyal; perbaruiBadge(); }
  const i = st.rows.findIndex(x => x.id === d.id);
  st.pilih.delete(d.modul + '|' + d.id);
  st.rows.splice(i, 1);
  const nx = st.rows[i] || st.rows[i - 1];
  st.sel = nx || null; el._detail = null;
  invalidasi('list:' + d.modul, 'verif:', 'dash');
  if (nx) pilihItem(el, nx);
  muatAntrean(el, true);
}
async function verifMassal(el, btn) {
  const st = el._st;
  const items = Array.from(st.pilih).map(x => { const [modul, id] = x.split('|'); const r = st.rows.find(y => y.id === id); return { modul, id, versi: r ? r.versi : '' }; });
  if (!items.length) return;
  const o = await konfirmasi({ judul: 'Setujui ' + items.length + ' data sekaligus?', pesan: 'Gunakan hanya bila semua berkas & isian sudah Anda periksa. Data akan langsung menjadi arsip resmi.', ok: 'Setujui ' + items.length + ' data' });
  if (!o) return;
  await sibuk(btn, async () => {
    const r = await api('verif.massal', { items, catatan: 'Disetujui massal' });
    if (!r.success) return galat(r);
    toast(r.message, r.data.gagal.length ? 'warn' : 'ok');
    S.sinyal = r.data.sinyal; perbaruiBadge();
    st.pilih.clear(); st.sel = null; el._detail = null;
    Object.keys(S.modul).forEach(k => invalidasi('list:' + k)); invalidasi('verif:', 'dash');
    muatAntrean(el, true);
  });
}

/* ---------------------------------------------------------------------
 * Sampah (Admin)
 * ------------------------------------------------------------------- */
daftarHalaman('sampah', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Sampah'], judul: 'Sampah Data', sub: 'Data yang dihapus bisa dipulihkan. Hapus permanen membuat backup lebih dulu dan tidak dapat dibatalkan.' }) + '<div class="card p0" data-isi>' + skeletonTabel(5) + '</div>';
    muatSampah(el);
  }
});
async function muatSampah(el) {
  const box = $('[data-isi]', el);
  const r = await api('data.sampah');
  if (!r.success) { box.innerHTML = galatHtml(r); pasangUlang(box, () => muatSampah(el)); return; }
  if (!r.data.length) { box.innerHTML = kosongHtml('trash-2', 'Sampah kosong', 'Tidak ada data yang dihapus.'); return; }
  box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Modul</th><th>Dihapus</th><th>Alasan</th><th class="right">Aksi</th></tr></thead><tbody>' + r.data.map(x => '<tr><td><b>' + esc(x.judul) + '</b><div class="sub mono">' + esc(x.id) + (x.sub ? ' · ' + esc(x.sub) : '') + '</div></td><td>' + esc(x.label) + '</td><td class="nowrap">' + esc(fmtWaktu(x.dihapusPada)) + '<div class="sub">' + esc(x.oleh) + '</div></td><td class="wrap-t">' + esc(x.alasan) + '</td><td class="right nowrap"><button class="btn btn-sm" data-p="' + esc(x.modul + '|' + x.id) + '">' + ikon('undo-2', 'sm') + 'Pulihkan</button> <button class="btn btn-sm btn-danger-soft" data-h="' + esc(x.modul + '|' + x.id) + '">' + ikon('trash-2', 'sm') + 'Hapus permanen</button></td></tr>').join('') + '</tbody></table></div>';
  $$('[data-p]', box).forEach(b => b.onclick = () => sibuk(b, async () => { const [modul, id] = b.dataset.p.split('|'); const x = await api('data.pulihkan', { modul, id }); if (!x.success) return galat(x); toast(x.message); invalidasi('list:' + modul, 'dash'); muatSampah(el); }));
  $$('[data-h]', box).forEach(b => b.onclick = async () => {
    const [modul, id] = b.dataset.h.split('|');
    const o = await konfirmasi({ judul: 'Hapus permanen ' + id + '?', pesan: 'Data dan seluruh berkasnya dihapus permanen. Salinan backup spreadsheet dibuat otomatis sebelum penghapusan.', ok: 'Hapus permanen', bahaya: true, ketik: 'HAPUS' });
    if (!o) return;
    await sibuk(b, async () => { const x = await api('data.hapusPermanen', { modul, id, konfirmasi: 'HAPUS' }); if (!x.success) return galat(x); toast(x.message); muatSampah(el); });
  });
}
