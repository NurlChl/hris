# HRIS — Sistem Informasi Kepegawaian

Sistem HR berbasis web dengan dua ruang kerja dalam satu aplikasi:

- **Portal Karyawan** — presensi bergeofence, izin & cuti, tukar libur, slip
  gaji, inventaris, dan pengaduan.
- **Panel Admin** — data karyawan, jadwal & shift, persetujuan berjenjang,
  payroll, KPI, rekrutmen ATS, dan seluruh konfigurasi sistem.

Hampir semua aturan bisnis — toleransi keterlambatan, radius absen, kuota cuti,
alur persetujuan, tarif potongan — diatur dari CMS dan tersimpan di database,
bukan di kode program.

---

## Menjalankan

```bash
npm install
cp .env.example .env      # lalu isi MONGODB_URI dan NEXTAUTH_SECRET
npm run seed              # peran, hak akses, pengaturan, hari libur, akun demo
npm run dev
```

Buka <http://localhost:3000>.

Perintah lain:

```bash
npm run typecheck   # TypeScript tanpa emit
npm run build       # build produksi
npm start           # menjalankan hasil build
```

### Konfigurasi minimum

| Variabel | Keterangan |
|---|---|
| `MONGODB_URI` | Koneksi MongoDB |
| `NEXTAUTH_SECRET` | Kunci sesi. Juga dipakai menandatangani tautan berkas dan mengenkripsi data sensitif — **jangan diganti** setelah sistem berisi data |
| `NEXTAUTH_URL` | URL aplikasi, dipakai pada tautan di email |

Seluruh variabel lain terdokumentasi di [`.env.example`](.env.example).

### Akun demo

`npm run seed` membuat dua akun. Kata sandinya dicetak di akhir proses seeding,
atau tentukan sendiri lewat `SEED_ADMIN_PASSWORD` dan `SEED_STAFF_PASSWORD`.
**Ganti keduanya sebelum dipakai di produksi.**

---

## Tugas terjadwal

Beberapa aturan hanya dapat ditegakkan setelah harinya lewat — misalnya
membatalkan hak tukar libur ketika karyawan ternyata tidak masuk. Arahkan
penjadwal apa pun ke endpoint berikut sekali sehari setelah tengah malam WIB:

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://host-anda/api/v1/cron/daily
```

Tugasnya idempoten, jadi aman dijalankan ulang. Tanpa `CRON_SECRET`, endpoint
ini dinonaktifkan sepenuhnya.

---

## Dokumentasi

| Untuk siapa | Di mana |
|---|---|
| Pengguna akhir (semua peran) | `/docs` di dalam aplikasi |
| Bantuan singkat per peran | `/portal/help` |
| Referensi API | `/api-docs` |
| Developer | [`maintenance.md`](maintenance.md) |
| Spesifikasi fungsional asli | [`Instructions.md`](Instructions.md) |

---

## Catatan penting

- **Zona waktu.** Seluruh aturan HR dihitung dalam WIB (Asia/Jakarta), bukan
  zona waktu server maupun perangkat pengguna. Gunakan helper di
  `src/lib/time.ts` untuk setiap perhitungan tanggal.
- **Penyimpanan berkas.** Berkas disimpan di `storage/uploads`, sengaja di luar
  `public/`. Satu-satunya jalan membacanya adalah `/api/v1/storage/secure`, yang
  memeriksa sesi dan kepemilikan. Jangan pernah mengarahkan
  `LOCAL_STORAGE_PATH` ke dalam `public/`.
- **Data sensitif.** NIK, NPWP, dan nomor rekening terenkripsi AES-256-GCM.
  Hanya peran berlingkup seluruh perusahaan yang melihat nilai aslinya.
- **Rate limit.** Berbasis memori per proses. Untuk beberapa instance, ganti
  penyimpanannya dengan Redis di `src/lib/rate-limit.ts`.

---

## Struktur

```
src/
  app/
    admin/            Panel admin (CMS)
    portal/           Portal karyawan
    docs/             Dokumentasi dalam aplikasi
    career/           Halaman karir publik
    api/v1/           REST API
  components/
    ui/               Pustaka komponen bersama
    shell/            Kerangka aplikasi, navigasi, notifikasi
  lib/
    time.ts           Helper WIB — dipakai semua perhitungan tanggal
    guard.ts          Auth, RBAC, rate limit, validasi
    settings.ts       Registri aturan bisnis
    approval/         Mesin persetujuan polimorfik
    storage/          Adapter penyimpanan berkas
    rbac/             Pemeriksaan izin
  models/             Skema Mongoose
  scripts/seed.ts     Seeder idempoten
```
