/* =====================================================================
   SIM TATA USAHA — pages-doc.js
   Mesin dokumen: pilih jenis → isi formulir dari placeholder → pratinjau
   → terbit (nomor otomatis + QR verifikasi + PDF/DOCX/XLSX), riwayat
   dokumen, dan pengelolaan Admin: template, penanda tangan, penomoran.
   ===================================================================== */
'use strict';
const IKON_TPL = { SURAT_DINAS: 'mail-plus', DISPOSISI: 'send-to-back', SK_PINDAH: 'user-minus', SK_TERIMA_PINDAH: 'user-plus', AGENDA_MASUK: 'clipboard-list', AGENDA_KELUAR: 'list-ordered' };
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function ambilJenis(paksa) {
  return new Promise(res => { let selesai = false; swr('docjenis', 'doc.jenis', {}, d => { if (!selesai) { selesai = true; res(d); } }, { fresh: 120000, force: paksa, onError: () => res([]) }).then(r => { if (!selesai) { selesai = true; res(r.success ? r.data : []); } }); });
}

/* ---------------------------------------------------------------------
 * Pilih jenis dokumen
 * ------------------------------------------------------------------- */
daftarHalaman('dokumen', {
  boleh: () => bolehDokumen(),
  tampil(el, s, p, o) {
    if (o.baru) el.innerHTML = headHalaman({ crumbs: ['Dokumen', 'Buat Dokumen'], judul: 'Buat Dokumen Resmi', sub: 'Surat terbit langsung dengan nomor dari register, QR verifikasi keaslian, dan arsip PDF di Drive. Tanda tangan basah/spesimen.', aksi: '<a class="btn" href="#/dokumen/riwayat">' + ikon('history') + 'Riwayat Dokumen</a>' + (isAdmin() ? '<a class="btn" href="#/dokumen/template">' + ikon('layers') + 'Kelola Template</a>' : '') }) + '<div class="grid g3" data-isi>' + Array(6).fill('<div class="card sk" style="height:180px"></div>').join('') + '</div>';
    swr('docjenis', 'doc.jenis', {}, d => gambarJenis(el, d), { fresh: 120000, onError: r => { $('[data-isi]', el).innerHTML = galatHtml(r); pasangUlang(el, () => location.reload()); } });
  }
});
function gambarJenis(el, rows) {
  const box = $('[data-isi]', el);
  if (!rows.length) { box.outerHTML = '<div class="card" data-isi>' + kosongHtml('file-x', 'Belum ada template yang bisa Anda pakai', isAdmin() ? 'Jalankan setupAppEnvironment() atau tambah template di menu Template.' : 'Minta Admin memberi izin modul terkait.') + '</div>'; return; }
  box.innerHTML = rows.map(t => '<a class="card hov tpl-card" href="#/dokumen/buat/' + encodeURIComponent(t.id) + '" style="text-decoration:none;color:inherit"><div class="flex between"><div class="tpl-ic ' + (t.engine === 'sheets' ? 'teal' : '') + '">' + ikon(IKON_TPL[t.kode] || (t.engine === 'sheets' ? 'file-spreadsheet' : 'file-text')) + '</div><div class="flex gap4 wrap end">' + (t.nomorKode ? '<span class="chip chip-or">Bernomor</span>' : '') + (t.periode ? '<span class="chip chip-teal">Per periode</span>' : '') + '</div></div>' +
    '<div><div class="b" style="font-size:15px">' + esc(t.nama) + '</div><div class="small t2 mt4">' + esc(t.ket || (t.modul ? 'Dari data ' + (S.modul[t.modul] || {}).label : 'Dokumen umum')) + '</div></div>' +
    '<div class="flex between mt8"><span class="flex gap4">' + t.keluaran.split(',').map(f => '<span class="tag">' + esc(f.toUpperCase()) + '</span>').join('') + '</span><span class="btn btn-sm btn-primary">Buat ' + ikon('chevron-right', 'sm') + '</span></div></a>').join('');
}

/* ---------------------------------------------------------------------
 * Formulir dokumen
 * ------------------------------------------------------------------- */
daftarHalaman('dokumen/buat', {
  kunci: s => 'dokumen/buat/' + s[0],
  boleh: () => bolehDokumen(),
  tampil(el, sisa, params, o) {
    const tid = sisa[0];
    if (o.baru || el._data !== (params.data || '')) { el._data = params.data || ''; bangunFormDok(el, tid, params.data || ''); }
  }
});
async function bangunFormDok(el, tid, dataId) {
  el.innerHTML = headHalaman({ crumbs: ['Dokumen', '<a href="#/dokumen">Buat Dokumen</a>', 'Isian'], judul: 'Memuat template…' }) + '<div class="grid g-12"><div class="card s8"><div class="sk sk-line"></div><div class="sk sk-blk mt16"></div><div class="sk sk-blk mt16"></div></div><div class="card s4 sk" style="height:260px"></div></div>';
  const tanggal = hariIni();
  const r = await api('doc.skema', { templateId: tid, dataId, tanggal });
  if (!r.success) { el.innerHTML = headHalaman({ crumbs: ['Dokumen', 'Buat Dokumen'], judul: 'Template tidak bisa dibuka' }) + '<div class="card">' + galatHtml(r) + '</div>'; pasangUlang(el, () => bangunFormDok(el, tid, dataId)); return; }
  const s = r.data, t = s.template;
  const drafKey = LS + 'dokdraf:' + tid + ':' + dataId;
  let draf = {}; try { draf = JSON.parse(sessionStorage.getItem(drafKey) || '{}') || {}; } catch (e) { draf = {}; }
  const nilai = Object.assign({}, s.nilai, draf.isian || {});
  const butuhSumber = t.modul && !t.periode;
  el.innerHTML = headHalaman({ crumbs: ['Dokumen', '<a href="#/dokumen">Buat Dokumen</a>', esc(t.nama)], judul: t.nama, sub: esc(t.ket || ''), aksi: '<a class="btn" href="#/dokumen">' + ikon('chevron-left') + 'Pilih jenis lain</a>' }) +
    '<div class="grid g-12" style="align-items:start"><div class="s8 flex-col gap16" style="display:flex">' +
    (butuhSumber ? '<div class="card" data-sumber><div class="card-h"><div class="ttl">Sumber data ' + esc((S.modul[t.modul] || {}).label || '') + '</div></div>' +
      (s.sumber ? '<div class="q-item"><div class="mi teal">' + ikon(ikonModul(t.modul)) + '</div><div class="grow"><div class="qt">' + esc(s.sumber.judul) + '</div><div class="qs mono">' + esc(s.sumber.id) + (s.sumber.sub ? ' · ' + esc(s.sumber.sub) : '') + '</div></div>' + chipStatus(s.sumber.status, true) + '<button class="btn btn-sm" data-ganti>Ganti</button></div>' + (s.sumber.status === 'MENUNGGU' ? '<div class="note warn mt12">' + ikon('triangle-alert', 'sm') + '<span>Data sumber belum terverifikasi. Pastikan isinya benar sebelum menerbitkan.</span></div>' : '')
        : '<div class="small t2 mb8">Pilih data yang menjadi dasar dokumen ini.</div><label class="inp-ic">' + ikon('search', 'sm') + '<input class="inp" data-cari placeholder="Ketik nama / nomor…"></label><div data-hasil class="mt8"></div>') + '</div>' : '') +
    '<div class="card"><div class="card-h"><div class="ttl">Isian dokumen</div><span class="xs muted">Kolom <span class="no-t">*</span> wajib</span></div><form class="form-grid" data-form novalidate>' +
    '<div class="field"><label>Tanggal dokumen</label><input type="date" name="__tanggal" value="' + esc(draf.tanggal || tanggal) + '"></div><div></div>' +
    s.bidang.map(b => bidangDokHtml(b, nilai[b.kunci], s.dariData.indexOf(b.kunci) >= 0)).join('') + '</form></div>' +
    '<div class="card"><div class="card-h"><div class="ttl">Penanda tangan</div></div>' + (s.slot.length ? s.slot.map(sl => '<div class="field mb12"><label>' + esc(sl.label) + ' <span class="xs muted">· ' + (sl.tanda === 'spesimen' ? 'spesimen TTD tercetak' : 'ruang TTD basah') + '</span></label><select data-slot="' + sl.slot + '"><option value="">— Pilih penanda tangan —</option>' + s.pejabat.map(p => '<option value="' + esc(p.id) + '"' + (sl.pejabat && sl.pejabat.id === p.id ? ' selected' : '') + '>' + esc(p.nama + (p.gelar ? ', ' + p.gelar : '') + ' — ' + p.jabatan) + '</option>').join('') + '</select></div>').join('') : '<div class="small muted">Template ini tidak memakai penanda tangan.</div>') + '</div></div>' +
    '<div class="s4" style="position:sticky;top:calc(var(--top-h) + 16px)"><div class="card"><div class="card-h"><div class="ttl">Ringkasan terbit</div></div>' +
    (t.nomorKode ? '<div class="lbl">Nomor dokumen (perkiraan)</div><div class="nomor-big mt4" data-nomor>' + esc(s.nomor) + '</div><div class="hint mt4">Nomor final diambil dari register saat Terbitkan — tidak pernah dipakai ganda.</div>' : '<div class="note">' + ikon('info', 'sm') + '<span>Dokumen ini tidak memakai nomor surat.</span></div>') +
    '<div class="flex wrap gap4 mt12">' + t.keluaran.split(',').map(f => '<span class="tag">' + ikon(f === 'pdf' ? 'file-down' : f === 'xlsx' ? 'file-spreadsheet' : 'file-text', 'sm') + f.toUpperCase() + '</span>').join('') + '<span class="tag">' + ikon('qr-code', 'sm') + 'QR verifikasi</span>' + (t.catatSK ? '<span class="tag">' + ikon('send', 'sm') + 'Tercatat di Surat Keluar</span>' : '') + '</div>' +
    (s.peringatan.length ? '<div class="note warn mt16" style="flex-direction:column;gap:6px">' + s.peringatan.map(p => '<div class="flex gap8" style="align-items:flex-start">' + ikon('triangle-alert', 'sm') + '<span>' + esc(p) + '</span></div>').join('') + '</div>' : '') +
    '<div class="flex-col gap8 mt16" style="display:flex"><button class="btn w100" data-pra>' + ikon('eye') + 'Pratinjau PDF</button><button class="btn btn-primary btn-lg w100" data-terbit>' + ikon('stamp') + 'Terbitkan Dokumen</button></div>' +
    '<div class="xs muted mt12">Draf isian tersimpan otomatis di tab ini.</div></div></div></div>';
  const form = $('[data-form]', el);
  siapkanRte(form);
  siapkanDaftar(form);
  const simpanDraf = debounce(() => { try { sessionStorage.setItem(drafKey, JSON.stringify({ isian: bacaIsianDok(form, s.bidang), tanggal: form.querySelector('[name=__tanggal]').value })); } catch (e) { /* abaikan */ } }, 600);
  form.addEventListener('input', simpanDraf);
  // pratinjau nomor saat klasifikasi/tanggal berubah
  const nb = $('[data-nomor]', el);
  const prNomor = debounce(async () => {
    if (!nb) return;
    const kl = (form.querySelector('[name=KLASIFIKASI]') || {}).value || t.klasifikasi;
    const x = await api('nomor.pratinjau', { kode: t.nomorKode, klasifikasi: kl, tanggal: form.querySelector('[name=__tanggal]').value });
    if (x.success) nb.textContent = x.data.nomor;
  }, 300);
  form.addEventListener('change', e => { if (e.target.name === 'KLASIFIKASI' || e.target.name === '__tanggal') prNomor(); });
  // sumber data
  const gt = $('[data-ganti]', el); if (gt) gt.onclick = () => { setQuery({}); el._data = ''; bangunFormDok(el, tid, ''); };
  const cari = $('[data-cari]', el);
  if (cari) {
    const tampil = async () => {
      const q = cari.value.trim();
      const x = await api('data.list', { modul: t.modul, q, per: 8 });
      const hb = $('[data-hasil]', el);
      if (!x.success) { hb.innerHTML = '<div class="small no-t">' + esc(x.message) + '</div>'; return; }
      const m = S.modul[t.modul];
      const rows = x.data.rows.filter(rr => rr.status !== 'DITOLAK');
      hb.innerHTML = rows.length ? rows.map(rr => '<div class="q-item klik" style="cursor:pointer" data-pilih="' + esc(rr.id) + '"><div class="grow"><div class="qt">' + esc(rr[m.judul]) + '</div><div class="qs">' + esc(rr.id) + ' · ' + esc(rr[m.sub] || '') + '</div></div>' + chipStatus(rr.status, true) + '</div>').join('') : '<div class="small muted">Tidak ada data yang cocok.</div>';
      $$('[data-pilih]', hb).forEach(b => b.onclick = () => { setQuery({ data: b.dataset.pilih }); el._data = b.dataset.pilih; bangunFormDok(el, tid, b.dataset.pilih); });
    };
    cari.addEventListener('input', debounce(tampil, 350)); tampil();
  }
  const kumpul = () => {
    const isian = bacaIsianDok(form, s.bidang), errors = {};
    s.bidang.forEach(b => {
      const v = isian[b.kunci];
      if (b.tipe === 'daftar') { if (b.wajib && !(v || []).length) errors[b.kunci] = 'Minimal satu baris.'; return; }
      if (b.wajib && !String(v || '').replace(/<[^>]*>/g, '').trim()) errors[b.kunci] = b.label + ' wajib diisi.';
      if (b.tipe === 'tanggal' && v && !V.tgl(v)) errors[b.kunci] = 'Tanggal tidak valid.';
    });
    const pejabat = {}; $$('[data-slot]', el).forEach(sl => { if (sl.value) pejabat[sl.dataset.slot] = sl.value; });
    return { isian, errors, pejabat, tanggal: form.querySelector('[name=__tanggal]').value };
  };
  $('[data-pra]', el).onclick = e => sibuk(e.currentTarget, async () => {
    if (butuhSumber && !dataId) return toast('Pilih sumber data terlebih dahulu.', 'warn');
    const k = kumpul();
    const x = await api('doc.pratinjau', { templateId: tid, dataId, isian: k.isian, pejabat: k.pejabat, tanggal: k.tanggal }, { timeout: 120000 });
    if (!x.success) { if (x.errors) tandaiGalat(form, x.errors); return galat(x); }
    pratinjauPdf(x.data);
  });
  $('[data-terbit]', el).onclick = async e => {
    if (butuhSumber && !dataId) return toast('Pilih sumber data terlebih dahulu.', 'warn');
    const k = kumpul();
    if (tandaiGalat(form, k.errors)) return toast('Periksa isian yang ditandai.', 'warn');
    if (s.slot.length && $$('[data-slot]', el).some(x => !x.value)) return toast('Pilih penanda tangan untuk setiap slot.', 'warn');
    const ok = await konfirmasi({ judul: 'Terbitkan dokumen?', ikon: 'stamp', pesan: 'Dokumen <b>' + esc(t.nama) + '</b> akan diterbitkan' + (t.nomorKode ? ' dengan nomor berikutnya dari register' : '') + ', diberi QR verifikasi, dan diarsipkan.' + (t.catatSK ? ' Dokumen otomatis tercatat di <b>Surat Keluar</b>' + (isAdmin() && S.setting.ADMIN_AUTO_VERIF === 'YA' ? ' sebagai terverifikasi.' : ' dan menunggu verifikasi Admin.') : ''), ok: 'Terbitkan' });
    if (!ok) return;
    await sibuk(e.currentTarget, async () => {
      const x = await api('doc.terbit', { templateId: tid, dataId, isian: k.isian, pejabat: k.pejabat, tanggal: k.tanggal }, { timeout: 180000 });
      if (!x.success) { if (x.errors) tandaiGalat(form, x.errors); return galat(x, 'Dokumen gagal terbit'); }
      try { sessionStorage.removeItem(drafKey); } catch (er) { /* abaikan */ }
      invalidasi('doclist', 'list:sk', 'list:' + t.modul, 'dash', 'verif:');
      hasilTerbit(x.data, x.message);
    });
  };
}
function bidangDokHtml(b, v, dariData) {
  const id = 'd_' + b.kunci;
  const lab = '<label for="' + id + '">' + esc(b.label) + (b.wajib ? '<span class="req">*</span>' : '') + (dariData ? ' <span class="chip chip-teal" style="padding:1px 6px">dari data</span>' : '') + '</label>';
  const tail = (b.bantu ? '<div class="hint">' + esc(b.bantu) + '</div>' : '') + '<div class="ferr" hidden></div>';
  v = v == null ? '' : v;
  if (b.tipe === 'naskah') return '<div class="field full" data-f="' + b.kunci + '">' + lab + '<div class="rte"><div class="rte-bar"><button type="button" data-c="bold" title="Tebal"><b>B</b></button><button type="button" data-c="italic" title="Miring"><i>I</i></button><button type="button" data-c="underline" title="Garis bawah"><u>U</u></button><button type="button" data-c="insertUnorderedList" title="Daftar">' + ikon('list', 'sm') + '</button><button type="button" data-c="insertOrderedList" title="Daftar bernomor">' + ikon('list-ordered', 'sm') + '</button><button type="button" data-c="removeFormat" title="Hapus format">' + ikon('x', 'sm') + '</button></div><div class="rte-body" contenteditable="true" data-rte="' + b.kunci + '" data-ph="Tulis isi surat… (Enter dua kali untuk paragraf baru)">' + bersihHtml(/</.test(v) ? v : esc(v).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>').replace(/^(.+)$/, '<p>$1</p>')) + '</div></div>' + tail + '</div>';
  if (b.tipe === 'area') return '<div class="field full" data-f="' + b.kunci + '">' + lab + '<textarea id="' + id + '" name="' + b.kunci + '" rows="3">' + esc(v) + '</textarea>' + tail + '</div>';
  if (b.tipe === 'tanggal') return '<div class="field" data-f="' + b.kunci + '">' + lab + '<input id="' + id + '" type="date" name="' + b.kunci + '" value="' + esc(String(v).slice(0, 10)) + '">' + tail + '</div>';
  if (b.tipe === 'pilihan') return '<div class="field" data-f="' + b.kunci + '">' + lab + '<select id="' + id + '" name="' + b.kunci + '"><option value="">— Pilih —</option>' + (b.opsi || []).map(o => '<option value="' + esc(o.kode) + '"' + (o.kode === v ? ' selected' : '') + '>' + esc(o.nama) + '</option>').join('') + '</select>' + tail + '</div>';
  if (b.tipe === 'daftar') {
    const kol = b.kolom || [], rows = Array.isArray(v) ? v : [];
    return '<div class="field full" data-f="' + b.kunci + '" data-daftar="' + b.kunci + '" data-kolom="' + esc(JSON.stringify(kol)) + '">' + lab + '<div class="tbl-wrap" style="border:1px solid var(--border);border-radius:10px"><table class="tbl daftar-t"><thead><tr><th>No</th>' + kol.map(k => '<th>' + esc(k.label) + '</th>').join('') + '<th></th></tr></thead><tbody>' + rows.map((r, i) => barisDaftar(kol, r, i)).join('') + '</tbody></table></div><button type="button" class="btn btn-sm mt8" data-tambah-baris>' + ikon('plus', 'sm') + 'Tambah baris</button>' + tail + '</div>';
  }
  return '<div class="field' + (b.tipe === 'angka' ? '' : ' full') + '" data-f="' + b.kunci + '">' + lab + '<input id="' + id + '" name="' + b.kunci + '" value="' + esc(v) + '"' + (b.tipe === 'angka' ? ' inputmode="decimal"' : '') + '>' + tail + '</div>';
}
function barisDaftar(kol, r, i) { return '<tr><td class="muted">' + (i + 1) + '</td>' + kol.map(k => '<td><input class="inp" data-k="' + esc(k.kunci) + '" value="' + esc((r || {})[k.kunci] || '') + '"' + (k.tipe === 'tanggal' ? ' type="date"' : '') + '></td>').join('') + '<td><button type="button" class="icon-btn" data-hapus-baris aria-label="Hapus baris">' + ikon('x', 'sm') + '</button></td></tr>'; }
function siapkanDaftar(form) {
  $$('[data-daftar]', form).forEach(w => {
    const kol = JSON.parse(w.dataset.kolom || '[]'), tb = $('tbody', w);
    const nomori = () => $$('tr', tb).forEach((tr, i) => { tr.firstChild.textContent = i + 1; });
    $('[data-tambah-baris]', w).onclick = () => { tb.insertAdjacentHTML('beforeend', barisDaftar(kol, {}, tb.children.length)); nomori(); };
    tb.onclick = e => { const b = e.target.closest('[data-hapus-baris]'); if (b) { b.closest('tr').remove(); nomori(); form.dispatchEvent(new Event('input')); } };
    if (!tb.children.length) $('[data-tambah-baris]', w).click();
  });
}
function bersihHtml(h) { return String(h || '').replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, ''); }
function siapkanRte(root) {
  $$('.rte', root).forEach(r => {
    const body = $('.rte-body', r);
    $$('[data-c]', r).forEach(b => b.onmousedown = e => { e.preventDefault(); body.focus(); document.execCommand(b.dataset.c, false, null); body.dispatchEvent(new Event('input', { bubbles: true })); });
    body.addEventListener('paste', e => {   // tempel sebagai teks bersih + paragraf
      e.preventDefault();
      const t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertHTML', false, t.split(/\n{2,}/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join(''));
    });
  });
}
function bacaIsianDok(form, bidang) {
  const o = {};
  bidang.forEach(b => {
    if (b.tipe === 'naskah') { const r = form.querySelector('[data-rte="' + b.kunci + '"]'); o[b.kunci] = r ? bersihHtml(r.innerHTML) : ''; return; }
    if (b.tipe === 'daftar') { const w = form.querySelector('[data-daftar="' + b.kunci + '"]'); o[b.kunci] = w ? $$('tbody tr', w).map(tr => { const x = {}; $$('[data-k]', tr).forEach(i => { x[i.dataset.k] = i.value.trim(); }); return x; }).filter(x => Object.values(x).some(String)) : []; return; }
    const el = form.querySelector('[name="' + b.kunci + '"]'); o[b.kunci] = el ? el.value.trim() : '';
  });
  return o;
}
async function pratinjauPdf(d) {
  const blob = b64keBlob(d.base64, d.mime || 'application/pdf');
  const m = modal({ judul: 'Pratinjau dokumen', sub: 'Belum bernomor & belum tercatat — hanya untuk diperiksa.', ukuran: 'xl', isi: '<div class="viewer" style="height:100%;border:0;min-height:0"><div class="vw-body" style="max-height:none"></div></div>' });
  const mb = $('.modal-b', m.el); mb.style.flex = '1'; mb.style.display = 'flex'; mb.style.padding = '0';
  const body = $('.vw-body', m.el);
  try {
    const lib = await pakaiPdfjs();
    const pdf = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    body.innerHTML = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i), vp1 = pg.getViewport({ scale: 1 }), sk = Math.min(1.6, (body.clientWidth - 40) / vp1.width) * (devicePixelRatio || 1), vp = pg.getViewport({ scale: sk });
      const cv = document.createElement('canvas'); cv.className = 'pg'; cv.width = vp.width; cv.height = vp.height; cv.style.width = vp.width / (devicePixelRatio || 1) + 'px';
      body.appendChild(cv); await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    }
  } catch (e) { body.innerHTML = '<iframe class="pg" style="width:100%;height:75vh;border:0" src="' + URL.createObjectURL(blob) + '"></iframe>'; }
}
function hasilTerbit(d, pesan) {
  const k = d.dokumen;
  modal({
    judul: 'Dokumen terbit', ikon: 'circle-check', ikonCls: 'ok', ukuran: 'lg', kunci: true,
    isi: '<p>' + esc(pesan) + '</p><div class="qr-box mt16"><img src="' + esc(k.qr) + '" alt="QR verifikasi"><div class="grow"><div class="lbl">Nomor</div><div class="nomor-big">' + esc(k.nomor || '— tanpa nomor —') + '</div><div class="lbl mt8">Kode verifikasi</div><div class="mono b">' + esc(k.kodeVerifikasi) + '</div>' + (k.urlVerifikasi ? '<button class="btn btn-sm mt8" data-salin>' + ikon('link', 'sm') + 'Salin tautan verifikasi</button>' : '') + '</div></div>' +
      '<div class="lbl mt16 mb8">Unduh</div><div class="flex wrap gap8">' + k.format.map(f => '<button class="btn" data-f="' + f + '">' + ikon(f === 'pdf' ? 'file-down' : f === 'xlsx' ? 'file-spreadsheet' : 'file-text') + f.toUpperCase() + '</button>').join('') + '</div>' +
      (d.suratKeluar ? '<div class="note mt16">' + ikon('send', 'sm') + '<span>Tercatat di Surat Keluar <a href="#/m/sk/' + encodeURIComponent(d.suratKeluar.id) + '" class="b">' + esc(d.suratKeluar.id) + '</a> · ' + (d.suratKeluar.status === 'TERVERIFIKASI' ? 'terverifikasi' : 'menunggu verifikasi Admin') + '.</span></div>' : '') +
      '<div class="note warn mt12">' + ikon('pen-line', 'sm') + '<span>Cetak PDF, lalu tanda tangani basah & bubuhkan stempel. QR di dokumen dapat dipindai untuk memastikan keasliannya.</span></div>',
    onBuka: w => {
      $$('[data-f]', w).forEach(b => b.onclick = () => sibuk(b, async () => { const r = await api('doc.unduh', { id: k.id, format: b.dataset.f }, { timeout: 90000 }); if (!r.success) return galat(r); unduhB64(r.data.nama, r.data.mime, r.data.base64); }));
      const s = $('[data-salin]', w); if (s) s.onclick = () => salin(k.urlVerifikasi);
    },
    tombol: [{ teks: 'Lihat riwayat', aksi: () => { location.hash = '#/dokumen/riwayat'; } }, { teks: 'Buat dokumen lain', cls: 'btn-primary', aksi: () => { location.hash = '#/dokumen'; } }]
  });
}

/* ---------------------------------------------------------------------
 * Riwayat dokumen
 * ------------------------------------------------------------------- */
daftarHalaman('dokumen/riwayat', {
  boleh: () => bolehDokumen(),
  tampil(el, s, params, o) {
    if (o.baru) {
      el._st = { q: '', kode: '', status: '', page: 1 };
      el.innerHTML = headHalaman({ crumbs: ['Dokumen', 'Riwayat'], judul: 'Riwayat Dokumen Terbit', sub: 'Unduh ulang, lihat QR, atau tarik dokumen (Admin). Status penarikan langsung tampil di halaman verifikasi publik.', aksi: '<a class="btn btn-primary" href="#/dokumen">' + ikon('file-plus') + 'Buat Dokumen</a>' }) +
        '<div class="card p0"><div class="toolbar"><label class="inp-ic">' + ikon('search', 'sm') + '<input class="inp" data-q placeholder="Cari nomor, perihal, kode verifikasi…"></label><select class="inp" data-kode><option value="">Semua jenis</option></select><select class="inp" data-status><option value="">Semua status</option><option value="TERBIT">Terbit</option><option value="DITARIK">Ditarik</option></select></div><div data-tabel>' + skeletonTabel(5) + '</div><div class="tbl-foot" data-foot hidden></div></div>';
      const st = el._st;
      ambilJenis().then(j => { $('[data-kode]', el).innerHTML = '<option value="">Semua jenis</option>' + j.map(t => '<option value="' + esc(t.kode) + '">' + esc(t.nama) + '</option>').join(''); });
      $('[data-q]', el).addEventListener('input', debounce(e => { st.q = e.target.value.trim(); st.page = 1; muatRiwayat(el); }, 350));
      $('[data-kode]', el).onchange = e => { st.kode = e.target.value; st.page = 1; muatRiwayat(el); };
      $('[data-status]', el).onchange = e => { st.status = e.target.value; st.page = 1; muatRiwayat(el); };
    }
    muatRiwayat(el, !o.baru).then(() => { if (params.id) detailDok(params.id); });
  }
});
function muatRiwayat(el, paksa) {
  const st = el._st;
  return swr('doclist:' + JSON.stringify(st), 'doc.list', Object.assign({ per: 15 }, st), d => {
    const box = $('[data-tabel]', el), foot = $('[data-foot]', el);
    if (!d.rows.length) { box.innerHTML = kosongHtml('history', 'Belum ada dokumen', 'Dokumen yang Anda terbitkan akan tercatat di sini.'); foot.hidden = true; return; }
    box.innerHTML = '<div class="tbl-wrap tbl-resp"><table class="tbl"><thead><tr><th>Nomor</th><th>Jenis & perihal</th><th>Terbit</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody>' + d.rows.map(x => '<tr class="klik" data-id="' + esc(x.id) + '"><td class="mono b nowrap">' + esc(x.nomor || '—') + '<div class="sub">' + esc(x.kodeVerifikasi) + '</div></td><td class="wrap-t"><b>' + esc(x.nama) + '</b><div class="sub">' + esc(x.perihal) + '</div></td><td class="nowrap">' + esc(fmtWaktu(x.terbit)) + '<div class="sub">' + esc(x.oleh) + '</div></td><td>' + (x.status === 'TERBIT' ? '<span class="chip chip-ok titik">Terbit</span>' : '<span class="chip chip-no titik">Ditarik</span>') + '</td><td class="right nowrap">' + x.format.map(f => '<button class="btn btn-sm" data-u="' + f + '">' + f.toUpperCase() + '</button>').join(' ') + '</td></tr>').join('') + '</tbody></table>' +
      '<div class="mlist">' + d.rows.map(x => '<div class="mitem" data-id="' + esc(x.id) + '"><div class="grow"><div class="mt mono">' + esc(x.nomor || x.kodeVerifikasi) + '</div><div class="ms">' + esc(x.nama) + ' · ' + esc(x.perihal) + '</div><div class="mm">' + (x.status === 'TERBIT' ? '<span class="chip chip-ok">Terbit</span>' : '<span class="chip chip-no">Ditarik</span>') + '<span>' + esc(relatif(x.terbit)) + '</span></div></div></div>').join('') + '</div></div>';
    $$('[data-id]', box).forEach(tr => tr.onclick = e => {
      const u = e.target.closest('[data-u]');
      if (u) { e.stopPropagation(); return sibuk(u, async () => { const r = await api('doc.unduh', { id: tr.dataset.id, format: u.dataset.u }, { timeout: 90000 }); if (!r.success) return galat(r); unduhB64(r.data.nama, r.data.mime, r.data.base64); }); }
      detailDok(tr.dataset.id, () => muatRiwayat(el, true));
    });
    foot.hidden = false; foot.innerHTML = pagerHtml(d.total, d.page, d.per);
    $$('[data-pg]', foot).forEach(b => b.onclick = () => { st.page = +b.dataset.pg; muatRiwayat(el); });
  }, { fresh: 20000, force: paksa, onError: r => { $('[data-tabel]', el).innerHTML = galatHtml(r); pasangUlang(el, () => muatRiwayat(el, true)); } });
}
async function detailDok(id, setelah) {
  const dr = laci({ judul: 'Dokumen', sub: esc(id), isi: '<div class="sk sk-blk"></div>' });
  const r = await api('doc.get', { id });
  if (!r.success) { dr.body.innerHTML = galatHtml(r); return; }
  const k = r.data;
  dr.setJudul(esc(k.nama), '<span class="mono">' + esc(k.nomor || k.id) + '</span>');
  dr.hact.innerHTML = k.status === 'TERBIT' ? '<span class="chip chip-ok titik">Terbit</span>' : '<span class="chip chip-no titik">Ditarik</span>';
  dr.body.innerHTML = (k.status === 'DITARIK' ? '<div class="reject-box mb16 small"><b>Ditarik:</b> ' + esc(k.alasanTarik) + '</div>' : '') +
    '<div class="qr-box"><img src="' + esc(k.qr) + '" alt="QR"><div class="grow"><div class="lbl">Kode verifikasi</div><div class="mono b">' + esc(k.kodeVerifikasi) + '</div>' + (k.urlVerifikasi ? '<div class="flex gap8 mt8 wrap"><button class="btn btn-sm" data-salin>' + ikon('copy', 'sm') + 'Salin tautan</button><a class="btn btn-sm" target="_blank" rel="noopener" href="' + esc(k.urlVerifikasi) + '">' + ikon('external-link', 'sm') + 'Buka</a></div>' : '<div class="hint mt4">Alamat aplikasi belum tercatat — QR berisi kode saja.</div>') + '</div></div>' +
    '<div class="kv-box mt16">' + [['Perihal', k.perihal], ['Terbit', fmtWaktu(k.terbit) + ' · ' + k.oleh], ['Sidik PDF (SHA-256)', k.hashPdf ? k.hashPdf.slice(0, 24) + '…' : '–']].concat((k.penandatangan || []).map(p => ['Penanda tangan ' + p.slot, (p.nama || '–') + ' · ' + (p.jabatan || '') + (p.tanda === 'spesimen' ? ' (spesimen)' : ' (TTD basah)')])).map(x => '<div class="kv-row"><span class="k">' + esc(x[0]) + '</span><span class="v">' + esc(x[1]) + '</span></div>').join('') + '</div>' +
    (k.dataId ? '<a class="btn btn-sm mt12" href="#/m/' + k.modul + '/' + encodeURIComponent(k.dataId) + '">' + ikon('file-search', 'sm') + 'Lihat data sumber</a> ' : '') + (k.suratKeluarId ? '<a class="btn btn-sm mt12" href="#/m/sk/' + encodeURIComponent(k.suratKeluarId) + '">' + ikon('send', 'sm') + 'Lihat di Surat Keluar</a>' : '') +
    '<div class="sec-t">Unduh</div><div class="flex wrap gap8">' + k.format.map(f => '<button class="btn" data-f="' + f + '">' + ikon('download', 'sm') + f.toUpperCase() + '</button>').join('') + '</div>';
  const s = $('[data-salin]', dr.el); if (s) s.onclick = () => salin(k.urlVerifikasi);
  $$('[data-f]', dr.el).forEach(b => b.onclick = () => sibuk(b, async () => { const x = await api('doc.unduh', { id: k.id, format: b.dataset.f }, { timeout: 90000 }); if (!x.success) return galat(x); unduhB64(x.data.nama, x.data.mime, x.data.base64); }));
  if (isAdmin() && k.status === 'TERBIT') {
    dr.setKaki('<button class="btn btn-danger-soft" data-tarik>' + ikon('circle-x') + 'Tarik dokumen</button>');
    $('[data-tarik]', dr.el).onclick = async () => {
      const o = await konfirmasi({ judul: 'Tarik dokumen ' + (k.nomor || k.kodeVerifikasi) + '?', pesan: 'Halaman verifikasi publik akan menampilkan <b>DITARIK</b>. Nomor tidak dipakai ulang.', ok: 'Tarik dokumen', bahaya: true, alasan: { label: 'Alasan penarikan', ph: 'Contoh: salah tanggal kegiatan, diganti nomor baru' } });
      if (!o) return;
      const x = await api('doc.tarik', { id: k.id, alasan: o.alasan }); if (!x.success) return galat(x);
      toast(x.message); invalidasi('doclist'); dr.tutup(); setelah && setelah();
    };
  }
}

/* ---------------------------------------------------------------------
 * Admin: Template · Penanda Tangan · Penomoran
 * ------------------------------------------------------------------- */
function tabDokAdmin(aktif) {
  return '<div class="tabs">' + [['dokumen/template', 'layers', 'Template'], ['dokumen/pejabat', 'signature', 'Penanda Tangan'], ['dokumen/nomor', 'hash', 'Penomoran Surat']].map(x => '<button data-go="' + x[0] + '"' + (x[0] === aktif ? ' class="on"' : '') + '>' + ikon(x[1], 'sm') + x[2] + '</button>').join('') + '</div>';
}
function pasangTabDok(el) { $$('[data-go]', el).forEach(b => b.onclick = () => ke(b.dataset.go)); }

daftarHalaman('dokumen/template', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) {
      el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Template & Penomoran'], judul: 'Template Dokumen', sub: 'Desain surat di Google Docs/Sheets memakai penanda {{...}}. Form isian, nomor, QR, dan arsip dibangun otomatis dari template.', aksi: '<button class="btn" data-kamus>' + ikon('book-open') + 'Kamus Placeholder</button><button class="btn btn-primary" data-tambah>' + ikon('plus') + 'Tambah Template</button>' }) + tabDokAdmin('dokumen/template') + '<div class="grid g2" data-isi>' + Array(4).fill('<div class="card sk" style="height:220px"></div>').join('') + '</div>';
      pasangTabDok(el);
      $('[data-kamus]', el).onclick = kamusPlaceholder;
      $('[data-tambah]', el).onclick = () => tambahTemplate(el);
    }
    muatTpl(el);
  }
});
async function muatTpl(el) {
  const r = await api('tpl.list');
  const box = $('[data-isi]', el);
  if (!r.success) { box.innerHTML = '<div class="card">' + galatHtml(r) + '</div>'; pasangUlang(box, () => muatTpl(el)); return; }
  el._tpl = r.data;
  box.innerHTML = r.data.map(t => '<div class="card"><div class="flex gap12" style="align-items:flex-start"><div class="tpl-ic ' + (t.engine === 'sheets' ? 'teal' : '') + '">' + ikon(IKON_TPL[t.kode] || (t.engine === 'sheets' ? 'file-spreadsheet' : 'file-text')) + '</div><div class="grow"><div class="flex between gap8"><div class="b" style="font-size:15px">' + esc(t.nama) + '</div><label class="switch" title="Aktif"><input type="checkbox" data-aktif="' + esc(t.id) + '"' + (t.aktif ? ' checked' : '') + '><span class="sl"></span></label></div>' +
    '<div class="xs muted mono mt4">' + esc(t.kode) + ' · v' + esc(t.versi) + ' · ' + (t.engine === 'sheets' ? 'Google Sheets' : 'Google Docs') + '</div><div class="flex wrap gap4 mt8">' + (t.standar ? '<span class="chip chip-muted">Bawaan</span>' : '<span class="chip chip-or">Kustom</span>') + (t.nomorKode ? '<span class="chip chip-or">Nomor ' + esc(t.nomorKode) + (t.klasifikasi ? ' · ' + esc(t.klasifikasi) : '') + '</span>' : '') + (t.catatSK ? '<span class="chip chip-teal">→ Surat Keluar</span>' : '') + (t.modul ? '<span class="chip chip-teal">Sumber: ' + esc((S.modul[t.modul] || {}).label || t.modul) + '</span>' : '') + t.keluaran.split(',').map(f => '<span class="tag">' + esc(f.toUpperCase()) + '</span>').join('') + '</div>' +
    '<div class="small t2 mt8">' + (t.bidang || []).filter(b => !b.sistem).length + ' isian · ' + (t.slot || []).length + ' penanda tangan' + (t.fileUrl ? '' : ' · <b class="no-t">belum ada berkas</b>') + '</div></div></div>' +
    '<div class="flex wrap gap8 mt16"><button class="btn btn-sm" data-atur="' + esc(t.id) + '">' + ikon('sliders-horizontal', 'sm') + 'Atur form & TTD</button>' + (t.fileUrl ? '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + esc(t.fileUrl) + '">' + ikon('external-link', 'sm') + 'Edit desain</a>' : '') + '<button class="btn btn-sm" data-pindai="' + esc(t.id) + '"' + (t.fileUrl ? '' : ' disabled') + '>' + ikon('scan-line', 'sm') + 'Pindai ulang</button><button class="btn btn-sm" data-ganti="' + esc(t.id) + '">' + ikon('upload', 'sm') + 'Ganti berkas</button><button class="btn btn-sm btn-ic" data-lain="' + esc(t.id) + '" aria-label="Lainnya">' + ikon('ellipsis') + '</button></div></div>').join('');
  $$('[data-aktif]', box).forEach(c => c.onchange = async () => { const x = await api('tpl.simpan', { id: c.dataset.aktif, data: { aktif: c.checked ? 'YA' : 'TIDAK' } }); if (!x.success) { c.checked = !c.checked; return galat(x); } toast('Template ' + (c.checked ? 'diaktifkan' : 'dinonaktifkan') + '.'); invalidasi('docjenis'); });
  $$('[data-atur]', box).forEach(b => b.onclick = () => aturTemplate(el, el._tpl.find(t => t.id === b.dataset.atur)));
  $$('[data-pindai]', box).forEach(b => b.onclick = () => sibuk(b, async () => { const x = await api('tpl.pindai', { id: b.dataset.pindai }, { timeout: 90000 }); if (!x.success) return galat(x); toast(x.message + (x.data.hilang.length ? ' Penanda hilang: ' + x.data.hilang.join(', ') : '')); invalidasi('docjenis'); muatTpl(el); }));
  $$('[data-ganti]', box).forEach(b => b.onclick = () => gantiBerkasTpl(el, el._tpl.find(t => t.id === b.dataset.ganti)));
  $$('[data-lain]', box).forEach(b => b.onclick = () => {
    const t = el._tpl.find(x => x.id === b.dataset.lain);
    const p = popover(b, '<button class="pi" data-a="unduh">' + ikon('download') + 'Unduh template (.' + (t.engine === 'sheets' ? 'xlsx' : 'docx') + ')</button>' + (t.standar ? '<button class="pi" data-a="reset">' + ikon('rotate-ccw') + 'Kembalikan desain bawaan</button>' : '') + '<hr><div class="ph xs muted">Riwayat versi</div>' + ((t.riwayat || []).length ? t.riwayat.map(v => '<div class="ph small">v' + esc(v.versi) + ' · ' + esc(fmtWaktu(v.dibuat)) + ' · ' + esc(v.oleh) + '</div>').join('') : '<div class="ph small muted">Belum ada</div>'));
    const u = p.querySelector('[data-a=unduh]'); u.onclick = () => { tutupPop(); sibuk(b, async () => { const x = await api('tpl.unduh', { id: t.id }, { timeout: 90000 }); if (!x.success) return galat(x); unduhB64(x.data.nama, x.data.mime, x.data.base64); }); };
    const rs = p.querySelector('[data-a=reset]'); if (rs) rs.onclick = async () => { tutupPop(); if (!await konfirmasi({ judul: 'Kembalikan desain bawaan?', pesan: 'Berkas template dibuat ulang dari desain awal. Versi saat ini tetap tersimpan di riwayat.', ok: 'Kembalikan' })) return; const x = await api('tpl.reset', { id: t.id }, { timeout: 120000 }); if (!x.success) return galat(x); toast('Desain bawaan dipulihkan.'); invalidasi('docjenis'); muatTpl(el); };
  });
}
function aturTemplate(el, t) {
  const tipe = [['teks', 'Teks singkat'], ['area', 'Teks panjang'], ['naskah', 'Naskah (format)'], ['tanggal', 'Tanggal'], ['angka', 'Angka'], ['pilihan', 'Pilihan'], ['daftar', 'Daftar/tabel']];
  const bidang = (t.bidang || []).filter(b => !b.sistem);
  const dr = laci({
    judul: 'Atur ' + esc(t.nama), sub: 'Form isian & penanda tangan · v' + esc(t.versi), lebar: true,
    isi: '<div class="form-grid"><div class="field"><label>Nama template</label><input data-nm value="' + esc(t.nama) + '"></div><div class="field"><label>Keluaran</label><div class="flex gap12 wrap" style="min-height:40px">' + ['pdf', 'docx', 'xlsx'].filter(f => t.engine === 'sheets' ? f !== 'docx' : f !== 'xlsx').map(f => '<label class="check"><input type="checkbox" data-kel value="' + f + '"' + (t.keluaran.split(',').indexOf(f) >= 0 ? ' checked' : '') + (f === 'pdf' ? ' disabled' : '') + '> ' + f.toUpperCase() + '</label>').join('') + '</div></div>' +
      '<div class="field"><label>Register nomor</label><select data-nk><option value="">Tanpa nomor</option><option value="SK"' + (t.nomorKode === 'SK' ? ' selected' : '') + '>SK — Surat Keluar</option></select></div><div class="field"><label>Klasifikasi bawaan</label><select data-kl>' + opsiRef('klasifikasi', t.klasifikasi, '— tidak ada —') + '</select></div>' +
      '<div class="field"><label>Izin pemakai (staf)</label><select data-iz><option value="">Admin saja</option>' + (S.boot.izinList || []).filter(x => x[0] !== 'pribadi' && x[0] !== 'ekspor').map(x => '<option value="' + x[0] + '"' + (t.izin === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select></div><div class="field"><label>Catat otomatis</label><label class="check" style="min-height:40px"><input type="checkbox" data-csk' + (t.catatSK ? ' checked' : '') + '> Catat sebagai Surat Keluar (butuh nomor SK)</label></div></div>' +
      '<div class="sec-t">Isian form (dari placeholder)</div><div class="small t2 mb8">Urutan baris = urutan di form. Ubah label agar mudah dipahami staf.</div><div class="tbl-wrap" style="border:1px solid var(--border);border-radius:10px"><table class="tbl"><thead><tr><th>Penanda</th><th>Label</th><th>Tipe</th><th>Wajib</th><th>Bantuan / opsi</th><th></th></tr></thead><tbody data-bd>' +
      bidang.map(b => '<tr data-k="' + esc(b.kunci) + '"><td class="mono small">{{' + esc(b.kunci) + '}}</td><td><input class="inp sm" data-l value="' + esc(b.label) + '"></td><td><select class="inp sm" data-t>' + tipe.map(x => '<option value="' + x[0] + '"' + (x[0] === b.tipe ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></td><td class="ctr"><input type="checkbox" data-w' + (b.wajib ? ' checked' : '') + '></td><td><input class="inp sm" data-b value="' + esc(b.tipe === 'pilihan' && !b.ref ? (b.opsi || []).map(o => typeof o === 'string' ? o : o.nama).join('; ') : (b.bantu || '')) + '" placeholder="' + (b.tipe === 'pilihan' ? 'Opsi dipisah titik koma' : 'Teks bantuan') + '"' + (b.ref ? ' disabled title="Opsi dari Master Data: ' + esc(b.ref) + '"' : '') + '></td><td class="nowrap"><button class="icon-btn" data-up aria-label="Naik">' + ikon('arrow-up', 'sm') + '</button><button class="icon-btn" data-dn aria-label="Turun">' + ikon('arrow-down', 'sm') + '</button></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="sec-t">Penanda tangan</div>' + (t.slot || []).map(s => '<div class="form-grid mb12" data-slot="' + s.slot + '" style="padding:12px;border:1px solid var(--border);border-radius:10px"><div class="field"><label>Label slot ' + s.slot + '</label><input data-sl value="' + esc(s.label) + '"></div><div class="field"><label>Cara menentukan pejabat</label><select data-sc><option value="jabatan"' + (s.cara === 'jabatan' ? ' selected' : '') + '>Pejabat aktif dengan jabatan…</option><option value="pilih"' + (s.cara === 'pilih' ? ' selected' : '') + '>Dipilih saat membuat dokumen</option></select></div><div class="field"><label>Jabatan</label><input data-sj value="' + esc(s.jabatan || '') + '" list="dl_jabatan"></div><div class="field"><label>Tanda tangan</label><select data-st><option value="kosong"' + (s.tanda !== 'spesimen' ? ' selected' : '') + '>Ruang kosong (TTD basah)</option><option value="spesimen"' + (s.tanda === 'spesimen' ? ' selected' : '') + '>Cetak spesimen TTD</option></select></div></div>').join('') + '<datalist id="dl_jabatan">' + (S.ref.jabatan || []).map(r => '<option value="' + esc(r.nama) + '">').join('') + '</datalist>' +
      ((t.slot || []).length ? '' : '<div class="small muted">Tambahkan {{NAMA_PEJABAT_1}}, {{JABATAN_1}}, {{TTD_1}} di template untuk membuat slot.</div>'),
    kaki: '<button class="btn" data-batal>Batal</button><button class="btn btn-primary" data-simpan>' + ikon('check') + 'Simpan pengaturan</button>'
  });
  const bd = $('[data-bd]', dr.el);
  bd.onclick = e => { const tr = e.target.closest('tr'); if (!tr) return; if (e.target.closest('[data-up]') && tr.previousElementSibling) bd.insertBefore(tr, tr.previousElementSibling); if (e.target.closest('[data-dn]') && tr.nextElementSibling) bd.insertBefore(tr.nextElementSibling, tr); };
  $('[data-batal]', dr.el).onclick = () => dr.tutup();
  $('[data-simpan]', dr.el).onclick = e => sibuk(e.currentTarget, async () => {
    const b = $$('tr[data-k]', bd).map(tr => { const tp = $('[data-t]', tr).value, bt = $('[data-b]', tr).value.trim(); return { kunci: tr.dataset.k, label: $('[data-l]', tr).value.trim(), tipe: tp, wajib: $('[data-w]', tr).checked, bantu: tp === 'pilihan' ? '' : bt, opsi: tp === 'pilihan' && !$('[data-b]', tr).disabled ? bt.split(';').map(s => s.trim()).filter(String) : undefined }; });
    const slot = $$('[data-slot]', dr.el).map(s => ({ slot: +s.dataset.slot, label: $('[data-sl]', s).value.trim(), cara: $('[data-sc]', s).value, jabatan: $('[data-sj]', s).value.trim(), tanda: $('[data-st]', s).value }));
    const data = { nama: $('[data-nm]', dr.el).value.trim(), keluaran: ['pdf'].concat($$('[data-kel]:checked', dr.el).map(c => c.value).filter(x => x !== 'pdf')).join(','), nomorKode: $('[data-nk]', dr.el).value, klasifikasi: $('[data-kl]', dr.el).value, izin: $('[data-iz]', dr.el).value, catatSK: $('[data-csk]', dr.el).checked ? 'YA' : 'TIDAK', bidang: b, slot };
    const x = await api('tpl.simpan', { id: t.id, data });
    if (!x.success) return galat(x);
    toast('Pengaturan template tersimpan.'); invalidasi('docjenis'); dr.tutup(); muatTpl(el);
  });
}
function gantiBerkasTpl(el, t) {
  const ext = t.engine === 'sheets' ? '.xlsx' : '.docx';
  modal({
    judul: 'Ganti berkas template', sub: t.nama, ikon: 'upload', ukuran: 'lg',
    isi: '<div class="tabs" data-tb><button class="on" data-m="url">Tempel URL Google ' + (t.engine === 'sheets' ? 'Sheets' : 'Docs') + '</button><button data-m="up">Unggah ' + ext + '</button></div>' +
      '<div data-p="url"><div class="field"><label>URL dokumen</label><input data-url placeholder="https://docs.google.com/' + (t.engine === 'sheets' ? 'spreadsheets' : 'document') + '/d/…/edit"></div><div class="hint mt8">Dokumen harus bisa dibuka akun pemilik Apps Script. Sistem menyalin dokumen ke folder Template — dokumen asli tidak diubah.</div></div>' +
      '<div data-p="up" hidden><div class="field"><label>Berkas ' + ext + '</label><input type="file" data-file accept="' + ext + '"></div><div class="hint mt8">Berkas dikonversi otomatis ke Google ' + (t.engine === 'sheets' ? 'Sheets' : 'Docs') + '. Pastikan penanda ditulis utuh, mis. {{PERIHAL}}.</div></div>' +
      '<div class="note mt16">' + ikon('info', 'sm') + '<span>Setelah dipasang, sistem memindai ulang penanda. Pengaturan label/tipe yang lama dipertahankan untuk penanda yang sama.</span></div>',
    onBuka: w => { $$('[data-tb] button', w).forEach(b => b.onclick = () => { $$('[data-tb] button', w).forEach(x => x.classList.toggle('on', x === b)); $$('[data-p]', w).forEach(p => { p.hidden = p.dataset.p !== b.dataset.m; }); }); },
    tombol: [{ teks: 'Batal' }, {
      teks: 'Pasang template', cls: 'btn-primary', aksi: async (tt, w) => {
        const url = $('[data-url]', w).value.trim(), f = $('[data-file]', w).files[0];
        let payload = { id: t.id };
        if (!$('[data-p=up]', w).hidden) { if (!f) { toast('Pilih berkas ' + ext + '.', 'warn'); return false; } if (f.size > 10 * 1024 * 1024) { toast('Maksimal 10 MB.', 'warn'); return false; } payload.nama = f.name; payload.base64 = await bacaBase64(f); }
        else { if (!/docs\.google\.com/.test(url)) { toast('Tempel URL Google ' + (t.engine === 'sheets' ? 'Sheets' : 'Docs') + '.', 'warn'); return false; } payload.url = url; }
        const x = await api('tpl.ganti', payload, { timeout: 120000 });
        if (!x.success) { galat(x); return false; }
        toast(x.message + (x.data.hilang && x.data.hilang.length ? ' Penanda yang hilang: ' + x.data.hilang.join(', ') : ''));
        invalidasi('docjenis'); muatTpl(el); return true;
      }
    }]
  });
}
function tambahTemplate(el) {
  modal({
    judul: 'Tambah template kustom', ikon: 'file-plus', ukuran: 'lg',
    isi: '<div class="form-grid"><div class="field"><label>Kode <span class="req">*</span></label><input data-kode class="mono" placeholder="SURAT_TUGAS" maxlength="30"></div><div class="field"><label>Nama <span class="req">*</span></label><input data-nama placeholder="Surat Tugas Guru"></div>' +
      '<div class="field"><label>Mesin</label><select data-eng><option value="docs">Google Docs (surat)</option><option value="sheets">Google Sheets (tabel/rekap)</option></select></div><div class="field"><label>Sumber data (opsional)</label><select data-mod><option value="">Tanpa sumber — isi manual</option>' + Object.keys(S.modul).map(k => '<option value="' + k + '">' + esc(S.modul[k].label) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Izin pemakai</label><select data-iz><option value="">Admin saja</option>' + (S.boot.izinList || []).filter(x => x[0] !== 'pribadi' && x[0] !== 'ekspor').map(x => '<option value="' + x[0] + '">' + esc(x[1]) + '</option>').join('') + '</select></div><div class="field"><label>Penomoran</label><select data-nk><option value="">Tanpa nomor</option><option value="SK">Register SK + catat ke Surat Keluar</option></select></div>' +
      '<div class="field"><label>Klasifikasi bawaan</label><select data-kl>' + opsiRef('klasifikasi', '', '— tidak ada —') + '</select></div><div class="field"><label>Berkas template (opsional)</label><input type="file" data-file accept=".docx,.xlsx"></div></div>' +
      '<div class="note mt16">' + ikon('info', 'sm') + '<span>Tulis penanda di dokumen Word/Docs, mis. <span class="mono">{{NAMA_GURU}}</span>, <span class="mono">{{TGL_KEGIATAN|tanggal}}</span>, <span class="mono">{{NOMOR}}</span>, <span class="mono">{{QR}}</span>, <span class="mono">{{NAMA_PEJABAT_1}}</span>. Lihat Kamus Placeholder.</span></div>',
    tombol: [{ teks: 'Batal' }, {
      teks: 'Tambah', cls: 'btn-primary', aksi: async (tt, w) => {
        const d = { kode: $('[data-kode]', w).value.trim(), nama: $('[data-nama]', w).value.trim(), engine: $('[data-eng]', w).value, modul: $('[data-mod]', w).value, izin: $('[data-iz]', w).value, nomorKode: $('[data-nk]', w).value, catatSK: $('[data-nk]', w).value === 'SK' ? 'YA' : 'TIDAK', klasifikasi: $('[data-kl]', w).value };
        if (!d.kode || !d.nama) { toast('Kode dan nama wajib diisi.', 'warn'); return false; }
        const f = $('[data-file]', w).files[0];
        const ext = d.engine === 'sheets' ? /\.xlsx$/i : /\.docx$/i;
        if (f && !ext.test(f.name)) { toast('Berkas harus ' + (d.engine === 'sheets' ? '.xlsx' : '.docx') + ' sesuai mesin yang dipilih.', 'warn'); return false; }
        const x = await api('tpl.tambah', d, { timeout: 120000 });
        if (!x.success) { galat(x); return false; }
        if (f) { const t = x.data.template; const g = await api('tpl.ganti', { id: t.id, nama: f.name, base64: await bacaBase64(f) }, { timeout: 120000 }); if (!g.success) galat(g); else toast(g.message); }
        toast('Template ditambahkan.'); invalidasi('docjenis'); muatTpl(el); return true;
      }
    }]
  });
}
async function kamusPlaceholder() {
  const m = modal({ judul: 'Kamus Placeholder', sub: 'Salin penanda ke dokumen template Anda', ukuran: 'lg', isi: '<div class="sk sk-blk"></div>' });
  const r = await api('tpl.kamus');
  if (!r.success) { $('.modal-b', m.el).innerHTML = galatHtml(r); return; }
  const k = r.data;
  const baris = (arr) => '<table class="tbl"><tbody>' + arr.map(x => '<tr><td class="nowrap"><span class="token-chip" data-c="{{' + esc(x[0]) + '}}">{{' + esc(x[0]) + '}}</span></td><td class="small">' + esc(x[1]) + '</td>' + (x[2] !== undefined ? '<td class="small muted">' + esc(x[2]) + '</td>' : '') + '</tr>').join('') + '</tbody></table>';
  $('.modal-b', m.el).innerHTML = '<div class="lbl mb8">Umum & institusi</div>' + baris(k.umum) +
    Object.keys(k.modul).map(mk => '<div class="lbl mt16 mb8">Data ' + esc(k.modul[mk].label) + '</div>' + baris(k.modul[mk].kunci)).join('') +
    '<div class="lbl mt16 mb8">Pengubah (setelah tanda |)</div><table class="tbl"><tbody>' + k.pengubah.map(x => '<tr><td class="mono small">' + esc(x[0]) + '</td><td class="small">' + esc(x[1]) + '</td></tr>').join('') + '</tbody></table>' +
    '<div class="lbl mt16 mb8">Blok khusus</div><table class="tbl"><tbody>' + k.blok.map(x => '<tr><td class="mono small">' + esc(x[0]) + '</td><td class="small">' + esc(x[1]) + '</td></tr>').join('') + '</tbody></table>';
  $$('[data-c]', m.el).forEach(c => c.onclick = () => salin(c.dataset.c));
}

/* Penanda tangan */
daftarHalaman('dokumen/pejabat', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) {
      el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Template & Penomoran'], judul: 'Penanda Tangan', sub: 'Pejabat aktif dipilih otomatis berdasarkan jabatan dan masa jabatan. Spesimen TTD opsional (PNG transparan).', aksi: '<button class="btn btn-primary" data-tambah>' + ikon('plus') + 'Tambah Pejabat</button>' }) + tabDokAdmin('dokumen/pejabat') + '<div class="card p0" data-isi>' + skeletonTabel(3) + '</div>';
      pasangTabDok(el);
      $('[data-tambah]', el).onclick = () => formPejabat(el, null);
    }
    muatPejabat(el);
  }
});
async function muatPejabat(el) {
  const r = await api('pejabat.list'), box = $('[data-isi]', el);
  if (!r.success) { box.innerHTML = galatHtml(r); return; }
  el._pj = r.data;
  box.innerHTML = r.data.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Jabatan</th><th>NIP</th><th>Masa jabatan</th><th>Spesimen</th><th>Status</th><th></th></tr></thead><tbody>' + r.data.map(p => '<tr class="klik" data-id="' + esc(p.id) + '"><td><b>' + esc(p.nama + (p.gelar ? ', ' + p.gelar : '')) + '</b><div class="sub">' + esc(p.pangkat || '') + '</div></td><td>' + esc(p.jabatan) + '</td><td class="mono">' + esc(p.nip || '–') + '</td><td class="nowrap">' + (p.mulai ? fmtTgl(p.mulai) : 'sejak awal') + ' – ' + (p.selesai ? fmtTgl(p.selesai) : 'sekarang') + '</td><td>' + (p.spesimen ? '<span class="chip chip-teal">Ada</span>' : '<span class="muted">–</span>') + '</td><td>' + (p.aktif ? '<span class="chip chip-ok">Aktif</span>' : '<span class="chip chip-muted">Nonaktif</span>') + '</td><td>' + ikon('chevron-right', 'muted') + '</td></tr>').join('') + '</tbody></table></div>'
    : kosongHtml('signature', 'Belum ada penanda tangan', 'Tambahkan Kepala Sekolah agar dokumen bisa diterbitkan.', '<button class="btn btn-primary" data-t2>' + ikon('plus') + 'Tambah Pejabat</button>');
  $$('[data-id]', box).forEach(tr => tr.onclick = () => formPejabat(el, el._pj.find(p => p.id === tr.dataset.id)));
  const t2 = $('[data-t2]', box); if (t2) t2.onclick = () => formPejabat(el, null);
}
function formPejabat(el, p) {
  p = p || {};
  const dr = laci({
    judul: p.id ? 'Ubah penanda tangan' : 'Tambah penanda tangan', sub: p.id ? esc(p.id) : '',
    isi: '<form class="form-grid" data-form novalidate>' +
      '<div class="field full" data-f="nama"><label>Nama lengkap <span class="req">*</span></label><input name="nama" value="' + esc(p.nama || '') + '" placeholder="Drs. H. Abdul Karim"><div class="ferr" hidden></div></div>' +
      '<div class="field"><label>Gelar belakang</label><input name="gelar" value="' + esc(p.gelar || '') + '" placeholder="M.Pd."></div><div class="field" data-f="jabatan"><label>Jabatan <span class="req">*</span></label><input name="jabatan" list="dl_jab2" value="' + esc(p.jabatan || 'Kepala Sekolah') + '"><datalist id="dl_jab2">' + (S.ref.jabatan || []).map(r => '<option value="' + esc(r.nama) + '">').join('') + '</datalist><div class="ferr" hidden></div></div>' +
      '<div class="field" data-f="nip"><label>NIP</label><input name="nip" inputmode="numeric" maxlength="18" class="mono" value="' + esc(p.nip || '') + '" placeholder="18 digit (boleh kosong)"><div class="ferr" hidden></div></div><div class="field"><label>Pangkat / golongan</label><input name="pangkat" list="dl_pk2" value="' + esc(p.pangkat || '') + '"><datalist id="dl_pk2">' + (S.ref.pangkat || []).map(r => '<option value="' + esc(r.nama) + '">').join('') + '</datalist></div>' +
      '<div class="field"><label>Mulai menjabat</label><input type="date" name="mulai" value="' + esc(p.mulai || '') + '"></div><div class="field"><label>Selesai menjabat</label><input type="date" name="selesai" value="' + esc(p.selesai || '') + '"></div>' +
      '<div class="field"><label>Email</label><input type="email" name="email" value="' + esc(p.email || '') + '"></div><div class="field"><label>Status</label><select name="aktif"><option value="YA"' + (p.aktif !== false ? ' selected' : '') + '>Aktif</option><option value="TIDAK"' + (p.aktif === false ? ' selected' : '') + '>Nonaktif</option></select></div>' +
      '<div class="field full"><label>Spesimen tanda tangan (PNG/JPG, ≤ 300 KB)</label><input type="file" data-sp accept="image/png,image/jpeg">' + (p.spesimen ? '<label class="check mt8"><input type="checkbox" data-hapus-sp> Hapus spesimen yang tersimpan</label>' : '') + '<div class="hint">Dipakai hanya bila slot template diatur "Cetak spesimen TTD". Simpan spesimen dengan bijak.</div><img data-prev hidden style="max-height:80px;margin-top:8px;border:1px dashed var(--border);border-radius:8px;padding:6px;background:#fff"></div></form>',
    kaki: '<button class="btn" data-batal>Batal</button><button class="btn btn-primary" data-simpan>' + ikon('check') + 'Simpan</button>'
  });
  const form = $('[data-form]', dr.el);
  $('[data-sp]', dr.el).onchange = e => { const f = e.target.files[0], im = $('[data-prev]', dr.el); if (f) { im.src = URL.createObjectURL(f); im.hidden = false; } };
  $('[data-batal]', dr.el).onclick = () => dr.tutup();
  $('[data-simpan]', dr.el).onclick = e => sibuk(e.currentTarget, async () => {
    const g = n => form.querySelector('[name=' + n + ']').value.trim();
    const data = { nama: g('nama'), gelar: g('gelar'), jabatan: g('jabatan'), nip: g('nip').replace(/\D/g, ''), pangkat: g('pangkat'), mulai: g('mulai'), selesai: g('selesai'), email: g('email'), aktif: g('aktif') };
    const err = { nama: data.nama.length < 3 ? 'Nama wajib diisi.' : '', jabatan: data.jabatan ? '' : 'Jabatan wajib.', nip: data.nip && !/^\d{18}$/.test(data.nip) ? 'NIP harus 18 digit.' : '' };
    if (tandaiGalat(form, err)) return;
    const f = $('[data-sp]', dr.el).files[0];
    if (f) { if (f.size > 300 * 1024) return toast('Spesimen maksimal 300 KB.', 'warn'); data.spesimenBase64 = await bacaBase64(f); data.spesimenMime = f.type; }
    const h = $('[data-hapus-sp]', dr.el); if (h && h.checked) data.hapusSpesimen = true;
    const x = await api('pejabat.simpan', { id: p.id || '', data });
    if (!x.success) { if (x.errors) tandaiGalat(form, x.errors); return galat(x); }
    toast(x.message); dr.tutup(); muatPejabat(el);
  });
}

/* Penomoran */
function formatNomorKlien(format, urut, o) {
  const p = tglP(o.tanggal || hariIni());
  return String(format || '').replace(/\{URUT(?::(\d))?\}/g, (m, n) => String(urut).padStart(Number(n || 3), '0')).replace(/\{KLASIFIKASI\}/g, o.klasifikasi || '000').replace(/\{KODE\}/g, o.kode || '')
    .replace(/\{KODE_SEKOLAH\}/g, S.setting.KODE_SEKOLAH || 'SMAN1/KT').replace(/\{BULAN_ROMAWI\}/g, ROMAWI[p.m - 1]).replace(/\{BULAN\}/g, String(p.m).padStart(2, '0')).replace(/\{TAHUN\}/g, String(p.y));
}
daftarHalaman('dokumen/nomor', {
  auth: 'admin',
  tampil(el, s, p, o) {
    if (o.baru) { el.innerHTML = headHalaman({ crumbs: ['Administrasi', 'Template & Penomoran'], judul: 'Penomoran Surat', sub: 'Atur format nomor surat keluar dan agenda surat masuk. Nomor yang sudah terbit tidak pernah dipakai ulang; surat yang dihapus tercatat BATAL.' }) + tabDokAdmin('dokumen/nomor') + '<div data-isi><div class="card sk sk-blk"></div></div>'; pasangTabDok(el); }
    muatNomor(el);
  }
});
async function muatNomor(el, dataSiap) {
  const r = dataSiap || await api('nomor.list'), box = $('[data-isi]', el);
  if (!r.success) { box.innerHTML = '<div class="card">' + galatHtml(r) + '</div>'; return; }
  const d = r.data;
  box.innerHTML = '<div class="grid g2">' + d.register.map(g => '<div class="card" data-reg="' + esc(g.kode) + '"><div class="card-h"><div class="ttl">' + esc(g.nama) + '</div><span class="chip chip-muted mono">' + esc(g.kode) + '</span></div>' +
    '<div class="field"><label>Format nomor</label><input class="mono" data-fmt value="' + esc(g.format) + '"></div><div class="flex wrap gap4 mt8">' + d.token.map(t => '<span class="token-chip" data-tok="' + esc(t) + '">' + esc(t) + '</span>').join('') + '</div>' +
    '<div class="note mt12">' + ikon('eye', 'sm') + '<span>Contoh nomor berikutnya: <b class="mono" data-contoh>' + esc(g.contoh) + '</b></span></div>' +
    '<div class="form-grid mt12"><div class="field"><label>Urutan dihitung</label><select data-lk><option value="global"' + (g.lingkup === 'global' ? ' selected' : '') + '>Satu urutan untuk semua klasifikasi</option><option value="klasifikasi"' + (g.lingkup === 'klasifikasi' ? ' selected' : '') + '>Terpisah per klasifikasi</option></select></div><div class="field"><label>Mulai dari 1 lagi</label><select data-rs><option value="tahunan"' + (g.reset !== 'tidak' ? ' selected' : '') + '>Setiap tahun baru</option><option value="tidak"' + (g.reset === 'tidak' ? ' selected' : '') + '>Tidak pernah</option></select></div></div>' +
    '<div class="sec-t">Urut terakhir</div>' + (Object.keys(g.counter).length ? '<div class="kv-box">' + Object.keys(g.counter).sort().reverse().map(k => '<div class="kv-row"><span class="k mono">' + esc(k) + '</span><span class="v flex gap8"><span class="mono">' + g.counter[k] + '</span><button class="btn btn-sm" data-kor="' + esc(k) + '">Koreksi</button></span></div>').join('') + '</div>' : '<div class="small muted">Belum ada nomor terbit.</div>') +
    '<div class="flex end mt16"><button class="btn btn-primary" data-simpan>' + ikon('check') + 'Simpan format</button></div></div>').join('') + '</div>' +
    '<div class="card p0 mt24"><div class="card-h" style="padding:18px 20px 4px"><div class="ttl">Nomor Surat Keluar Terakhir</div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nomor</th><th>Tanggal</th><th>Perihal</th><th>Sumber</th><th>Status</th></tr></thead><tbody>' +
    d.terakhir.map(x => '<tr class="klik" data-sk="' + esc(x.id) + '"><td class="mono b">' + esc(x.nomor) + '</td><td class="nowrap">' + esc(fmtTgl(x.tanggal)) + '</td><td class="wrap-t">' + esc(x.perihal) + '</td><td>' + esc({ APP: 'Input', DOKUMEN: 'Dokumen', IMPOR: 'Impor', DEMO: 'Demo' }[x.sumber] || x.sumber) + '</td><td>' + (x.status === 'BATAL' ? '<span class="chip chip-no">BATAL</span>' : chipStatus(x.status, true)) + '</td></tr>').join('') + '</tbody></table></div></div>';
  $$('[data-sk]', box).forEach(tr => tr.onclick = () => { location.hash = '#/m/sk/' + encodeURIComponent(tr.dataset.sk); });
  $$('[data-reg]', box).forEach(c => {
    const kode = c.dataset.reg, fmt = $('[data-fmt]', c), contoh = $('[data-contoh]', c);
    const prev = () => { contoh.textContent = formatNomorKlien(fmt.value, 1, { klasifikasi: '421.3', kode }); };
    fmt.oninput = prev;
    $$('[data-tok]', c).forEach(t => t.onclick = () => { const i = fmt.selectionStart || fmt.value.length; fmt.value = fmt.value.slice(0, i) + t.dataset.tok + fmt.value.slice(fmt.selectionEnd || i); fmt.focus(); prev(); });
    $('[data-simpan]', c).onclick = e => sibuk(e.currentTarget, async () => {
      if (!/\{URUT(:\d)?\}/.test(fmt.value)) return toast('Format wajib memuat {URUT} atau {URUT:3}.', 'warn');
      const x = await api('nomor.simpan', { kode, data: { format: fmt.value.trim(), lingkup: $('[data-lk]', c).value, reset: $('[data-rs]', c).value } });
      if (!x.success) return galat(x);
      toast('Format nomor ' + kode + ' tersimpan.'); muatNomor(el, x);
    });
    $$('[data-kor]', c).forEach(b => b.onclick = () => {
      modal({
        judul: 'Koreksi urut ' + b.dataset.kor, ikon: 'hash', isi: '<p class="small">Gunakan hanya bila nomor fisik sudah terpakai di luar aplikasi. Nomor berikutnya = urut terakhir + 1. Perubahan tercatat di Audit Log.</p><div class="field mt12"><label>Urut terakhir</label><input type="number" min="0" max="99999" data-u value="' + esc(b.parentElement.querySelector('.mono').textContent) + '"></div>',
        tombol: [{ teks: 'Batal' }, { teks: 'Simpan koreksi', cls: 'btn-primary', aksi: async (t, w) => { const x = await api('nomor.simpan', { kode, data: { koreksi: { kunci: b.dataset.kor, urut: Number($('[data-u]', w).value) } } }); if (!x.success) { galat(x); return false; } toast('Urut dikoreksi.'); muatNomor(el, x); return true; } }]
      });
    });
  });
}
