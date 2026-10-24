# SIM Tata Usaha — SMA Negeri 1 Kolaka Timur

Tampilan (frontend) Sistem Informasi Manajemen Tata Usaha: arsip surat masuk/keluar, disposisi, mutasi siswa, SPMB, GTK, cuti, pembuatan dokumen resmi bernomor dengan QR verifikasi, notifikasi WhatsApp/Email, dan CRM kontak.

- Frontend statis (HTML/CSS/JS murni) — ditayangkan lewat **GitHub Pages**.
- Server: **Google Apps Script** sebagai REST API JSON, data di Google Sheets & Google Drive.
- Folder ini **tidak berisi rahasia apa pun**. Satu-satunya pengaturan adalah alamat server di `js/config.js`.

## Struktur

```
index.html      halaman utama (harus berada di akar repository)
css/app.css     tampilan
js/config.js    ← isi API_URL dengan URL Web App Apps Script (/exec)
js/*.js         logika aplikasi
```

## Pemasangan

Lihat **PANDUAN-INSTALASI.md** (langkah lengkap: Apps Script → GitHub Pages → login pertama).

Pembaruan tampilan setelah mengubah berkas:

```bash
git add .
git commit -m "Perbarui tampilan"
git push
```

---
Kelas @khoirulfajarid · khoirulfajar.abughazi@gmail.com
