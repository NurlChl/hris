# HRIS — Catatan Teknis & Log Pemeliharaan

Dokumen ini adalah **acuan teknis** dan **catatan perubahan** sistem. Ditujukan
untuk developer maupun AI coding assistant yang bekerja pada sistem ini di
kemudian hari. Panduan penggunaan untuk pengguna akhir ada di halaman `/docs`.

---

## 1. Tech Stack

| Kebutuhan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Bahasa | TypeScript (strict) |
| Database | MongoDB via Mongoose |
| Styling | Tailwind CSS v4 dengan design token CSS variable |
| Animasi | Framer Motion |
| Auth | Auth.js (NextAuth v5), strategi JWT |
| Validasi | Zod di setiap route handler |
| Peta | Leaflet + OpenStreetMap, reverse geocoding Nominatim |
| Storage | Adapter multi-provider, dipilih lewat `STORAGE_PROVIDER` |
| Terjadwal | Endpoint cron terautentikasi (`/api/v1/cron/daily`) |

### Perintah

```bash
npm install
npm run seed        # peran, hak akses, pengaturan, hari libur, akun demo
npm run dev
npm run typecheck
npm run build
npm start
```

Variabel environment terdokumentasi lengkap di `.env.example`.

---

## 2. Arsitektur

### 2.1 Lapisan penjaga API (`src/lib/guard.ts`)

Setiap route handler melewati urutan yang sama:

```
requireUser / requirePermission / requireEmployee
  → enforceRateLimit (bila perlu)
  → parseBody(zod)
  → logika bisnis
  → logActivity
```

`wrapRouteHandler` (`src/lib/api.ts`) menerjemahkan setiap `HttpError`, error
duplikat Mongo, dan kegagalan koneksi menjadi bentuk respons yang seragam.
Kesalahan tak terduga dicatat di server dan dikembalikan sebagai 500 generik —
stack trace tidak pernah sampai ke browser.

### 2.2 Waktu — selalu WIB (`src/lib/time.ts`)

Seluruh aturan HR dinyatakan dalam Asia/Jakarta. **Jangan pernah** memakai
`new Date().setHours(0,0,0,0)` atau `getFullYear()` untuk batas hari: hasilnya
mengikuti zona waktu mesin server. Gunakan `wibStartOfDay`, `wibDateKey`,
`wibTimeOnDay`, dan kawan-kawannya.

### 2.3 Pengaturan (`src/lib/settings.ts`)

Seluruh aturan bisnis dideklarasikan sekali di `SETTING_DEFS`: kunci, tipe,
nilai default, label, dan kelompoknya. Satu deklarasi itu sekaligus menjadi
sumber nilai default di server, skema validasi, dan formulir di halaman
Pengaturan. Menambah aturan baru = menambah satu entri di array tersebut.

### 2.4 Mesin persetujuan (`src/lib/approval/engine.ts`)

Cuti, koreksi absen, dan tukar libur memakai satu mesin polimorfik lewat
`ApprovalInstance` (`refType` + `refId`). Modul hanya memanggil
`createApprovalInstance` dan `decide`; perutean langkah, notifikasi, dan callback
penyelesaian terpusat di sini.

### 2.5 Penyimpanan berkas (`src/lib/storage/`)

`upload()` mengembalikan **storage key**, bukan URL. Key itulah yang disimpan di
MongoDB; URL dibuat saat dibaca lewat `getSignedUrl()`. Dengan begitu mengganti
provider tidak membatalkan satu pun record lama.

Satu-satunya pintu baca adalah `/api/v1/storage/secure`, yang memeriksa sesi
**dan** kepemilikan berkas.

### 2.6 RBAC (`src/lib/rbac/`)

`checkPermission(userId, module, action)` membaca koleksi `role_permissions`,
bukan konstanta di kode, sehingga perubahan di CMS langsung berlaku. Daftar
modul dan aksi yang sah ada di `src/lib/rbac/modules.ts`.

`scopeFilter()` di `guard.ts` menerjemahkan lingkup izin menjadi potongan filter
Mongo. Lingkup `self` menyematkan id karyawan pemanggil — dan id mustahil bila
akun tidak punya karyawan, sehingga pembacaan bersifat sempit tidak pernah
melebar menjadi "semua data".

### 2.7 Tugas terjadwal

Antrean in-memory tidak dipakai untuk pekerjaan terjadwal karena hilang saat
proses dimulai ulang dan mati di lingkungan serverless. Pekerjaan harian
dijalankan lewat `GET/POST /api/v1/cron/daily` dengan header `x-cron-secret`.
Seluruh tugasnya idempoten sehingga aman dijalankan berulang:

- membatalkan tukar libur yang tanggal merahnya ternyata tidak dihadiri;
- mencatat lembur otomatis untuk yang bekerja di tanggal merah tanpa tukar libur;
- mengirim pengingat kontrak H-30 / H-14 / H-7;
- mengirim ucapan ulang tahun.

---

## 3. Log Pemeliharaan

| Tanggal | Jenis | Ringkasan |
|---|---|---|
| 2026-07-06 | Inisiasi | Setup Next.js 16, Tailwind, TypeScript, modul dasar. |
| 2026-07-06 | Fase 0 | Koneksi DB, storage provider, audit logger, queue manager. |
| 2026-07-06 | Fase 1–2 | CRUD master data, shift builder, portal presensi bergeofence. |
| 2026-07-06 | Fase 3–5 | Mesin approval polimorfik, ATS, onboarding, kalkulator slip gaji. |
| 2026-07-06 | Notifikasi | Integrasi SMTP/Resend dan Fonnte/Twilio. |
| 2026-07-06 | Auth | OTP lupa & ganti password, pemisahan login portal dan admin. |
| **2026-09-14** | **Audit & perbaikan menyeluruh** | Lihat rincian di bawah. |
| **2026-09-14** | **Redesain antarmuka** | Sistem token baru, tipografi tunggal, ikon konsisten. Lihat bagian 3.5. |
| **2026-09-14** | **Loker, KPI, template slip gaji** | Tiga modul baru beserta halaman cetaknya. Lihat bagian 3.6. |

### 3.1 Perbaikan keamanan (2026-09-14)

| Masalah | Dampak sebelumnya | Perbaikan |
|---|---|---|
| Berkas disimpan di `public/uploads` | Foto presensi dan slip gaji dapat diunduh siapa pun yang menebak alamatnya; tanda tangan URL tidak ada artinya | Dipindah ke `storage/uploads` di luar `public/`; satu-satunya pintu baca kini `/api/v1/storage/secure` yang memeriksa sesi dan kepemilikan |
| `/api/v1/storage/secure` tanpa cek sesi | Tautan bocor dapat dipakai siapa saja | Wajib sesi valid **atau** tanda tangan HMAC yang belum kedaluwarsa, ditambah pemeriksaan kepemilikan berkas |
| Enkripsi AES-256-**CBC** tanpa tag autentikasi | Ciphertext yang dirusak terdekripsi menjadi sampah tanpa terdeteksi | Diganti AES-256-**GCM**; payload CBC lama tetap terbaca agar data existing tidak hilang |
| `authorize()` mencetak email & hasil verifikasi password ke konsol | Kredensial masuk ke log server | Seluruh logging kredensial dihapus |
| Tidak ada rate limit maupun penguncian akun | Password dapat ditebak tanpa batas | Rate limit per IP dan per identitas, ditambah penguncian akun sementara yang ambangnya diatur dari CMS |
| OTP dibuat dengan `Math.random()`, disimpan plaintext, tanpa batas percobaan | Kode 6 angka dapat ditebak habis-habisan | `crypto.randomInt`, disimpan sebagai SHA-256, maksimal 5 percobaan lalu hangus |
| `POST /api/v1/recruitment` GET tanpa cek izin | Setiap akun yang login dapat membaca seluruh CV, kontak, dan nominal penawaran kandidat | Digerbangi izin modul `recruitment` |
| KPI digerbangi modul `employees` | STAFF (yang punya `employees:read` lingkup self) dapat membaca nilai KPI seluruh karyawan | Dipindah ke modul `kpi` dan hasilnya disaring menurut lingkup izin |
| `GET /api/v1/payroll` hanya menyempitkan peran literal `"STAFF"` | Peran kustom apa pun dapat membaca seluruh slip gaji perusahaan | Penyempitan mengikuti lingkup izin, bukan nama peran |
| NIK/NPWP/rekening ikut tertulis utuh di log audit | Enkripsi at-rest jadi sia-sia | Nilai sensitif diganti penanda sebelum masuk log |
| Tidak ada security header | Rentan clickjacking dan MIME sniffing | CSP, HSTS, X-Frame-Options, Permissions-Policy, dan `no-store` untuk seluruh `/api` |
| Endpoint publik kandidat tanpa rate limit; balasan 409 untuk email yang sudah melamar | Dapat dipakai memetakan siapa saja yang pernah melamar | Rate limit per IP, verifikasi Turnstile, dan balasan netral yang identik |

### 3.2 Perbaikan kebenaran (2026-09-14)

| Masalah | Perbaikan |
|---|---|
| Seluruh perhitungan memakai zona waktu server | Modul `lib/time.ts`; semua batas hari, jadwal, dan periode dihitung dalam WIB |
| Presensi dapat dicatat di luar urutan — absen pulang sebelum masuk, absen masuk dua kali menimpa jam sebelumnya | Validasi urutan di server, ditambah indeks unik `(employeeId, date)` |
| `Attendance` boleh punya banyak baris per hari | Indeks unik menjamin satu baris per karyawan per hari |
| Koreksi absen mencari karyawan lewat `officeEmail = email login` | Memakai `employeeId` dari sesi; sebelumnya fitur ini gagal diam-diam untuk setiap akun yang alamat loginnya berbeda |
| Koreksi absen yang disetujui menulis koordinat Monas (`-6.2088, 106.8456`) | Memakai koordinat cabang karyawan, dan mempertahankan GPS asli bila catatan hari itu sudah ada |
| Cuti memotong akhir pekan dan tanggal merah | Mode `working_days` melewati keduanya; `chargedDays` dan `calendarDays` disimpan terpisah |
| Saldo cuti dipotong tanpa pemeriksaan atomik | Reservasi lewat satu update bersyarat; gagal membuat pengajuan mengembalikan saldo |
| Tidak ada deteksi pengajuan cuti yang tanggalnya beririsan | Ditolak, dapat dimatikan lewat pengaturan |
| Kuota koreksi absen tidak pernah benar-benar mengeskalasi | Melewati kuota kini diarahkan ke alur HRD → Audit → Direksi |
| NIP dibuat dengan `countDocuments() + 1` | Koleksi `Counter` yang atomik; sebelumnya dua HR menyimpan bersamaan menghasilkan NIP kembar |
| Email kandidat unik secara global | Unik per (email, posisi) — sebelumnya pelamar tidak bisa melamar lowongan kedua |
| Tarif potongan telat, lembur, BPJS, PPh 21 di-hardcode | Seluruhnya menjadi pengaturan CMS |
| PPh 21 mengenakan tarif atas seluruh penghasilan begitu melewati ambang | Hanya selisih di atas PTKP yang dikenai pajak |
| Alpha dihitung tanpa melihat cuti yang disetujui | Hari cuti yang disetujui tidak lagi dihitung alpha |
| Halaman audit memilih `name` dan `role` dari `User` — field yang tidak ada | Nama diambil dari Employee, peran dari Role |
| `.lean()` melewati getter Mongoose sehingga field terenkripsi kadang terbaca mentah | Enkripsi dipindah ke lapisan API, bukan hook skema |
| Antrean approval dan daftar kandidat melakukan query di dalam loop (N+1) | Diganti pengambilan berkelompok |
| Seed menulis `radius` padahal field-nya `radiusMeter` | Setiap cabang sebelumnya diam-diam memakai radius default 15 m |
| Tukar libur hanya ada di skema, tanpa API maupun UI | Modul lengkap beserta seluruh aturannya |
| Hak tukar libur tidak pernah gugur meski karyawan tidak masuk | Tugas harian memeriksa kehadiran lalu membatalkan haknya |

### 3.3 Antarmuka (2026-09-14)

- Design token CSS variable menggantikan kelas `slate-*` yang tersebar. Kelas
  seperti `text-slate-450`, `slate-550`, `slate-250`, dan `slate-350` **tidak
  ada di Tailwind** sehingga elemen yang memakainya selama ini tidak berwarna
  sama sekali.
- Kelas yang saling bertabrakan (`dark:bg-white dark:bg-white/3`) dibersihkan.
- Tema dipusatkan di `ThemeProvider` dengan skrip pra-render, menghilangkan
  kedipan putih/gelap saat halaman dimuat. Sebelumnya logika tema disalin ke
  setiap halaman dan sudah mulai berbeda satu sama lain.
- Satu `AppShell` dipakai portal dan admin; header admin tidak lagi menampilkan
  "Superadmin / admin@hris.com" yang di-hardcode.
- Pustaka komponen `src/components/ui` (tombol, kartu, tabel, modal, badge,
  skeleton, empty state, toast) menggantikan markup lepas di tiap halaman.
- Setiap daftar kini punya status memuat, kosong, dan gagal yang eksplisit.
- Pesan kesalahan ditulis ulang menjadi kalimat yang menjelaskan penyebab dan
  langkah berikutnya, bukan kode teknis.

### 3.4 Fitur baru (2026-09-14)

- **Tukar libur** — model, API, halaman portal, integrasi approval, dan
  pembatalan otomatis bila karyawan tidak masuk.
- **Hari libur nasional** — master data + CRUD admin, dipakai perhitungan cuti,
  tukar libur, dan hari kerja payroll.
- **Notifikasi dalam aplikasi** — model, API, dan lonceng di header.
- **Slip gaji portal** — halaman karyawan dengan rincian dan unduhan bertanda tangan.
- **Pengaduan** — alur lengkap dua sisi dengan anonimitas yang benar-benar
  bekerja (tersembunyi dari atasan, tetap tercatat untuk HRD/Audit).
- **Dashboard admin** — ringkasan harian, tren 14 hari, ulang tahun, hari libur.
- **Ekspor laporan CSV** — presensi, cuti, payroll, karyawan, koreksi absen,
  dengan pencegahan CSV injection dan pencatatan audit.
- **Halaman dokumentasi `/docs`** — panduan lengkap dengan pencarian dan
  penyaring peran.
- **Tugas harian terjadwal** — endpoint cron idempoten.
- **Wajib ganti kata sandi saat login pertama**.

---

### 3.5 Redesain antarmuka (2026-09-14)

Referensi bentuk: kantorku.id. Yang diambil adalah **strukturnya**, bukan
warnanya — ground bernuansa, permukaan datar tanpa bayangan, judul maksimal
bobot 600 dengan tracking negatif, sudut membulat lega, dan satu aksen hangat.

**Palet.** Slot semantik sudah menguasai sebagian besar roda warna: sukses di
hijau (~155°), peringatan di amber (~38°), bahaya di rose (~352°), info di cyan
(~193°). Warna merek yang jatuh dekat salah satunya membuat tombol utama
terbaca seperti status. Yang tersisa adalah busur biru→violet, dan indigo
(~246°) cukup jauh dari cyan-info sekaligus terbaca lebih institusional
dibanding violet murni yang dipakai referensi. Emas `#F5B027` adalah satu-satunya
aksen hangat dan **bukan** warna semantik: ia hanya menandai satu tindakan
terpenting di sebuah layar.

**Ground tidak pernah abu-abu netral.** Setiap permukaan membawa 4–8% rona
merek, sehingga kartu putih polos terbaca terangkat tanpa perlu bayangan. Itulah
yang membuat seluruh antarmuka bisa tetap datar. Bayangan kini hanya dipakai
untuk elemen yang benar-benar melayang: modal, popover, dan toast.

**Kontras diukur di browser**, terhadap ground yang sebenarnya dan bukan
terhadap putih murni, untuk kedua tema. Seluruh pasangan yang benar-benar
dirender lolos ambang AA 4.5:1, termasuk tiap warna status di atas latar
badge lunaknya sendiri yang merupakan pasangan paling ketat. Dua token
disesuaikan setelah pengukuran: `--warning` (4.23 → 5.47) dan `--success`
(4.36 → 5.31 di atas badge).

**Tipografi.** Satu keluarga, Inter, menggantikan pasangan DM Sans + Plus Jakarta
Sans yang membuat judul dan isi terasa berasal dari dua produk berbeda. Judul
dibatasi bobot 600; sebelumnya 700 dipakai di 181 tempat dan itu penyebab utama
halaman lama terbaca berteriak. Hierarki kini dibawa ukuran dan tracking negatif.
Ambang bawah ukuran teks naik dari 9px ke 11px.

**Ikon.** Tetap Lucide, yang memang pustaka modern paling umum dipakai dan sudah
terpasang. Yang berubah adalah pemakaiannya: satu stroke-width global 1.75
(bawaan 2 terlalu berat di samping Inter pada ukuran UI), satu wadah `IconTile`
untuk semua ikon, dan pemilihan glyph menurut fungsi sebenarnya — payroll memakai
struk bukan kartu kredit, divisi memakai diagram jaringan bukan papan klip.
Konsep yang sama memakai glyph yang sama di landing page, navigasi admin, dan
navigasi portal.

**Utang gaya yang dibersihkan.** 59 `ring-blue-500` hardcoded, 25 `bg-red-500`,
14 `bg-emerald-500/10`, dan seterusnya kini memakai token semantik sehingga ikut
berubah di mode gelap. 83 `shadow-xs` dihapus. Dua warna latar hardcoded
(`#0e1017`) diganti token.

---

### 3.6 Loker, KPI, dan template slip gaji (2026-09-14)

Tiga modul yang sebelumnya hanya berupa kerangka kini berjalan penuh dari model
sampai halaman cetak.

**Lowongan kerja.** `JobVacancy` sengaja dipisahkan dari `Position`. Sebuah
jabatan adalah entri tetap pada struktur organisasi yang ditunjuk karyawan;
sebuah lowongan terikat waktu dan boleh dibuka berulang kali untuk jabatan yang
sama. Menyatukan keduanya berarti setiap pembukaan lowongan mengotori struktur
organisasi. Tiap lowongan membawa tahap seleksinya sendiri (`stages`), sehingga
alur rekrutmen staf gudang tidak harus sama dengan alur rekrutmen engineer.

- Slug dibuat `lib/hr/slug.ts` dari judul ditambah akhiran acak, dan menormalkan
  diakritik lebih dulu. `slugifyVacancy("Staf Akuntansi & Pajak (Moller)")`
  menghasilkan alamat yang bersih walau judulnya mengandung tanda baca.
- Halaman karier publik memakai slug, bukan ObjectId, dan menaikkan penghitung
  kunjungan hanya pada halaman detail.
- `Candidate.email` yang tadinya unik global kini unik per lowongan. Sebelumnya
  seseorang yang pernah melamar tidak akan pernah bisa melamar lowongan lain.
- Papan pelamar mengelompokkan pelamar menurut tahap. Memindahkan pelamar,
  menolaknya dengan alasan, dan merekrutnya menjadi karyawan (lengkap dengan NIP
  berurutan dan akun pengguna) semuanya lewat satu endpoint `/api/v1/candidates`.

**KPI dan kinerja.** Template menentukan bentuk formulir; penilaian menyimpan
**salinan** bentuk itu. Tanpa salinan tersebut, menyunting template pada siklus
berikutnya diam-diam mengubah bentuk appraisal yang sudah ditandatangani setahun
sebelumnya — catatan yang berubah sendiri tidak ada gunanya sebagai catatan.

- Indikator bersarang di dalam aspek, keduanya berbobot dan masing-masing harus
  berjumlah 100%. Validasi mengembalikan seluruh pelanggaran sekaligus, bukan
  satu per satu setiap kali tombol simpan ditekan.
- Nilai mentah dinormalkan ke 0–100 saat disimpan, sehingga template berskala
  1–5 dan template berskala persentase dapat diagregasi bersama.
- Alur status `draft → submitted → acknowledged → finalized`. Draf tidak pernah
  terlihat karyawan; `return` adalah satu-satunya transisi mundur yang
  diizinkan, dan hanya selama karyawan belum menanggapi.
- Periode mengikuti irama template: template triwulanan menulis `2026-Q3`,
  template tahunan menulis `2026`. Kolomnya tetap bebas diketik.

**Template slip gaji.** Slip disusun dari **blok berurutan**, bukan kanvas bebas.
Kanvas terdengar lebih fleksibel, tetapi tata letak berposisi absolut langsung
rusak begitu seorang karyawan punya satu baris tunjangan tambahan. Blok mengalir
mengikuti isinya, dan tetap memberi kendali nyata: blok mana yang tampil, dalam
urutan apa, dengan judul apa, dan kolom identitas mana yang dicetak.

- Perusahaan yang ingin memakai dokumen buatan sendiri dapat memilih
  `mode: "upload"` dan melampirkan berkas per periode.
- Pencetakan memakai dialog cetak peramban (`window.print()` dengan aturan
  `@page`), bukan Puppeteer atau generator PDF di server. Tidak ada peramban
  headless yang perlu dipasang, hasilnya mengikuti mesin tata letak yang sama
  dengan pratinjau, dan pengguna tetap dapat memilih *Save as PDF*.
- `terbilang()` menuliskan nominal dalam bahasa Indonesia, termasuk bentuk
  khusus *sepuluh*, *sebelas*, dan *seratus*.

**Konstanta presentasi keluar dari berkas model.** Label dan perhitungan yang
dipakai bersama oleh skema dan komponen klien dipindahkan ke `lib/hr/kpi.ts` dan
`lib/hr/payslip.ts`. Mengimpor berkas model dari komponen klien menyeret seluruh
driver Mongoose ke dalam bundel peramban, dan halamannya mati dengan
`Cannot read properties of undefined (reading 'KpiTemplate')`. Kegagalan itu
tidak terlihat oleh `tsc` maupun `next build` karena impornya sah secara tipe —
hanya runtime di peramban yang jatuh. Aturannya: **berkas di `src/models/` tidak
boleh diimpor dari berkas ber-`"use client"`.**

**Daftar wilayah dipindah ke server.** Form karyawan mengambil daftar provinsi,
kota, dan kecamatan langsung dari `emsifa.com` di sisi peramban, sementara CSP
aplikasi membatasi `connect-src` ke `'self'` dan Nominatim. Akibatnya seluruh
dropdown alamat selalu kosong — fiturnya mati sejak CSP dipasang, tanpa pesan
kesalahan yang terlihat pengguna. Permintaan itu kini lewat
`/api/v1/regions`, yang memvalidasi kode wilayah induk sebelum meneruskan,
hanya melewatkan `id` dan `name`, menutup aksesnya bagi pengunjung anonim agar
tidak menjadi proxy terbuka, dan menyimpan hasilnya sehari. Dengan begitu CSP
tetap tertutup dan riwayat pengisian form HRD tidak lagi sampai ke pihak ketiga.
Bila layanan asalnya mati, endpoint mengembalikan daftar kosong, bukan galat —
dropdown yang kosong lebih baik daripada form yang gagal dibuka.

**Sisa `no-explicit-any` dibereskan.** 38 error lint terakhir di halaman admin
lama dan empat route handler selesai: enam referensi `{...} | any` pada Data
Karyawan dan Divisi & Jabatan diganti tipe `Ref` yang benar-benar menyebutkan
kedua bentuk (populated dan id telanjang) beserta dua pembacanya, `as any` pada
select diganti union nilainya, dan fungsi pengambil data yang dipanggil
`useEffect` sebelum dideklarasikan dibungkus `useCallback` lalu dipindah ke
atas. `npm run lint` kini bersih dari error.

**Halaman Slip Gaji ditulis ulang.** Versi lama menelan kegagalan tanpa suara:
`POST /payroll` mengembalikan daftar kegagalan per karyawan, tetapi halamannya
menyetel pesan sukses lalu segera memanggil ulang data — yang mengosongkan pesan
itu pada baris berikutnya. Karyawan yang gagal diproses tidak menghasilkan
tampilan apa pun. Sekarang setiap alasan kegagalan ditampilkan sebagai daftar di
bawah formulir, dan hasil separuh berhasil dilaporkan sebagai peringatan, bukan
sebagai sukses.

---

## 4. Hal yang perlu diperhatikan

- **`NEXTAUTH_SECRET` tidak boleh diganti** setelah sistem berisi data: kunci itu
  dipakai mengenkripsi NIK, NPWP, dan rekening. Menggantinya membuat data
  tersebut tidak terbaca. Pakai `ENCRYPTION_KEY` terpisah bila ingin dapat
  merotasi kunci sesi.
- **Rate limiter bersifat per proses.** Di belakang beberapa instance, batasnya
  terkali jumlah instance. Ganti isi `hit()` di `lib/rate-limit.ts` dengan Redis
  INCR/EXPIRE saat sistem diskalakan mendatar — seluruh pemanggil sudah melewati
  satu fungsi itu.
- **Memutakhirkan dari versi lama:** pindahkan isi `public/uploads` ke
  `storage/uploads`, lalu pastikan `public/uploads` kosong. Record lama yang
  menyimpan URL `/uploads/...` tetap terbaca karena `toStorageKey()` menormalkan
  bentuk lama.
- **Data NIK/NPWP/rekening lama yang tersimpan plaintext** akan terenkripsi
  sendiri saat record berikutnya disimpan lewat form HRD. `decrypt()` dengan
  aman mengembalikan nilai apa adanya bila ternyata belum terenkripsi.
- **Indeks unik baru** (`attendances`, `overtime_records`,
  `holiday_swap_requests`, `candidates`) akan gagal dibuat bila data lama sudah
  mengandung duplikat. Bersihkan duplikatnya lebih dulu pada database yang sudah
  berjalan.

---

## 5. Yang belum dikerjakan

Diurutkan menurut nilainya:

1. **Face recognition** (`face-api.js`) — presensi saat ini memakai selfie
   manual dengan penanda `isManualFallback`. Titik integrasinya sudah tersedia.
2. **2FA (TOTP)** — field `is2faEnabled` dan `twoFactorSecret` sudah ada di model
   `User` tetapi alurnya belum dibuat.
3. **Kontrak kerja** — model dan pengingat kedaluwarsa sudah jalan, tetapi
   template builder dan generator PDF belum ada.
4. **Uji kompetensi** — bank soal dan penilaian otomatis.
5. **Offboarding formal** — pengajuan resign, clearance inventaris dan keuangan,
   surat pengalaman kerja otomatis.
6. **Ekspor Excel/PDF** — saat ini CSV; `exceljs` dan `@react-pdf/renderer`
   dapat ditambahkan tanpa mengubah lapisan data.
7. **Pengujian otomatis** — belum ada unit maupun e2e test. Kandidat pertama
   yang paling bernilai: `lib/time.ts`, `countLeaveDays`, dan mesin approval.
8. **Sisa peringatan lint.** `npm run lint` tidak lagi melaporkan error, tetapi
   masih ada sekitar 105 warning. Sebagian besar `react-hooks/set-state-in-effect`
   pada halaman yang memuat datanya lewat `useEffect`, sisanya variabel dan
   argumen yang tidak terpakai. Tidak ada yang salah secara perilaku; pola
   pemuatan datanya yang perlu diseragamkan, sebaiknya per halaman sambil
   menguji alurnya. Halaman-halaman itu sudah mengikuti design token
   baru dan berfungsi, tetapi internalnya belum diketik ulang. Membenahinya
   secara massal berisiko karena tidak dapat diuji tanpa basis data, jadi
   sebaiknya dikerjakan per halaman sambil menguji alurnya.
