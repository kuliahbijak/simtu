# Panduan Instalasi SIM Tata Usaha
### SMA Negeri 1 Kolaka Timur · versi 1.0.0

Panduan ini ditulis untuk operator yang **belum pernah** memakai Apps Script atau GitHub. Ikuti urutannya dari atas ke bawah, jangan melompat. Perkiraan waktu: **45–60 menit** untuk pemasangan pertama.

---

## Isi paket

| Berkas | Untuk apa | Ke mana |
|---|---|---|
| `Kode.gs`, `Modul.gs`, `Berkas.gs`, `DE_QrLib.gs`, `MesinDokumen.gs`, `DokumenTU.gs`, `Notifikasi.gs`, `CRM.gs`, `Migrasi.gs` | Server (backend) | Disalin-tempel ke editor **Google Apps Script** |
| `appsscript.json` | Pengaturan proyek Apps Script (zona waktu, izin, Drive API) | Disalin-tempel ke editor Apps Script |
| `simtu-frontend.zip` | Tampilan aplikasi (frontend) | Diekstrak lalu diunggah ke **GitHub Pages** |
| `PANDUAN-INSTALASI.md` | Panduan ini (salinannya juga ada di dalam ZIP) | Dibaca |

## Mana yang otomatis, mana yang Anda kerjakan

| Otomatis (dikerjakan `setupAppEnvironment`) | Manual (Anda kerjakan sekali) |
|---|---|
| Membuat spreadsheet database + semua sheet & kolom | Membuat proyek Apps Script & menempel kode |
| Membuat folder Google Drive & subfolder per modul | Menjalankan setup & memberi izin |
| Membuat rahasia internal (kunci sesi, salt, hash sandi) di Script Properties | Deploy Web App & menyalin URL `/exec` |
| Membuat akun Admin pertama + akses darurat (sandi acak) | Mengisi `js/config.js` & unggah ke GitHub Pages |
| Membuat 6 template dokumen bawaan + register penomoran | Mengisi identitas sekolah, pejabat penanda tangan, logo |
| Memasang trigger (antrean notifikasi tiap menit, tugas per jam, backup harian) | (Opsional) Token Fonnte WA & Client ID login Google |
| Mengisi master data, pengaturan, matriks notifikasi bawaan | (Opsional) Impor data lama |

> **Prinsip keamanan yang dipakai aplikasi ini:** semua rahasia (token Fonnte, kunci sesi, hash sandi, ID spreadsheet/folder) **hanya** disimpan di *Script Properties*. Tidak ada rahasia di kode, di spreadsheet, maupun di frontend. Karena itu berkas frontend aman diunggah ke repository GitHub publik.

---

## BAGIAN A — Memasang Server (Google Apps Script)

Pakai akun Google **milik sekolah/operator** yang akan menjadi pemilik data. Semua spreadsheet dan berkas Drive akan tersimpan di akun ini.

### A1. Buat proyek baru

1. Buka **https://script.google.com** → klik **New project** (Proyek baru).
2. Klik judul "Untitled project" di kiri atas → ganti menjadi **SIM TU SMANSA Koltim API** → **Rename**.

### A2. Tampilkan dan isi `appsscript.json`

1. Klik ikon **⚙ Project Settings** (Setelan proyek) di sidebar kiri.
2. Centang **Show "appsscript.json" manifest file in editor**.
3. Kembali ke **‹› Editor**. Sekarang terlihat berkas `appsscript.json`.
4. Buka berkas `appsscript.json` dari paket ini dengan Notepad → **Ctrl+A**, **Ctrl+C**.
5. Di editor Apps Script, klik `appsscript.json` → **Ctrl+A** → **Ctrl+V** (timpa semua isinya) → **Ctrl+S**.

### A3. Tempel 9 berkas kode

1. Berkas bawaan `Code.gs`: klik titik tiga di sampingnya → **Rename** → ketik `Kode` → Enter.
2. Buka `Kode.gs` dari paket dengan Notepad → **Ctrl+A**, **Ctrl+C** → di editor klik `Kode.gs` → **Ctrl+A** → **Ctrl+V** → **Ctrl+S**.
3. Untuk setiap berkas berikutnya, klik **＋** di samping tulisan *Files* → **Script** → ketik namanya **tanpa** `.gs` → Enter, lalu tempel isinya dan simpan:

   - [ ] `Modul`
   - [ ] `Berkas`
   - [ ] `DE_QrLib`
   - [ ] `MesinDokumen`
   - [ ] `DokumenTU`
   - [ ] `Notifikasi`
   - [ ] `CRM`
   - [ ] `Migrasi`

> Urutan berkas di editor **tidak berpengaruh**. Yang penting ke-9 berkas `.gs` ada semua dan isinya lengkap (pastikan **Ctrl+A** sebelum menyalin, karena beberapa berkas cukup panjang).

### A4. Pastikan Drive API aktif

Di sidebar kiri, bagian **Services**, harus terlihat **Drive**. Biasanya sudah otomatis muncul karena `appsscript.json`. Kalau belum: klik **＋** di samping *Services* → pilih **Drive API** → versi **v3** → **Add**.

### A5. Jalankan setup (aman diulang)

1. Di toolbar atas, pilih fungsi **`setupAppEnvironment`** dari menu tarik-turun → klik **▶ Run**.
2. Muncul **Authorization required** → **Review permissions** → pilih akun Google Anda.
3. Muncul layar *"Google hasn't verified this app"* — ini **normal** untuk skrip buatan sendiri. Klik **Advanced** → **Go to SIM TU SMANSA Koltim API (unsafe)** → **Allow**.
4. Tunggu sampai **Execution log** menampilkan `✅ Setup selesai.` (sekitar 1–3 menit).

**Wajib — catat sekarang juga.** Di Execution log ada dua kredensial yang **hanya tampil sekali**:

```
🔑 AKUN ADMIN PERTAMA (catat sekarang — hanya tampil sekali)
   Email      : (email akun Google Anda)
   Kata sandi : ************   (wajib diganti saat login pertama)
...
🔐 AKSES DARURAT (catat sekarang — hanya tampil sekali, wajib dirotasi setelah login pertama)
   Nama pengguna: darurat
   Kata sandi   : ****************
```

Salin keduanya ke tempat aman (buku catatan fisik/pengelola sandi). **Jangan** simpan di spreadsheet, grup WA, atau email.

> - Kalau log berhenti dengan `⚠️ Template dokumen belum dibuat` atau *Exceeded maximum execution time*, cukup **Run `setupAppEnvironment` sekali lagi**. Setup aman diulang: tidak menggandakan data dan **tidak** menimpa rahasia yang sudah ada.
> - Kalau sandi terlanjur tidak tercatat: jalankan fungsi **`resetSandiAdmin`** (sandi Admin baru tampil di log) atau **`resetAksesDarurat`**.

### A6. Deploy sebagai Web App

1. Klik **Deploy** (kanan atas) → **New deployment**.
2. Klik ikon **⚙** di samping *Select type* → pilih **Web app**.
3. Isi:

   | Kolom | Nilai |
   |---|---|
   | Description | `v1.0.0` |
   | Execute as | **Me** (akun Anda) |
   | Who has access | **Anyone** |

4. Klik **Deploy** → salin **Web app URL** (berakhiran **`/exec`**). Simpan di Notepad.

**Uji cepat:** tempel URL itu di tab browser baru lalu tambahkan `?action=publicConfig` di belakangnya, contoh
`https://script.google.com/macros/s/AKfy...xyz/exec?action=publicConfig`
Hasil benar: teks JSON yang diawali `{"success":true,...`.

> **"Anyone" aman?** Ya. "Anyone" hanya berarti URL bisa *dipanggil*. Setiap permintaan data tetap wajib membawa token sesi yang sah; tanpa login, server hanya menjawab info publik (nama sekolah, logo) dan verifikasi QR dokumen.

### A7. Cara memperbarui kode di kemudian hari (URL tetap sama)

Setelah mengganti isi berkas `.gs`:
1. **Deploy → Manage deployments** → klik ikon **✏ pensil** pada deployment yang ada.
2. Kolom **Version** → pilih **New version** → **Deploy**.
3. Jalankan fungsi **`upgradeSkema`** sekali (menambah kolom baru bila ada, data lama tidak berubah).

> ⚠️ **Jangan** memakai *New deployment* untuk pembaruan — itu membuat URL `/exec` baru, sehingga `js/config.js` harus diganti dan diunggah ulang.

---

## BAGIAN B — Memasang Tampilan (GitHub Pages)

### B1. Ekstrak ZIP dan isi alamat server

1. Klik kanan `simtu-frontend.zip` → **Extract All…** → ekstrak ke, misalnya, `Documents`.
   Hasilnya folder **`Documents\simtu-frontend`** yang isinya langsung:
   ```
   simtu-frontend\
   ├── index.html          ← harus terlihat di sini
   ├── README.md
   ├── PANDUAN-INSTALASI.md
   ├── css\
   │   └── app.css
   └── js\
       ├── config.js        ← satu-satunya berkas yang Anda ubah
       ├── core.js, ui.js, app.js, icons.js
       └── pages-*.js
   ```
2. Buka `js\config.js` dengan **Notepad** (klik kanan → Open with → Notepad).
3. Ganti baris:
   ```js
   API_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec',
   ```
   dengan URL `/exec` dari langkah A6 (tetap di antara tanda kutip satu `'...'`). Simpan (**Ctrl+S**).

> Kalau `API_URL` belum diisi, aplikasi akan menampilkan layar **"Alamat API belum diatur"** — itu tanda langkah ini terlewat.

### B2. Pasang Git (sekali per komputer)

- **Windows:** unduh dari **https://git-scm.com/download/win** → install dengan pilihan bawaan (Next terus).
- **Mac:** buka Terminal, ketik `git --version` — macOS menawarkan instalasi bila belum ada.

Buka **PowerShell** (Windows) atau **Terminal** (Mac), lalu cek:
```bash
git --version
```
Hasil benar: `git version 2.x.x`.

Atur identitas (sekali saja seumur komputer itu):
```bash
git config --global user.name "Nama Operator TU"
git config --global user.email "email-akun-github@contoh.com"
```
> `user.name` hanya label riwayat perubahan, bukan username GitHub.

### B3. Buat akun & repository GitHub

1. Daftar di **https://github.com** (kalau belum punya). Username akan menjadi bagian alamat situs: `https://USERNAME.github.io/...` — pilih yang rapi, misal `tu-smansakoltim`.
2. Klik **＋** (kanan atas) → **New repository**.
3. **Repository name:** `simtu` (boleh lain, huruf kecil tanpa spasi).
4. Pilih **Public** (wajib untuk GitHub Pages gratis — aman, frontend tidak memuat rahasia).
5. **Jangan** centang *Add a README*, *.gitignore*, maupun *license*.
6. **Create repository**. Biarkan halaman itu terbuka.

### B4. Masuk ke folder yang BENAR (langkah paling penting)

Folder kerja Anda adalah **`simtu-frontend`** — folder yang **langsung** berisi `index.html`. Bukan folder di atasnya, bukan folder `css` atau `js`.

> 💡 Cara cepat (Windows): buka folder `simtu-frontend` di File Explorer → klik address bar → ketik `powershell` → Enter. PowerShell terbuka tepat di folder itu.

Cara manual:
```powershell
cd "$HOME\Documents\simtu-frontend"
```

Lalu periksa isinya:
```powershell
dir
```
Yang **harus** terlihat: `css`, `js`, `index.html`, `PANDUAN-INSTALASI.md`, `README.md`.

> ⛔ **Berhenti di sini kalau `index.html` tidak terlihat.** Kalau yang muncul hanya satu folder `simtu-frontend`, berarti Anda satu tingkat terlalu tinggi — jalankan `cd simtu-frontend` lalu `dir` lagi. Git akan menerima folder yang salah tanpa protes, dan hasilnya situs **404** tanpa pesan error apa pun.
>
> Pastikan juga **tidak ada** berkas `.gs` di folder ini (berkas `.gs` hanya untuk Apps Script).

### B5. Kirim ke GitHub

Jalankan **satu per satu**, perhatikan hasilnya:

```bash
git init
```
→ `Initialized empty Git repository in ...`

```bash
git add .
```
→ (tidak ada keluaran = berhasil). Perhatikan **titik** di akhir perintah.

```bash
git commit -m "Upload pertama SIM TU"
```
→ muncul daftar `create mode 100644 index.html`, dst.

```bash
git branch -M main
git remote add origin https://github.com/USERNAME/simtu.git
```
Ganti `USERNAME` dan `simtu` sesuai milik Anda (salin dari halaman repository yang masih terbuka).

```bash
git push -u origin main
```
Saat diminta:
- **Username:** username GitHub Anda
- **Password:** tempel **Personal Access Token** (lihat B6), **bukan** sandi akun GitHub.

> Saat menempel token, **layar tetap kosong** — tidak muncul karakter atau bintang. Itu normal. Di PowerShell, tempel dengan **klik kanan**, lalu tekan **Enter**.
>
> Di Windows, sering muncul jendela *"Connect to GitHub"* → pilih **Sign in with your browser** → Authorize. Itu juga cara yang benar dan tidak memerlukan token.

Tanda berhasil: `Writing objects: 100%` dan `* [new branch] main -> main`.

### B6. Membuat Personal Access Token (kalau diminta password)

Pesan `Password authentication is not supported` artinya GitHub meminta token:
1. Buka **https://github.com/settings/tokens** → **Generate new token** → **Generate new token (classic)**.
2. **Note:** `simtu-push` · **Expiration:** 90 days · centang scope **repo**.
3. **Generate token** → salin token (`ghp_…`) — **hanya tampil sekali**.
4. Ulangi `git push -u origin main`, tempel token sebagai password.

Alternatif tanpa terminal: **GitHub Desktop** (https://desktop.github.com) → *File → Add Local Repository* → pilih folder `simtu-frontend` → *Publish repository* (hilangkan centang *Keep this code private*).

### B7. Aktifkan GitHub Pages

1. Buka repository di github.com. Pastikan di halaman depannya terlihat `index.html`, folder `css` dan `js` (bukan folder `simtu-frontend` atau `frontend`).
2. **Settings** → menu kiri **Pages**.
3. **Source:** *Deploy from a branch* · **Branch:** `main` · folder **`/ (root)`** → **Save**.
4. Tunggu 1–2 menit, muat ulang halaman. Akan muncul **"Your site is live at https://USERNAME.github.io/simtu/"**.
5. Centang **Enforce HTTPS** (bila tersedia).

### B8. Memperbarui tampilan di kemudian hari

Dari folder `simtu-frontend`:
```bash
git add .
git commit -m "Perbarui tampilan"
git push
```
Tunggu 1–2 menit, lalu buka situs dengan **Ctrl+Shift+R** (muat ulang tanpa cache).

---

## BAGIAN C — Login Pertama & Pengaturan Awal

### C1. Login Admin (wajib dari alamat GitHub Pages)

1. Buka **https://USERNAME.github.io/simtu/** (alamat dari B7).
2. Masuk dengan **email + kata sandi Admin** dari Execution log (A5).
3. Aplikasi meminta **ganti sandi** → buat sandi baru minimal 8 karakter berisi huruf dan angka.

> Login Admin pertama dari alamat `https://` ini sekaligus **mencatat alamat aplikasi** untuk QR verifikasi dokumen dan tautan di notifikasi. Jangan login pertama kali dari berkas yang dibuka langsung di komputer (`file://`).

### C2. Rotasi akses darurat (wajib)

Akses darurat dipakai **hanya** bila semua Admin tidak bisa masuk. Sandi dari Execution log sudah pernah terlihat di layar, jadi wajib diganti:
1. **Pengaturan → Keamanan & Login** → kartu *Akses darurat*.
2. Isi **Sandi darurat baru** (minimal 12 karakter, berisi huruf dan angka) → **Ganti sandi darurat**.
3. Catat sandi itu di tempat aman yang offline. Status kartu berubah dari *Wajib dirotasi* menjadi *Siap*.

> Akses darurat terkunci **15 menit** setelah 5 kali salah, dan setiap percobaan tercatat di Audit Log (tanpa sandinya). Halamannya: `https://USERNAME.github.io/simtu/#/darurat`.

### C3. Identitas sekolah & kop surat

**Pengaturan → Sekolah & Kop**: nama & singkatan sekolah, NPSN, baris kop (Pemerintah Provinsi, Dinas), alamat, kota penandatanganan, telepon, email, laman, **kode sekolah pada nomor surat**, tahun ajaran, lalu **unggah logo**. Data ini dipakai di kop semua dokumen yang diterbitkan.

### C4. Penanda tangan, penomoran, dan template

Menu **Template & Penomoran** punya tiga tab:
- **Penanda Tangan** → **Tambah Pejabat**: Kepala Sekolah (nama, gelar, NIP, jabatan, masa jabatan) dan pejabat lain. Spesimen TTD (PNG transparan) opsional; bawaannya dokumen dicetak dengan ruang **TTD basah** + QR verifikasi.
- **Penomoran Surat**: format nomor per register. Bawaan Surat Keluar: `{KLASIFIKASI}/{URUT:3}/{KODE_SEKOLAH}/{TAHUN}` (contoh `005/001/SMAN1/KT/2026`). Penanda lain yang bisa dipakai: `{BULAN}`, `{BULAN_ROMAWI}`. Atur juga nomor awal dan periode reset. Nomor yang sudah terpakai tidak pernah dipakai ulang.
- **Template**: 6 template bawaan siap pakai — Surat Keluar Dinas, Lembar Disposisi, Surat Keterangan Pindah Sekolah, Surat Keterangan Menerima Siswa Pindahan, Buku Agenda Surat Masuk, Buku Agenda Surat Keluar. Klik **Edit desain** untuk mengubah tata letak di Google Docs/Sheets, lalu **Pindai ulang** agar penanda `{{...}}` baru terbaca sebagai isian form.

### C5. Akun staf Tata Usaha

**Kelola Pengguna → Tambah Pengguna**: nama, email, No. HP, peran **Staf Tata Usaha**, centang **izin modul** yang boleh diakses (mis. hanya Surat Masuk/Keluar).
Sandi awal tampil **sekali** di layar — sampaikan langsung ke staf. Bila pengiriman Email aktif (C6), sandi awal juga dikirim ke email staf. Staf wajib menggantinya saat login pertama.

### C6. (Opsional) Notifikasi WhatsApp & Email

**Notifikasi WA & Email → Pengaturan**:
1. Daftar di **https://fonnte.com** → hubungkan nomor WA sekolah (menu *Device* → scan QR dari WhatsApp → *Perangkat tertaut*).
2. Salin **token** device dari dashboard Fonnte → tempel di kolom **Token Fonnte** → **Simpan**. Token disimpan di Script Properties dan tidak pernah ditampilkan utuh lagi.
3. Nyalakan **Kirim WhatsApp** dan/atau **Kirim Email**. Email dikirim dari Gmail pemilik skrip (kuota harian Google: ±100/hari untuk Gmail biasa, lebih besar untuk Google Workspace).
4. Tab **Matriks Event**: pilih peristiwa mana yang mengirim WA/Email ke siapa.
5. Tab **Antrean**: pantau pesan yang terkirim/gagal. Pesan dikirim trigger tiap menit, jadi tidak memperlambat aplikasi.

### C7. (Opsional) Login dengan akun Google

1. Buka **https://console.cloud.google.com** (akun yang sama) → buat proyek baru, misal `simtu-login`.
2. Menu **APIs & Services → OAuth consent screen** (atau *Google Auth Platform*): tipe **External**, isi nama aplikasi `SIM TU SMANSA Koltim` dan email dukungan → simpan. Di bagian **Audience/Publishing status** klik **Publish app** (agar semua akun Google sekolah bisa masuk, bukan hanya *test users*).
3. **Credentials → Create credentials → OAuth client ID** → *Application type*: **Web application**.
4. **Authorized JavaScript origins** → **Add URI** → `https://USERNAME.github.io` (hanya domain, **tanpa** `/simtu/` dan tanpa garis miring di akhir). *Authorized redirect URIs* dikosongkan.
5. **Create** → salin **Client ID** (`1234…-abcd….apps.googleusercontent.com`).
6. Di aplikasi: **Pengaturan → Keamanan & Login** → tempel di **OAuth Client ID (Web)** → **Simpan Client ID** → nyalakan **Tampilkan tombol "Masuk dengan Google"** → **Simpan**. Kolom *Batasi ke domain* boleh diisi (mis. `sekolah.sch.id`) agar hanya akun berdomain itu yang bisa masuk.

> Login Google hanya menerima email yang **sudah terdaftar dan aktif** di *Kelola Pengguna*. Server memverifikasi token Google (penerbit, audiens, email terverifikasi, masa berlaku) sebelum memberi sesi.

### C8. (Opsional) Impor data lama

**Impor & Backup → Impor Excel/CSV** (atau **Dari Spreadsheet Lama**):
1. Pilih **Modul tujuan** → pilih berkas. Baris judul dan nama kolom dikenali otomatis (mis. "No. Surat", "Pengirim").
2. Klik **Pindai (uji coba)** — belum ada data yang ditulis; periksa ringkasan baris baru, berubah, sama, dan dilewati beserta alasannya.
3. Bila sesuai, klik **Jalankan impor**. Backup otomatis dibuat sebelum impor. Impor aman diulang: baris yang sama tidak digandakan. Impor bisa dibatalkan dari tab *Riwayat Impor* → **Batalkan**.

### C9. Periksa trigger

Di editor Apps Script, ikon **⏰ Triggers** harus berisi `tugasMenit`, `tugasJam`, dan `onSheetChange`. Bila kosong, pilih fungsi **`pasangTrigger`** → **Run**.

---

## BAGIAN D — Keamanan (wajib dibaca Kepala TU & operator)

1. **Batasi editor Apps Script.** Siapa pun yang bisa membuka editor skrip bisa membaca Script Properties. Jangan bagikan proyek Apps Script ke akun lain.
2. **Jangan bagikan** spreadsheet database dan folder Drive *SIM TU SMANSA Kolaka Timur* secara publik ("Anyone with the link"). Aplikasi membaca berkas lewat akun pemilik; pengguna melihat berkas hanya setelah login.
3. **Jangan pernah** menulis token/sandi di spreadsheet, kode, `config.js`, grup WA, atau email.
4. **Curiga sesi bocor?** Jalankan fungsi **`rotasiSecretSesi`** di editor → semua pengguna otomatis keluar dan harus login ulang.
5. **Pengguna keluar dari sekolah?** *Kelola Pengguna* → nonaktifkan → semua sesinya langsung berakhir.
6. Data pribadi siswa (NISN, tanggal lahir, nama ibu kandung) hanya tampil utuh bagi pengguna berizin; selain itu tersamar.
7. **Backup** otomatis dibuat setiap hari pukul 01.00 WITA (tab *Backup & Pulihkan*), dan bisa dibuat manual kapan saja.

## BAGIAN E — Fungsi pemeliharaan di editor Apps Script

| Fungsi | Kapan dijalankan |
|---|---|
| `setupAppEnvironment` | Pemasangan pertama (aman diulang) |
| `upgradeSkema` | Setelah memperbarui kode `.gs` |
| `pasangTrigger` | Trigger hilang/terhapus |
| `resetSandiAdmin` | Semua Admin lupa sandi (sandi sementara tampil di log) |
| `resetAksesDarurat` | Sandi darurat hilang |
| `rotasiSecretSesi` | Paksa semua pengguna keluar |
| `cekPerforma` | Melihat status cache, trigger, dan ukuran Script Properties |
| `matikanKeepWarm` / `nyalakanKeepWarm` | Menghemat/menyalakan pemanas cache (bawaan: nyala) |
| `backupHarian` | Membuat backup manual sekarang |

---

## BAGIAN F — Mengatasi masalah

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| Layar **"Alamat API belum diatur"** | `js/config.js` belum diisi | Isi `API_URL` (B1), lalu `git add .` → `git commit -m "isi config"` → `git push` |
| **"Koneksi terputus"** atau **"Server membalas tidak terduga"** padahal internet lancar | URL salah (mis. berakhiran `/dev`), atau *Who has access* bukan **Anyone** | Ulangi A6; pastikan URL berakhiran `/exec` dan uji `?action=publicConfig` |
| Perubahan kode `.gs` tidak berlaku | Belum membuat versi baru | A7: Manage deployments → ✏ → **New version** |
| Situs GitHub **404 File not found** | `git init` dijalankan di folder yang salah | Lihat "Salah folder" di bawah |
| Halaman tampil polos tanpa warna | Folder `css/` & `js/` tidak ikut (diunggah lewat web GitHub) | Selalu unggah lewat terminal (B5); jangan pakai *Upload files* di situs GitHub |
| Situs masih versi lama | Cache browser | **Ctrl+Shift+R** atau jendela Incognito |
| `Password authentication is not supported` | GitHub meminta token | B6 |
| `remote origin already exists` | `git remote add` sudah pernah dijalankan | Lewati, lanjut `git push` |
| `src refspec main does not match any` | Belum ada commit | Jalankan `git add .` dan `git commit ...` dulu |
| Tombol **Masuk dengan Google** tidak muncul | Client ID belum diisi / tombol belum dinyalakan | C7 langkah 6, lalu muat ulang halaman login |
| Google: **Error 400: origin_mismatch** | *Authorized JavaScript origins* tidak sama dengan alamat situs | Isi persis `https://USERNAME.github.io` (tanpa path), tunggu ±5 menit |
| "Email … belum terdaftar sebagai pengguna SIM TU" | Email belum ditambahkan di *Kelola Pengguna* | Tambahkan pengguna dengan email Google yang sama |
| WA tidak terkirim | Token salah, device Fonnte terputus, WA dimatikan, atau trigger hilang | Cek tab *Antrean* (pesan galat), dashboard Fonnte, lalu `pasangTrigger` |
| QR dokumen hanya berisi kode, tanpa tautan | Alamat aplikasi belum tercatat | Login Admin sekali dari alamat GitHub Pages, atau isi *Alamat aplikasi* di Notifikasi → Pengaturan |
| Akses darurat "terkunci" | 5 kali salah sandi | Tunggu 15 menit, atau jalankan `resetAksesDarurat` |
| Permintaan pertama pagi hari agak lambat (2–5 detik) | Server Google "bangun" dari kondisi dingin | Normal; pemanas cache (`tugasMenit`) menjaga server tetap hangat selama jam kerja |
| Setup berhenti: *Exceeded maximum execution time* | Batas 6 menit Apps Script | Jalankan `setupAppEnvironment` sekali lagi (melanjutkan, tidak menggandakan) |

**Salah folder yang di-push (404):** jangan hapus repository. Masuk ke folder yang benar lalu timpa:
```powershell
cd "$HOME\Documents\simtu-frontend"
dir                       # wajib terlihat index.html, css, js
git init
git add .
git commit -m "Perbaikan: push dari folder yang benar"
git branch -M main
git remote add origin https://github.com/USERNAME/simtu.git
git push -u origin main --force
```
`--force` menimpa isi repository dengan isi folder Anda — aman di sini karena isi lama memang strukturnya salah.

---

## Istilah singkat

- **Apps Script** — tempat kode server berjalan, gratis di akun Google.
- **Script Properties** — brankas rahasia milik proyek Apps Script, tidak terlihat dari luar.
- **Deployment / URL `/exec`** — alamat server yang dipanggil aplikasi.
- **Repository** — folder proyek di GitHub. **Commit** — menyimpan perubahan dengan catatan. **Push** — mengirim perubahan ke GitHub.
- **Personal Access Token** — "sandi khusus" GitHub untuk mengirim berkas lewat terminal.
- **GitHub Pages** — layanan GitHub yang menayangkan folder repository sebagai situs web.

---

Kelas @khoirulfajarid · khoirulfajar.abughazi@gmail.com
