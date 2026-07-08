# INSTRUKSI PENGEMBANGAN WEBSITE HRIS (HUMAN RESOURCE INFORMATION SYSTEM)

> Dokumen ini adalah **spesifikasi teknis & fungsional lengkap** untuk pengembangan sistem HRIS berbasis web (Website Depan/Portal Karyawan + Dashboard CMS Admin). Gunakan dokumen ini sebagai acuan utama (source of truth) saat membangun sistem, baik oleh AI coding assistant maupun tim developer.

---

## 1. RINGKASAN PROYEK

Sistem HRIS ini mencakup 2 aplikasi dalam satu codebase (atau monorepo):

1. **Portal Karyawan (Employee Portal)** — akses untuk Staff, SPV/Atasan, HRD, Audit, Direksi, GA, dan role custom lainnya.
2. **Dashboard CMS (Admin Panel)** — untuk Superadmin & role dengan hak konfigurasi, mengatur seluruh parameter sistem (master data, aturan bisnis, approval flow, dsb).

Sistem harus **sangat konfigurable** — hampir semua aturan bisnis (jam kerja, kuota cuti, approval flow, toleransi telat, dsb) **tidak boleh di-hardcode**, melainkan diatur lewat CMS dan disimpan sebagai *configuration/settings* di database.

---

## 2. TECH STACK

| Kebutuhan | Teknologi |
|---|---|
| Framework | Next.js (App Router, hybrid SSR/CSR/SSE) |
| Database | MongoDB (Mongoose ODM) |
| Styling | Tailwind CSS + shadcn/ui |
| Animasi | Framer Motion (utama) + GSAP (untuk animasi kompleks/scroll-based) |
| Auth | NextAuth.js / Auth.js — Credentials (email+password) + Google OAuth + 2FA (TOTP) |
| API | RESTful API (Next.js Route Handlers), didokumentasikan dengan **Scalar API Reference** (lebih modern dari Swagger UI, generate dari OpenAPI spec) atau Swagger jika tim lebih familiar |
| File/Image Storage | **Multi-provider, dipilih via ENV** (lihat detail di bawah) — arsitektur pakai storage adapter/abstraction agar tidak vendor-locked |
| Peta/Geolocation | **OpenStreetMap** + **Leaflet.js** (open source, gratis) untuk pin lokasi kantor & reverse geocoding via **Nominatim** (self-host jika volume tinggi) |
| Face Recognition | **face-api.js** (client-side, berbasis TensorFlow.js) — proses di browser dulu, fallback manual foto |
| Notifikasi | Email (Resend/Nodemailer + SMTP) wajib; WhatsApp (Fonnte/WA Business API/Twilio WA) — opsional, on/off dari CMS |
| Bot Protection | Cloudflare Turnstile pada form publik (form lamaran kerja, login) |
| Hosting | Vercel (awal) → arsitektur harus portable ke VPS/self-hosted (hindari fitur yang vendor-locked ke Vercel, misal gunakan `node-cron`/queue eksternal, bukan hanya Vercel Cron) |
| Job Queue/Scheduler | BullMQ + Redis (untuk reminder kontrak habis, notifikasi ulang tahun, cron generate slip gaji, dsb) |
| Cache | Redis (session, rate-limit, cache query berat) |
| Realtime | Server-Sent Events (SSE) untuk notifikasi in-app realtime (approval masuk, dsb) |
| Testing | Jest/Vitest (unit), Playwright (e2e) |

---

### 2.1 Storage Adapter — Multi-Provider via ENV (Free/Open-Source Friendly)

Storage **tidak boleh di-hardcode ke satu vendor**. Buat 1 interface `StorageProvider` (`upload()`, `getUrl()`, `getSignedUrl()`, `delete()`) di `lib/storage/`, lalu buat implementasi adapter per provider. Provider aktif dipilih lewat **1 env variable** (`STORAGE_PROVIDER`), sisanya tinggal isi credential sesuai provider yang dipakai — provider lain dikosongkan saja.

```env
# Pilih salah satu: local | cloudinary | supabase | r2 | minio | b2
STORAGE_PROVIDER=cloudinary

# --- LOCAL (disk VPS, gratis, cocok saat awal/dev) ---
LOCAL_STORAGE_PATH=/var/www/hris/uploads

# --- CLOUDINARY (free tier ~25GB storage & bandwidth/bulan, mudah, ada image transform bawaan) ---
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# --- SUPABASE STORAGE (open source, free tier 1GB, self-host juga bisa) ---
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=

# --- CLOUDFLARE R2 (S3-compatible, free tier 10GB, tanpa egress fee) ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

# --- MINIO (open source, self-hosted 100% gratis di VPS sendiri, S3-compatible) ---
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=

# --- BACKBLAZE B2 (S3-compatible, free tier 10GB, storage murah) ---
B2_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET=
```

**Rekomendasi per skenario:**
- **Development/awal proyek (paling free & simpel):** `local` (disk biasa) — cocok karena hosting awal masih fleksibel dan belum banyak data.
- **Production di Vercel (serverless, tidak punya disk permanen):** `cloudinary` (gratis, generous free tier, sudah termasuk image resize/optimize otomatis — pas untuk foto absensi & foto profil) atau `supabase` (open source, ada Postgres+Auth+Storage sekaligus kalau butuh nanti).
- **Kalau nanti pindah ke VPS sendiri:** `minio` — 100% open source, self-hosted, tidak ada biaya bulanan sama sekali, API-nya S3-compatible sehingga kode tidak perlu diubah (tinggal ganti ENV), atau tetap pakai `r2`/`b2` kalau ingin tetap di cloud managed.
- Semua adapter mengimplementasikan interface yang sama → **ganti provider = ganti ENV, tanpa ubah kode aplikasi.**
- Untuk dokumen sensitif (KTP, NPWP, slip gaji, foto absensi), gunakan `getSignedUrl()` dengan expiry pendek (misal 5–15 menit) di semua provider yang mendukungnya (Cloudinary signed URL, Supabase signed URL, R2/MinIO/B2 presigned URL S3) — jangan pernah expose URL publik permanen untuk file sensitif.

---

## 3. ARSITEKTUR & PRINSIP PENGEMBANGAN

- **Clean Architecture**: pisahkan layer `presentation (UI)` → `application (use-case/service)` → `domain (business rules)` → `infrastructure (DB, storage, email, dll)`.
- **Modular monolith**: folder per domain/modul (`/modules/attendance`, `/modules/leave`, `/modules/recruitment`, dst), masing-masing punya `model`, `service`, `controller/route`, `validation (zod)`, `repository`.
- **Middleware wajib** di setiap request API: auth check → role/permission check → rate limit → validasi input (zod) → logging.
- **Idempotency**: setiap POST yang sensitif (submit absen, submit izin, generate slip gaji, kirim notifikasi) wajib menerima `Idempotency-Key` header untuk mencegah duplikasi akibat double-submit/network retry.
- **No N+1 Query**: gunakan `.populate()` MongoDB secara selektif, atau aggregation pipeline (`$lookup`) untuk data relasional; hindari query di dalam loop.
- **Pagination**: wajib di semua list endpoint (cursor-based untuk data besar seperti log & histori absensi; offset-based untuk data master kecil).
- **Lazy loading & code splitting**: `next/dynamic` untuk komponen berat (peta, chart, kamera/face recognition).
- **Skeleton loading** di semua halaman list/detail (bukan spinner polos).
- **SSR** untuk halaman butuh SEO/first-load cepat (landing page career, halaman publik), **CSR** untuk dashboard interaktif, **SSE** untuk notifikasi realtime.
- **Audit Log** wajib untuk: login/logout, perubahan data karyawan sensitif (gaji, rekening, NPWP), approval/rejection (semua jenis), perubahan setting CMS, generate/download slip gaji, export data, perubahan role/permission. Simpan: siapa, aksi apa, data sebelum/sesudah (diff), IP, user agent, timestamp.
- **Security**:
  - Password hashing: bcrypt/argon2.
  - Rate limiting per endpoint (khusus login, forgot password, submit form publik).
  - CSRF protection pada form.
  - Input sanitization & validasi ketat pakai `zod` di setiap endpoint (jangan percaya input client).
  - Enkripsi data sensitif at-rest untuk field seperti NIK, NPWP, no. rekening (`AES-256`), bukan disimpan plaintext.
  - Signed URL + short expiry untuk akses dokumen/foto pribadi di storage (bukan public URL permanen).
  - 2FA (TOTP, misal via `otpauth` + Google Authenticator/Authy).
  - Cloudflare Turnstile di form publik (career page, login) untuk anti-bot.
  - Anti email-abuse: rate limit pengiriman email per user/per IP, validasi email domain, throttle notifikasi (jangan spam saat approval berjenjang).
  - RBAC granular (dijelaskan di bagian Role & Permission).
  - Semua akses foto/GPS presensi butuh consent & disclaimer (siapkan halaman kebijakan privasi).

---

## 4. ROLE & PERMISSION (RBAC)

### 4.1 Role Default (bisa ditambah dari CMS)
`SUPERADMIN`, `DIREKSI`, `HRD`, `AUDIT`, `GA`, `SPV` (atribut melekat ke karyawan sebagai "atasan divisi", bukan role eksklusif — seorang Staff bisa diberi flag `is_supervisor_of: [divisionId]`), `STAFF` (default, fixed — fiturnya tidak bisa diubah/dikurangi-tambah selain default modul staff).

### 4.2 Model Permission
- Struktur granular: **Module × Action**.
- Actions per module: `read`, `write` (create/update), `delete`, `approve`, `export`.
- Contoh matrix (disimpan sebagai collection `role_permissions` agar dinamis):

| Module | Staff | SPV | HRD | Audit | GA | Direksi | Superadmin |
|---|---|---|---|---|---|---|---|
| Attendance (self) | R/W | R/W | R/W | R | - | R | Full |
| Attendance (team/all) | - | R (divisinya) | R/W (all) | R (all) | - | R | Full |
| Leave Request | R/W (self) | R + Approve (divisi) | R/W + Approve (all) | R + Approve (kondisional) | - | R + Approve (kondisional) | Full |
| Recruitment/ATS | - | R (jika interviewer) | R/W | R | - | R (approval offering) | Full |
| Payroll/Slip Gaji | R (self) | - | R/W (all) | R | - | R | Full |
| KPI | R (self) | R/W (divisi) | R/W (all) + report | R | - | R | Full |
| Contract/PKWT | R (self) | - | R/W | R | - | R (approval) | Full |
| Inventory | R (self) | R (divisi) | R | R | R/W | R | Full |
| CMS Settings | - | - | Sebagian (jika diizinkan) | - | - | - | Full |
| Reports/Analytics | - | R (divisi) | R (all) | R (all) | - | R (all) | Full |

- Superadmin dapat membuat role baru + menyusun matrix permission-nya sendiri per module/action lewat UI checklist di CMS (`Roles & Permissions` menu).
- Middleware `checkPermission(module, action)` dipanggil di setiap route handler API — permission diambil dari DB (bukan hardcode), sehingga perubahan di CMS langsung berlaku tanpa deploy ulang.

---

## 5. MODUL & FITUR DETAIL

### 5.1 Modul Recruitment / ATS

**Tahapan (default, tapi bisa disusun ulang per posisi lewat CMS):**
`Apply → Screening CV → Psikotes → Interview HRD → Interview User → BI Checking → Offering → Onboarding → Induction`

**Fitur CMS:**
- `Recruitment Pipeline Builder`: superadmin/HRD bisa membuat/menghapus/mengurutkan ulang tahapan (stage) per lowongan (drag & drop), termasuk menentukan siapa PIC/approver di tiap tahap.
- Setiap stage punya status: `Pending`, `In Progress`, `Passed`, `Rejected`, `On Hold`.
- Kandidat yang `Rejected` tetap disimpan sebagai riwayat (untuk cek blacklist/reapply), dengan alasan penolakan & catatan.

**Sumber data pelamar:**
1. Form publik di landing page (Career Page) milik sistem ini sendiri.
2. **Public API endpoint** (`POST /api/v1/public/candidates`) dengan API-key untuk menerima submission dari website lain.
3. Form input manual oleh HRD (halaman "Tambah Kandidat").

**Fitur lain:**
- Penjadwalan interview: kalender per interviewer, cek bentrok jadwal, kirim notifikasi (email/WA) ke kandidat & interviewer (link meeting/lokasi & waktu).
- Setelah status `Offering` diterima kandidat → generate **Employee ID** otomatis → data pelamar (nama, kontak, dokumen, hasil tes) **auto-migrate** menjadi data karyawan baru (status: `Onboarding`), HRD bisa edit/lengkapi data yang kurang (termasuk **data gaji** dari hasil negosiasi offering).
- Karyawan baru dapat mengisi/mengedit profil sendiri (data pribadi lanjutan) melalui halaman Profil setelah aktif.
- Setiap kandidat punya "Candidate Timeline" — histori lengkap semua tahapan, siapa yang approve, catatan interview, hasil psikotes (upload file), skor, dsb.

### 5.2 Modul Kontrak Kerja (PKWT/PKWTT)

- **Template Builder** di CMS: HRD/Superadmin membuat template dokumen (PKWT, PKWTT, SPK, dll) dengan placeholder variabel (`{{nama}}, {{jabatan}}, {{gaji_pokok}}, {{tanggal_mulai}}, {{tanggal_berakhir}}`, dst). Sistem generate PDF otomatis dari data karyawan + template.
- Alternatif: HRD bisa upload dokumen manual yang sudah ditandatangani (opsi ini juga bisa di on/off-kan per jenis dokumen dari CMS).
- Status kontrak: `Probation`, `PKWT`, `PKWTT`, `Outsource` (bisa tambah dari CMS).
- **Reminder otomatis** (via job scheduler): H- sekian (configurable di CMS, misal H-30/H-14/H-7) sebelum kontrak berakhir → notifikasi ke karyawan, SPV, dan HRD untuk proses evaluasi/perpanjangan.
- Riwayat semua kontrak per karyawan tersimpan (versioning), termasuk histori perubahan gaji tiap kontrak baru.

### 5.3 Modul Presensi/Absensi

**Komponen Wajib Saat Absen:**
1. Foto — coba **face recognition** (client-side, `face-api.js`) dicocokkan dengan foto referensi karyawan.
   - Jika gagal 3x berturut-turut → fallback ke foto manual biasa, **tapi entry ditandai flag `manual_fallback: true`** agar mudah direview HRD.
2. Deteksi GPS otomatis (browser Geolocation API) + reverse geocoding (Nominatim/OSM) untuk menampilkan alamat.
3. Validasi radius terhadap koordinat kantor/cabang penempatan karyawan (radius default 15 meter, **configurable per cabang** di CMS).
4. Kolom catatan (opsional, free text).

**Aturan Radius & Lokasi:**
- Jika di luar radius kantor: **absen ditolak**, kecuali karyawan mengajukan **izin WFH/Dinas Luar** yang sudah di-approve SPV/HRD sebelumnya (approval dulu, baru bisa absen di luar radius pada rentang tanggal yang disetujui).
- Jika karyawan absen di cabang lain (bukan kantor penempatannya) — tetap bisa absen, tapi **ditandai flag `cross_branch: true`** untuk review HRD.
- **Fitur "Absen Darurat/Lokasi Bermasalah"**: jika GPS device error/tidak akurat/tidak bisa mencapai radius kantor padahal user secara fisik di kantor → sediakan menu "Kendala Lokasi" yang tetap merekam foto + koordinat apa adanya (tanpa validasi radius) + wajib isi catatan alasan → otomatis ditandai `location_override: true` untuk direview HRD/SPV kemudian (approve/reject retroaktif).

**Jadwal Kerja (Master Schedule) — Diatur di CMS:**
- Setiap karyawan punya **jadwal kerja individual** (schedule template) yang menentukan:
  - Jam masuk, jam istirahat (opsional — bisa dinonaktifkan → jadi 2x absen saja: masuk & pulang), jam masuk kembali (opsional), jam pulang.
  - Bisa berbeda tiap hari dalam seminggu (untuk shift/FO/satpam) atau sama tiap hari (backoffice).
  - Contoh preset: `Backoffice A` (Senin–Sabtu 09.00–17.00), `Backoffice B` (Senin–Jumat 09.00–18.00), `Shift Pagi/Siang/Malam FO`, `Shift Satpam A/B/C`.
- **Toleransi telat**: default 1 menit (sesuai keterangan user), **fully configurable** per jenis jadwal/role/cabang di CMS (misal grace period 5/10/15 menit).
- **Shift Builder** (drag & drop kalender) di CMS: SPV/HRD menyusun jadwal shift per karyawan per cabang, dengan validasi otomatis:
  - Cegah bentrok (karyawan tidak bisa punya 2 shift di waktu sama).
  - Kapasitas maksimal orang per shift (configurable, misal shift malam satpam max 2 orang).
  - Visualisasi kalender per cabang/divisi.

**Koreksi Absen (Lupa Absen):**
- Jika lupa absen (masuk/istirahat/kembali/pulang) → wajib ajukan **Koreksi Absen**, isi: jam masuk seharusnya, jam istirahat seharusnya (jika aktif), jam masuk-kembali seharusnya (jika aktif), jam pulang seharusnya + alasan + (opsional) bukti upload.
- **Tetap harus melakukan absen normal** di hari berjalan (koreksi hanya untuk memperbaiki catatan/histori, bukan pengganti absen).
- Approval berjenjang: **SPV → HRD** (urutan & requirement bisa diatur di CMS).
- Kuota koreksi absen: default max 3x/bulan (**configurable di CMS**, bisa beda per role/divisi). Jika kuota habis:
  - Default: sistem otomatis reject pengajuan baru.
  - Kecuali "urgent override": butuh approval berlapis khusus (**HRD → Audit → Direksi**, sesuai urutan yang di-set CMS).

> **Saran perbaikan flow koreksi absen:** Tambahkan kategori alasan terstruktur (dropdown: `Lupa tap`, `Kendala aplikasi/HP`, `Dinas luar tanpa akses internet`, `Lainnya`) selain free-text — ini membantu HRD membuat laporan pola/statistik alasan koreksi per karyawan, dan bisa dipakai untuk deteksi indikasi kedisiplinan yang perlu ditindaklanjuti (misal karyawan yang sering koreksi absen otomatis muncul di "watchlist" HRD).

### 5.4 Modul Izin & Cuti

**Jenis Izin Default (bisa tambah dari CMS, tiap jenis punya konfigurasi sendiri):**
`Cuti Tahunan`, `Cuti Menikah`, `Cuti Melahirkan/Cuti Ayah`, `Izin Sakit`, `Izin Keluarga Meninggal`, `Izin Keperluan Pribadi`, `Cuti di Luar Tanggungan`.

**Konfigurasi per jenis izin (di CMS):**
- Jatah hari default (bisa beda per role/level/masa kerja).
- Mode perhitungan cuti tahunan: `Prorata dari tanggal masuk` atau `Flat per tahun kalender` (dropdown pilihan, bukan hardcode).
- Carry-over ke tahun berikutnya: on/off + max hari yang boleh di-carry.
- Approval flow: siapa saja & urutan approver (SPV → HRD → Audit — bisa beda per jenis izin, misal Izin Sakit 1 hari cukup SPV saja, Cuti Tahunan >3 hari perlu SPV+HRD).
- Butuh bukti upload atau tidak (misal Izin Sakit >1 hari wajib surat dokter).
- Minimal H- pengajuan (misal cuti tahunan harus diajukan min. H-3).

**Approval Engine (generik, dipakai semua modul approval — izin, koreksi absen, tukar shift/libur, dsb):**
- Buat sebagai *reusable approval workflow engine*: `ApprovalFlow` (per jenis transaksi & kondisi, misal jumlah hari) → `ApprovalStep[]` (urutan, role approver, wajib/opsional, SLA waktu respons) → `ApprovalInstance` (transaksi berjalan, status tiap step, timestamp, komentar approver).
- Notifikasi otomatis ke approver berikutnya setelah step sebelumnya disetujui.
- Jika kuota izin habis: default reject otomatis; opsi override butuh approval berlapis khusus (HRD/Audit/Direksi) — sama pola dengan koreksi absen.

### 5.5 Modul Tukar Libur (Shift/Hari Libur Tanggal Merah)

Aturan (**semua parameter di bawah wajib configurable di CMS**, bukan hardcode):

- Batas waktu pengajuan tukar libur: default **H-7** sebelum tanggal merah (bisa diubah).
- Bisa juga menukar **di tanggal merah itu sendiri** jika masih dalam rentang H-7 sebelumnya — namun jika pada hari-H tanggal merah karyawan ternyata **tidak masuk** (tidak absen), maka pengajuan tukar libur tersebut **otomatis batal/ditandai gagal** (karena syarat "masuk di tanggal merah" tidak terpenuhi).
- 1 tanggal merah = maksimal 1x hak tukar libur (tidak bisa dobel).
- Validasi bentrok: role/divisi yang sama tidak boleh tukar libur di tanggal & bulan yang sama secara default (mencegah semua orang kosong di hari yang sama) — **tapi bisa di-override/diizinkan dari CMS per role**.
- Opsi konversi ke **lembur** (bukan tukar libur) jika tetap masuk di tanggal merah — on/off dari CMS.
- Opsi **tukar libur setengah hari** — on/off dari CMS, dengan pilihan sesi (pagi/siang).
- Batasan jumlah tanggal merah yang boleh ditukar berurutan/berdekatan (misal tidak boleh 2 tanggal merah berturut-turut ditukar sekaligus dalam rentang berdekatan) — **jumlah batasnya configurable** dari CMS.
- Approval: SPV → HRD (mengikuti approval engine generik di atas).
- Histori lengkap tukar libur per karyawan (tanggal merah asal, tanggal pengganti, status, approver).

### 5.6 Modul Payroll / Slip Gaji

- Mode generate slip gaji: `Otomatis (dihitung sistem)` atau `Upload manual PDF oleh Finance/HRD` — **dipilih per periode/role dari CMS**.
- Struktur gaji: **2 komponen periode** — Gaji Pokok (periode 1) dan Insentif (periode 2); tanggal cut-off & tanggal terbit slip gabungan **diatur di CMS** (misal gaji pokok tanggal 25, insentif tanggal 5 bulan berikutnya, slip gabungan terbit tanggal X).
- Kalkulasi otomatis (jika mode otomatis aktif) mempertimbangkan: potongan telat/alpha (berdasar data presensi), lembur (jika modul lembur aktif), potongan BPJS Kesehatan & Ketenagakerjaan, PPh 21 sederhana (bisa disesuaikan rumus di CMS), tunjangan.
- **Lembur otomatis dari presensi**: on/off di CMS. Jika masuk di tanggal merah tanpa tukar libur → otomatis dihitung sebagai jam lembur (on/off di CMS, sesuai poin 5.5).
- Slip gaji histori: **disimpan permanen selamanya**, bisa diakses karyawan kapan saja via Portal (menu "Slip Gaji Saya").
- Slip gaji berbentuk PDF, akses via signed URL (bukan public), audit log setiap kali diunduh/dilihat.

### 5.7 Modul KPI & Kompetensi

- **KPI**: diinput oleh SPV. Periode penilaian **configurable** (bulanan/triwulanan/tahunan/custom) di CMS.
- **Template indikator KPI per divisi/jabatan** disusun dari CMS (Superadmin/HRD): nama indikator, bobot (%), target, skala penilaian.
- Hasil KPI per karyawan → grafik tren per periode di halaman profil karyawan (radar chart/line chart).
- **Uji Kompetensi** (modul on/off dari CMS), 2 mode:
  1. **Kuis online** built-in — bank soal (pilihan ganda & essay), auto-scoring untuk pilihan ganda, essay dinilai manual oleh HRD/SPV.
  2. **Upload sertifikat/hasil assessment eksternal** (PDF/gambar) + catatan validasi dari HRD.
- Hasil KPI & Kompetensi terhubung sebagai referensi untuk kenaikan gaji/promosi/evaluasi kontrak (ditampilkan sebagai insight di halaman kontrak & payroll), sekaligus tercatat sebagai histori permanen.

### 5.8 Modul Profil Karyawan

**Data Diri Lengkap:**
- Foto profil (upload sendiri atau oleh HRD).
- Nama lengkap sesuai KTP, NIK, nama panggilan, TTL, gender, agama, status perkawinan.
- Alamat sesuai KTP (jalan, kecamatan, kota, provinsi, negara) — dan alamat domisili saat ini (field terpisah).
- Email pribadi, email kantor, no. HP/WhatsApp.
- NPWP & status pajak (TK/0, K/1, dst), BPJS Kesehatan, BPJS Ketenagakerjaan (nomor masing-masing).
- Data Bank: nama bank, no. rekening, atas nama.
- Sosial media: LinkedIn, Instagram, Facebook, TikTok, Website pribadi, WhatsApp.
- Dokumen khusus (upload multi-file: KTP, KK, Ijazah, Sertifikat, dll — dengan kategori dokumen).
- Data kantor/cabang penempatan, jabatan, divisi, atasan langsung, tanggal mulai kerja, status kepegawaian.
- Karyawan dapat **edit sebagian data sendiri** (kontak, alamat domisili, sosmed, foto) — perubahan data sensitif (rekening, NPWP, NIK) butuh **approval HRD** sebelum berlaku (tidak langsung berubah begitu saja, demi validitas data payroll).

### 5.9 Modul Inventaris (GA)

- Data barang inventaris yang dipegang tiap karyawan (laptop, HP, kendaraan, dll): kode aset, kategori, kondisi, tanggal serah terima, foto barang.
- **Serah terima digital**: form BAST (Berita Acara Serah Terima) digital dengan tanda tangan digital (canvas signature) dari karyawan & PIC GA.
- Alur saat resign: GA membuat checklist pengembalian barang → status "Cleared"/"Belum Dikembalikan" → terhubung ke proses **Employee Clearance/Offboarding** (HRD tidak bisa selesaikan proses resign sebelum inventaris clear, kecuali override oleh HRD/Direksi dengan catatan).
- Akses read untuk HRD & Audit.

### 5.10 Modul Pengaduan/Keluhan Karyawan

- Form pengaduan/laporan kasus, tujuan bisa dipilih: `Atasan Langsung (SPV)`, `HRD`, `Direksi` (langsung, untuk kasus sensitif/whistleblowing).
- Opsi anonim (untuk kasus sensitif seperti pelecehan/pelanggaran etik) — identitas disembunyikan dari SPV tapi tetap tercatat di sistem untuk HRD/Audit (demi akuntabilitas & mencegah penyalahgunaan fitur anonim).
- Status tracking: `Diterima → Diproses → Selesai/Ditolak`, dengan catatan tindak lanjut & lampiran bukti.

### 5.11 Modul Multi-Cabang/Kantor

- CMS: CRUD data cabang — nama cabang, alamat, **titik koordinat presisi via peta interaktif (Leaflet + OpenStreetMap)** (klik peta atau cari alamat via Nominatim), radius absen per cabang, jam operasional cabang.
- Superadmin mengatur hak akses HRD/role lain: per cabang tertentu atau seluruh cabang (`scope: branch_ids[] | all`).
- Setiap karyawan memiliki field `assigned_branch_id` sebagai kantor penempatan utamanya (dipakai validasi radius presensi).

### 5.12 Info Tambahan (Widget Dashboard)

- **Jam & tanggal real-time** ditampilkan dalam **WIB** (gunakan `Intl.DateTimeFormat` timezone `Asia/Jakarta`, jangan bergantung ke timezone device user).
- **Kalender Ulang Tahun**: widget bulan berjalan menampilkan karyawan yang berulang tahun.
- **Info Hari Libur Nasional**: integrasi API hari libur nasional Indonesia (atau input manual dari CMS sebagai master data `national_holidays`) ditampilkan di kalender & dashboard.

### 5.13 Modul Laporan & Analitik

- Dashboard analitik per divisi/cabang (untuk SPV/HRD/Direksi): grafik kehadiran, keterlambatan, tren pengajuan izin, progres KPI, status rekrutmen (funnel), dsb.
- Export laporan: Excel (`exceljs`/`xlsx`) & PDF (`@react-pdf/renderer` atau `puppeteer`) untuk semua modul (absensi, izin, KPI, payroll summary, rekrutmen).
- Semua export tercatat di audit log (siapa export, kapan, data apa).

### 5.14 Halaman Bantuan/Onboarding (Role-based Help Center)

- Halaman "Panduan Penggunaan" yang **kontennya menyesuaikan role user yang login** — hanya menampilkan panduan fitur yang relevan dengan hak aksesnya.
- Format: kombinasi teks singkat + screenshot/GIF interaktif + FAQ per modul.
- Ditampilkan otomatis (tour/onboarding tooltip) saat user pertama kali login, bisa di-skip/diulang lewat menu Help.

---

## 6. STRUKTUR DATABASE (MongoDB — Koleksi Utama & Relasi)

> Gunakan `ObjectId` referensi antar koleksi. Beri index pada field yang sering di-query (`employee_id`, `branch_id`, `date`, `status`).

```
users                     -- akun login (email, password_hash, role_id, employee_id, is_2fa_enabled, google_id)
roles                     -- daftar role (nama, is_system_default)
role_permissions          -- (role_id, module, action[], scope)
employees                 -- data karyawan lengkap (personal_data, bank_account, npwp, bpjs, branch_id, division_id, position_id, supervisor_id, employment_status, join_date)
divisions                 -- divisi/departemen
positions                 -- jabatan
branches                  -- cabang/kantor (nama, alamat, lat, lng, radius_meter, jam_operasional)

candidates                -- pelamar (biodata, source, current_stage, status, cv_url)
recruitment_pipelines     -- template tahapan rekrutmen per posisi (stages[])
candidate_stage_history    -- histori tiap tahap kandidat (stage, status, notes, interviewer_id, schedule_at)

contracts                 -- kontrak kerja (employee_id, type, start_date, end_date, file_url, generated_from_template_id, salary_snapshot)
contract_templates        -- template dokumen kontrak (placeholders)

work_schedules             -- template jadwal kerja (nama, jam_masuk, jam_istirahat, jam_masuk_kembali, jam_pulang, is_break_active, hari_aktif[])
employee_schedules         -- assignment jadwal per karyawan per tanggal/range (employee_id, schedule_id, date_range/date)
shifts                     -- shift builder entries (branch_id, division_id, date, schedule_id, employee_id, max_capacity)

attendances                -- absensi harian (employee_id, date, clock_in, break_out, break_in, clock_out, photo_url[], gps_lat, gps_lng, is_late, is_manual_fallback, is_cross_branch, is_location_override, note)
attendance_corrections      -- pengajuan koreksi absen (employee_id, date, corrected times, reason, category, evidence_url, approval_instance_id)

leave_types                -- master jenis izin/cuti + konfigurasi (quota_days, accrual_mode, carry_over, requires_evidence)
leave_balances              -- saldo cuti per karyawan per tahun/jenis
leave_requests               -- pengajuan izin/cuti (employee_id, leave_type_id, start_date, end_date, reason, evidence_url, approval_instance_id)

holiday_swap_requests       -- pengajuan tukar libur (employee_id, holiday_date, replacement_date, is_half_day, session, status, approval_instance_id)
national_holidays           -- master tanggal merah nasional

approval_flows               -- konfigurasi alur approval per jenis transaksi & kondisi (steps[], role, sla)
approval_instances            -- transaksi approval berjalan (ref_type, ref_id, current_step, steps_status[], history[])

payrolls                     -- slip gaji (employee_id, period, gaji_pokok, insentif, potongan[], tunjangan[], lembur, file_url, generated_by, status)
overtime_records              -- catatan lembur (employee_id, date, hours, source: auto/manual)

kpi_templates                 -- indikator KPI per divisi/jabatan (indicators[{name, weight, target}])
kpi_evaluations                 -- hasil KPI per karyawan per periode (scores[], total_score, evaluated_by)
competency_tests                 -- bank soal uji kompetensi (question, type, options[], correct_answer, weight)
competency_test_results             -- hasil test per karyawan (test_id, employee_id, score, answers[], certificate_url)

inventories                          -- master aset (code, category, condition)
inventory_assignments                 -- BAST kepemilikan barang per karyawan (employee_id, inventory_id, handover_date, signature_url, status)

complaints                            -- pengaduan/keluhan karyawan (employee_id/anonymous, target: spv/hrd/direksi, description, status, attachments)

notifications                          -- notifikasi in-app (user_id, type, message, is_read, ref_type, ref_id)
audit_logs                              -- log aktivitas (user_id, action, module, before, after, ip, user_agent, timestamp)
settings                                 -- key-value pair konfigurasi global CMS (grace_period_minutes, max_absen_correction, dst)
```

**Relasi Kunci:**
`employees.branch_id → branches._id`, `employees.division_id → divisions._id`, `employees.supervisor_id → employees._id` (self-reference), `attendances.employee_id → employees._id`, `leave_requests.approval_instance_id → approval_instances._id`, dst. — Semua transaksi approval (koreksi absen, izin, tukar libur) **menggunakan `approval_instances` yang sama (polymorphic reference via `ref_type` + `ref_id`)** agar konsisten dan reusable.

---

## 7. REST API & DOKUMENTASI

- Base path: `/api/v1/...`
- Autentikasi: JWT (access token pendek + refresh token httpOnly cookie).
- Standar response: `{ success, data, message, meta: { page, limit, total } }`.
- Error handling konsisten: `{ success: false, error: { code, message, details } }`.
- Dokumentasi API: generate **OpenAPI 3.1 spec** dari route (pakai `zod-to-openapi` atau `next-swagger-doc`), tampilkan lewat **Scalar API Reference** (`@scalar/nextjs-api-reference`) di route `/api-docs` — modern, interaktif, support "try it out".
- Endpoint publik (candidate submission API) menggunakan API-Key terpisah (bukan JWT user), dengan rate-limit ketat & validasi origin/domain.
- Sertakan Postman Collection / OpenAPI JSON sebagai export tambahan.

---

## 8. DESAIN UI/UX

- Prinsip: **Simple, Elegant, Premium, tapi tetap mudah dipahami** (utamakan clarity di atas dekorasi).
- Gunakan shadcn/ui sebagai basis komponen, kustomisasi warna brand (siapkan token warna: primary, secondary, neutral, success, warning, danger).
- Tipografi: 1 font sans-serif modern (misal Inter/Geist) — hierarki jelas (heading, subheading, body, caption).
- Microinteraction dengan Framer Motion (transisi halaman, hover state, modal), GSAP untuk elemen landing page/animasi kompleks (misal timeline rekrutmen, hero section).
- Dark mode opsional (nice-to-have).
- Setiap halaman kompleks (absensi kamera, shift builder, approval berjenjang) harus melalui user testing sederhana/prototype dulu sebelum development penuh — sertakan wireframe di tahap desain.
- Logo: siapkan placeholder logo "HRIS" (bisa custom nanti), sediakan favicon & app icon.

---

## 9. TAHAPAN PENGEMBANGAN (SARAN MILESTONE)

1. **Fase 0** — Setup project (Next.js, MongoDB, Auth, CMS shell, Role & Permission engine, Audit log middleware, Settings engine).
2. **Fase 1** — Modul Master Data (Branches, Divisions, Positions, Employees, Work Schedules) + Profil Karyawan.
3. **Fase 2** — Modul Presensi (kamera, GPS, radius, shift builder, koreksi absen) — modul paling kompleks, prioritaskan.
4. **Fase 3** — Modul Izin/Cuti + Approval Engine generik + Tukar Libur.
5. **Fase 4** — Modul Recruitment/ATS + Kontrak Kerja.
6. **Fase 5** — Modul Payroll/Slip Gaji + KPI + Kompetensi.
7. **Fase 6** — Modul Inventaris + Pengaduan + Notifikasi (Email/WA).
8. **Fase 7** — Dashboard Analitik, Export Laporan, Help Center per role.
9. **Fase 8** — Hardening: security audit, performance tuning (query, caching, lazy load), dokumentasi API final, UAT, deployment.

---

## 10. ASUMSI & CATATAN TAMBAHAN

- Semua nilai default (radius 15m, toleransi telat 1 menit, kuota koreksi 3x/bulan, H-7 tukar libur, dsb) disimpan di collection `settings` sebagai *default value* yang bisa di-override kapan saja dari CMS tanpa perlu deploy ulang kode.
- Sistem harus mendukung penambahan jenis izin/role/modul baru **tanpa perubahan skema database yang breaking** — gunakan pendekatan schema yang fleksibel (misal `leave_types` sebagai master data, bukan enum hardcode di kode).
- Rekomendasi tambahan yang perlu didiskusikan lebih lanjut sebelum development:
  - Kebijakan retensi foto absensi (berapa lama foto disimpan sebelum diarsipkan ke cold storage demi efisiensi biaya storage).
  - Kebijakan privasi & consent form untuk data biometrik (face recognition) sesuai UU PDP.
  - Perlu tidaknya modul **Offboarding/Resign** formal (saat ini baru tersentuh lewat modul Inventaris clearance) — sebaiknya dibuat modul tersendiri yang menggabungkan: pengajuan resign → approval → clearance inventaris → clearance keuangan → surat pengalaman kerja otomatis.

---

**Dokumen ini siap digunakan sebagai prompt utama/briefing untuk AI coding assistant (misal Claude Code) dalam membangun sistem HRIS secara bertahap sesuai milestone di atas.**
