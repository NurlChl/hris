/**
 * Documentation content, kept as data rather than JSX so the same source feeds
 * the sidebar, the in-page search, and the rendered body without duplication.
 */

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "note"; tone: "info" | "warning" | "danger" | "success"; title?: string; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "code"; text: string };

export interface DocSection {
  id: string;
  title: string;
  summary: string;
  /** Roles this section is written for. Empty array = relevant to everyone. */
  audience: string[];
  blocks: DocBlock[];
}

export interface DocChapter {
  id: string;
  title: string;
  sections: DocSection[];
}

export const ROLE_LABELS: Record<string, string> = {
  STAFF: "Karyawan",
  SPV: "Atasan / SPV",
  HRD: "HRD",
  AUDIT: "Audit",
  GA: "GA",
  DIREKSI: "Direksi",
  SUPERADMIN: "Superadmin",
};

export const CHAPTERS: DocChapter[] = [
  /* ================================================================ */
  {
    id: "mulai",
    title: "Memulai",
    sections: [
      {
        id: "gambaran",
        title: "Gambaran sistem",
        summary: "Apa saja yang bisa dikerjakan di HRIS dan siapa memakai bagian yang mana.",
        audience: [],
        blocks: [
          {
            type: "p",
            text:
              "HRIS ini terdiri dari dua ruang kerja. Portal Karyawan dipakai setiap orang untuk urusan dirinya sendiri: absen, cuti, tukar libur, slip gaji, inventaris, dan pengaduan. Panel Admin dipakai HRD, atasan, dan manajemen untuk mengelola data, menyetujui pengajuan, serta mengatur aturan yang berlaku di seluruh sistem.",
          },
          {
            type: "table",
            head: ["Peran", "Ruang kerja", "Tugas utama"],
            rows: [
              ["Karyawan (STAFF)", "Portal", "Presensi harian, pengajuan cuti dan koreksi absen, slip gaji, pengaduan"],
              ["Atasan (SPV)", "Portal + Admin", "Semua tugas karyawan, ditambah persetujuan tahap pertama untuk divisinya"],
              ["HRD", "Admin", "Data karyawan, jadwal, payroll, rekrutmen, dan persetujuan tahap kedua"],
              ["Audit", "Admin", "Membaca dan mengekspor seluruh data, memverifikasi pengajuan yang dieskalasi"],
              ["GA", "Admin", "Mengelola aset dan serah terima inventaris"],
              ["Direksi", "Admin", "Ringkasan eksekutif dan persetujuan tahap akhir"],
              ["Superadmin", "Admin", "Seluruh konfigurasi sistem, peran, dan hak akses"],
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Semua waktu dalam WIB",
            text:
              "Jam masuk, batas keterlambatan, dan tanggal pengajuan dihitung memakai zona waktu Asia/Jakarta, bukan jam perangkat Anda. Karyawan di zona waktu lain tetap dinilai dengan patokan yang sama.",
          },
        ],
      },
      {
        id: "login",
        title: "Masuk pertama kali",
        summary: "Cara masuk, apa yang terjadi bila lupa kata sandi, dan mengapa akun bisa terkunci.",
        audience: [],
        blocks: [
          {
            type: "steps",
            items: [
              "Buka halaman utama, lalu pilih Portal Karyawan. Administrator memakai tautan Masuk lewat panel admin.",
              "Masukkan email kantor dan kata sandi awal yang diberikan HRD.",
              "Pada login pertama, sistem mengarahkan Anda ke halaman Profil & Keamanan untuk mengganti kata sandi. Menu lain terkunci sampai langkah ini selesai.",
              "Klik Kirim kode verifikasi, buka email Anda, lalu masukkan kode 6 angka bersama kata sandi lama dan kata sandi baru.",
            ],
          },
          {
            type: "note",
            tone: "warning",
            title: "Akun terkunci sementara",
            text:
              "Setelah beberapa kali kata sandi salah berturut-turut, akun dikunci selama beberapa menit. Ini melindungi akun Anda dari percobaan tebak kata sandi. Tunggu hingga masa kunci berakhir, atau pakai menu Lupa Kata Sandi.",
          },
          {
            type: "list",
            items: [
              "Kata sandi minimal 10 karakter dan harus memuat huruf besar, huruf kecil, serta angka.",
              "Kata sandi baru tidak boleh sama dengan kata sandi awal bawaan sistem.",
              "Kode verifikasi hanya berlaku 10 menit dan sekali pakai.",
              "Jangan pernah membagikan kode verifikasi — staf HRD maupun IT tidak akan pernah memintanya.",
            ],
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "presensi",
    title: "Presensi",
    sections: [
      {
        id: "absen-harian",
        title: "Melakukan absen harian",
        summary: "Urutan tahapan absen, syarat foto, dan syarat lokasi.",
        audience: ["STAFF", "SPV"],
        blocks: [
          {
            type: "p",
            text:
              "Halaman Presensi Mandiri hanya menampilkan satu tombol: tahap berikutnya yang boleh Anda lakukan. Urutannya dijaga sistem sehingga Anda tidak bisa absen pulang sebelum absen masuk, atau absen masuk dua kali dalam sehari.",
          },
          {
            type: "steps",
            items: [
              "Buka menu Presensi Mandiri. Sistem meminta izin lokasi — pilih Izinkan.",
              "Tunggu koordinat muncul. Perhatikan angka akurasi; bila di atas 100 meter, dekati jendela atau area terbuka lalu tekan tombol perbarui.",
              "Bila diminta foto, tekan Nyalakan kamera lalu Ambil foto. Foto dipakai untuk memverifikasi bahwa Anda sendiri yang absen.",
              "Tekan tombol tahap yang aktif (Absen Masuk / Mulai Istirahat / Selesai Istirahat / Absen Pulang), lalu konfirmasi.",
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Waktu diambil dari server",
            text:
              "Jam yang tercatat adalah jam server dalam WIB, bukan jam perangkat Anda. Mengubah jam di ponsel tidak akan mengubah catatan presensi.",
          },
        ],
      },
      {
        id: "radius",
        title: "Radius kantor dan kendala lokasi",
        summary: "Kenapa absen bisa ditolak, dan apa yang harus dilakukan bila GPS bermasalah.",
        audience: ["STAFF", "SPV", "HRD"],
        blocks: [
          {
            type: "p",
            text:
              "Setiap cabang punya titik koordinat dan radius sendiri. Absen di luar radius akan ditolak, kecuali dalam tiga keadaan berikut.",
          },
          {
            type: "table",
            head: ["Keadaan", "Yang terjadi", "Tindakan"],
            rows: [
              [
                "Anda berada di cabang lain",
                "Absen diterima dan ditandai Lintas Cabang",
                "Tidak perlu tindakan; HRD akan meninjau",
              ],
              [
                "Anda punya izin WFH / Dinas Luar yang sudah disetujui",
                "Radius tidak diperiksa untuk rentang tanggal tersebut",
                "Ajukan izin WFH/Dinas Luar sebelum harinya tiba",
              ],
              [
                "GPS meleset padahal Anda di kantor",
                "Absen diterima lewat menu Kendala Lokasi dan ditandai untuk ditinjau",
                "Aktifkan tombol Kendala Lokasi dan tulis alasan yang jelas",
              ],
            ],
          },
          {
            type: "note",
            tone: "danger",
            title: "Kendala Lokasi bukan jalan pintas",
            text:
              "Setiap pemakaian menu ini ditandai dan muncul di daftar tinjauan HRD lengkap dengan koordinat, jarak, dan alasan yang Anda tulis. Memakainya saat tidak benar-benar berada di kantor adalah pelanggaran kedisiplinan.",
          },
        ],
      },
      {
        id: "koreksi",
        title: "Koreksi absen",
        summary: "Cara memperbaiki jam yang keliru atau lupa tercatat, beserta kuota bulanannya.",
        audience: ["STAFF", "SPV", "HRD"],
        blocks: [
          {
            type: "p",
            text:
              "Koreksi absen memperbaiki catatan historis — misalnya Anda lupa tap saat tiba di kantor. Koreksi bukan pengganti kewajiban absen: Anda tetap harus melakukan presensi normal pada hari berjalan.",
          },
          {
            type: "steps",
            items: [
              "Buka Presensi Mandiri, pilih tab Koreksi Absen, lalu tekan Ajukan koreksi.",
              "Pilih tanggal yang ingin dikoreksi (hanya dalam rentang hari terakhir yang diizinkan HRD).",
              "Isi jam masuk dan jam pulang yang seharusnya.",
              "Pilih kategori alasan, lalu jelaskan kronologinya minimal 15 karakter.",
              "Kirim. Pengajuan diteruskan ke atasan, lalu HRD.",
            ],
          },
          {
            type: "note",
            tone: "warning",
            title: "Kuota bulanan",
            text:
              "Jumlah koreksi per bulan dibatasi. Bila kuota habis, pengajuan berikutnya tidak ditolak otomatis, tetapi naik ke jalur persetujuan berlapis HRD → Audit → Direksi. Kategori alasan yang Anda pilih dipakai HRD untuk melihat pola kendala yang berulang.",
          },
        ],
      },
      {
        id: "jadwal",
        title: "Jadwal kerja dan keterlambatan",
        summary: "Bagaimana sistem menentukan Anda terlambat atau tidak.",
        audience: [],
        blocks: [
          {
            type: "p",
            text:
              "Sistem membandingkan jam absen masuk Anda dengan jadwal yang berlaku hari itu. Jadwal diambil dengan urutan: jadwal shift yang ditugaskan khusus untuk Anda pada tanggal tersebut, lalu jam operasional cabang penempatan Anda sebagai cadangan.",
          },
          {
            type: "list",
            items: [
              "Toleransi keterlambatan diatur HRD dan bisa berbeda per jadwal kerja.",
              "Toleransi hanya menentukan apakah Anda ditandai terlambat. Menit keterlambatan tetap dihitung dari jam jadwal, bukan dari akhir masa toleransi.",
              "Jam jadwal yang berlaku disimpan bersama catatan presensi, sehingga perubahan roster di kemudian hari tidak mengubah riwayat lama.",
            ],
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "cuti",
    title: "Izin, Cuti & Tukar Libur",
    sections: [
      {
        id: "ajukan-cuti",
        title: "Mengajukan izin atau cuti",
        summary: "Alur pengajuan, syarat bukti, dan cara membaca saldo.",
        audience: ["STAFF", "SPV"],
        blocks: [
          {
            type: "steps",
            items: [
              "Buka menu Izin & Cuti lalu tekan Ajukan izin / cuti.",
              "Pilih jenisnya. Kotak informasi akan menampilkan sisa saldo, batas H- pengajuan, dan apakah bukti diperlukan.",
              "Pilih tanggal mulai dan selesai. Kalender otomatis membatasi tanggal yang melanggar aturan H-.",
              "Tulis alasan minimal 10 karakter, lampirkan bukti bila diminta, lalu kirim.",
            ],
          },
          {
            type: "note",
            tone: "success",
            title: "Akhir pekan tidak memotong saldo",
            text:
              "Pada mode perhitungan hari kerja, Sabtu, Minggu, dan tanggal merah di dalam rentang pengajuan tidak memotong kuota cuti Anda. Kolom durasi menampilkan hari kerja dan hari kalender secara terpisah agar bedanya terlihat.",
          },
          {
            type: "table",
            head: ["Kolom saldo", "Artinya"],
            rows: [
              ["Sisa", "Hari yang masih bisa Anda ajukan"],
              ["Terpakai", "Hari dari pengajuan yang sudah disetujui"],
              ["Menunggu approval", "Hari yang sedang ditahan untuk pengajuan berjalan"],
            ],
          },
          {
            type: "p",
            text:
              "Saat Anda mengirim pengajuan, saldo langsung ditahan agar tidak bisa dipakai dua kali. Bila pengajuan ditolak atau Anda batalkan, saldo dikembalikan otomatis.",
          },
        ],
      },
      {
        id: "batal-cuti",
        title: "Membatalkan pengajuan",
        summary: "Kapan pengajuan masih bisa ditarik kembali.",
        audience: ["STAFF", "SPV"],
        blocks: [
          {
            type: "p",
            text:
              "Pengajuan dapat dibatalkan sendiri selama belum ada satu pun approver yang menekan tombol setuju atau tolak. Setelah proses berjalan, pembatalan harus lewat HRD agar jejak persetujuannya tetap utuh.",
          },
        ],
      },
      {
        id: "tukar-libur",
        title: "Tukar libur",
        summary: "Menukar tanggal merah dengan hari libur pengganti, beserta syaratnya.",
        audience: ["STAFF", "SPV", "HRD"],
        blocks: [
          {
            type: "p",
            text:
              "Bila Anda bersedia masuk pada tanggal merah, Anda dapat menukarnya dengan libur di hari kerja lain. Aturan berikut dijaga sistem secara otomatis.",
          },
          {
            type: "list",
            items: [
              "Pengajuan minimal H- sekian sebelum tanggal merah, sesuai pengaturan HRD.",
              "Satu tanggal merah hanya bisa ditukar satu kali oleh orang yang sama.",
              "Tanggal pengganti harus hari kerja — bukan akhir pekan dan bukan tanggal merah lain.",
              "Rekan satu divisi tidak boleh mengambil tanggal pengganti yang sama, agar divisi tidak kosong.",
              "Ada batas jumlah tanggal merah berdekatan yang boleh ditukar sekaligus.",
            ],
          },
          {
            type: "note",
            tone: "danger",
            title: "Hak libur gugur bila Anda tidak masuk",
            text:
              "Hak libur pengganti hanya berlaku bila Anda benar-benar tercatat absen masuk pada tanggal merah tersebut. Bila hari itu Anda tidak masuk, pengajuan otomatis ditandai gugur meskipun sudah disetujui.",
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "approval",
    title: "Persetujuan",
    sections: [
      {
        id: "cara-menyetujui",
        title: "Memproses antrean persetujuan",
        summary: "Cara approver membaca dan memutuskan pengajuan.",
        audience: ["SPV", "HRD", "AUDIT", "DIREKSI", "SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Menu Persetujuan menampilkan seluruh pengajuan yang menunggu keputusan peran Anda. Atasan hanya melihat pengajuan dari divisinya sendiri; HRD, Audit, dan Direksi melihat seluruh perusahaan.",
          },
          {
            type: "steps",
            items: [
              "Baca ringkasan: jenis pengajuan, periode, durasi, dan alasan pemohon.",
              "Bila ada lampiran, buka dan periksa sebelum memutuskan. Tautan lampiran hanya berlaku beberapa menit.",
              "Perhatikan jejak langkah di bagian bawah kartu untuk melihat siapa yang sudah menyetujui sebelum Anda.",
              "Tekan Setujui atau Tolak. Penolakan wajib disertai alasan minimal 5 karakter karena pemohon akan membacanya.",
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Alur berjenjang",
            text:
              "Setelah Anda menyetujui, pengajuan otomatis diteruskan ke approver berikutnya beserta notifikasinya. Bila Anda adalah langkah terakhir, efeknya langsung berlaku: saldo cuti dipotong, atau catatan presensi diperbaiki.",
          },
        ],
      },
      {
        id: "atur-alur",
        title: "Mengubah alur persetujuan",
        summary: "Menentukan siapa saja approver dan urutannya.",
        audience: ["SUPERADMIN", "HRD"],
        blocks: [
          {
            type: "p",
            text:
              "Alur persetujuan tersimpan sebagai data, bukan kode program. Untuk setiap jenis transaksi (cuti, koreksi absen, tukar libur) Anda menentukan urutan peran approver. Perubahan berlaku untuk pengajuan baru; pengajuan yang sedang berjalan tetap memakai alur saat dikirim, agar jejaknya konsisten.",
          },
          {
            type: "note",
            tone: "warning",
            title: "Pengecualian kuota koreksi absen",
            text:
              "Koreksi absen yang melebihi kuota bulanan selalu memakai alur khusus HRD → Audit → Direksi, terlepas dari alur normal yang Anda atur.",
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "payroll",
    title: "Payroll & Slip Gaji",
    sections: [
      {
        id: "slip-karyawan",
        title: "Membaca slip gaji Anda",
        summary: "Isi slip gaji dan dasar perhitungannya.",
        audience: ["STAFF", "SPV"],
        blocks: [
          {
            type: "p",
            text:
              "Slip gaji tersimpan permanen dan dapat dibuka kapan saja lewat menu Slip Gaji Saya. Tekan Rincian untuk melihat komponen penghasilan dan potongan, atau Unduh untuk menyimpan dokumen lengkapnya.",
          },
          {
            type: "list",
            items: [
              "Penghasilan terdiri dari gaji pokok, tunjangan, dan lembur yang sudah disetujui.",
              "Potongan mencakup keterlambatan, alpha, BPJS, dan PPh 21 dengan tarif yang diatur perusahaan.",
              "Hari cuti yang sudah disetujui tidak dihitung sebagai alpha.",
              "Bagian bawah slip menampilkan jumlah kehadiran dari total hari kerja sebagai dasar perhitungan.",
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Bila ada selisih",
            text:
              "Ajukan keberatan ke HRD paling lambat 7 hari sejak slip diterbitkan. Setiap kali slip dibuka atau diunduh, aktivitas tersebut tercatat di log audit.",
          },
        ],
      },
      {
        id: "generate-payroll",
        title: "Menerbitkan slip gaji",
        summary: "Proses generate periode dan arti mode draf.",
        audience: ["HRD", "SUPERADMIN"],
        blocks: [
          {
            type: "steps",
            items: [
              "Pastikan tarif potongan dan lembur di Pengaturan → Payroll sudah sesuai kebijakan berjalan.",
              "Pastikan data presensi bulan tersebut sudah final, termasuk koreksi absen yang disetujui.",
              "Buka menu Slip Gaji, pilih periode, lalu pilih karyawan yang akan diproses.",
              "Jalankan dalam mode draf lebih dulu bila angkanya perlu ditinjau Finance. Draf tidak terlihat oleh karyawan.",
              "Setelah yakin, terbitkan. Karyawan menerima notifikasi otomatis.",
            ],
          },
          {
            type: "note",
            tone: "warning",
            title: "Slip yang sudah terbit tidak bisa dihapus",
            text:
              "Demi jejak audit, slip berstatus terbit hanya bisa direvisi dengan menghasilkan ulang periode yang sama, bukan dihapus. Hanya draf yang dapat dihapus.",
          },
          {
            type: "note",
            tone: "info",
            title: "Bila ada karyawan yang gagal diproses",
            text:
              "Daftar kegagalan muncul di bawah formulir beserta alasannya, satu baris per karyawan. Penyebab paling sering adalah karyawan belum punya kontrak aktif bernominal gaji sementara Gaji pokok default di Pengaturan juga masih nol. Perbaiki penyebabnya, lalu jalankan ulang untuk karyawan tersebut saja.",
          },
        ],
      },
      {
        id: "template-slip",
        title: "Merancang template slip gaji",
        summary: "Menyusun tata letak slip dari blok, dan mencetaknya sebagai PDF.",
        audience: ["HRD", "SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Slip gaji disusun dari blok berurutan, bukan kanvas bebas. Anda menentukan blok mana yang tampil, dalam urutan apa, dengan judul apa, dan kolom identitas mana yang dicetak. Karena blok mengalir mengikuti isinya, slip tetap rapi walau seorang karyawan punya baris tunjangan lebih banyak daripada yang lain.",
          },
          {
            type: "steps",
            items: [
              "Buka Slip Gaji, lalu tekan Template slip gaji di kanan atas.",
              "Tekan Template baru, atau pilih template yang ada untuk menyuntingnya.",
              "Isi identitas perusahaan pada bagian Identitas. Nilai ini yang tercetak di kop dokumen.",
              "Nyalakan atau matikan blok sesuai kebutuhan, lalu geser urutannya. Kosongkan kolom judul bila ingin memakai judul bawaan blok.",
              "Pilih kolom identitas karyawan yang perlu tampil, misalnya NIP, jabatan, status pajak, dan nomor rekening.",
              "Pratinjau di sebelah kanan memakai angka contoh dan ikut berubah seketika. Simpan bila sudah sesuai.",
              "Tandai satu template sebagai Utama. Template itu yang dipakai bila sebuah slip tidak menunjuk template tertentu.",
            ],
          },
          {
            type: "table",
            head: ["Blok", "Isinya"],
            rows: [
              ["Kop dokumen", "Nama perusahaan, alamat, judul dokumen, dan periode."],
              ["Identitas karyawan", "Kolom yang Anda pilih, disusun satu atau dua kolom."],
              ["Rincian penghasilan", "Gaji pokok, tunjangan, dan lembur."],
              ["Rincian potongan", "Keterlambatan, alpha, BPJS, dan PPh 21."],
              ["Gaji bersih", "Nominal diterima, dengan pilihan menampilkan terbilang."],
              ["Ringkasan kehadiran", "Hari kerja, hadir, keterlambatan, dan alpha."],
              ["Catatan kaki", "Teks bebas, misalnya ketentuan pengajuan keberatan."],
              ["Kolom tanda tangan", "Satu atau dua kolom tanda tangan."],
            ],
          },
          {
            type: "p",
            text:
              "Untuk mencetak, tekan Cetak pada baris slip di daftar. Halaman dokumen terbuka lalu memanggil dialog cetak peramban. Pilih tujuan Save as PDF untuk menyimpannya sebagai berkas, dan aktifkan opsi Background graphics agar warna serta garis tabel ikut tercetak.",
          },
          {
            type: "note",
            tone: "info",
            title: "Punya dokumen sendiri?",
            text:
              "Setel mode template menjadi Unggah bila perusahaan sudah memiliki format slip sendiri. Dengan mode itu Anda melampirkan berkas per periode alih-alih menyusunnya dari blok.",
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "rekrutmen",
    title: "Lowongan & Pelamar",
    sections: [
      {
        id: "buat-loker",
        title: "Memasang lowongan",
        summary: "Menyusun lowongan dan menerbitkannya ke halaman karier.",
        audience: ["HRD", "SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Lowongan berbeda dari jabatan. Jabatan adalah entri tetap pada struktur organisasi yang ditunjuk karyawan; lowongan terikat waktu dan boleh dibuka berkali-kali untuk jabatan yang sama. Karena itu membuka lowongan tidak menambah apa pun ke struktur organisasi.",
          },
          {
            type: "steps",
            items: [
              "Buka menu Lowongan Kerja, lalu tekan Buat lowongan.",
              "Langkah Detail: isi judul, jabatan, divisi, cabang, tipe kerja, penempatan, dan jumlah kebutuhan.",
              "Langkah Konten: tulis ringkasan, tanggung jawab, kualifikasi, dan benefit. Setiap poin ditulis satu baris.",
              "Langkah Proses: tentukan tahap seleksi. Minimal dua tahap, dan urutannya boleh berbeda antar lowongan.",
              "Simpan sebagai draf untuk ditinjau lebih dulu, atau langsung terbitkan.",
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Menampilkan rentang gaji",
            text:
              "Rentang gaji hanya tampil di halaman karier bila Tampilkan gaji dinyalakan. Bila dimatikan, nominalnya tetap tersimpan untuk keperluan internal tetapi tidak dipublikasikan.",
          },
          {
            type: "note",
            tone: "warning",
            title: "Lowongan berpelamar tidak dapat dihapus",
            text:
              "Begitu ada satu pelamar masuk, lowongan hanya bisa ditutup atau diarsipkan. Menghapusnya akan memutus riwayat pelamar dari konteks lamarannya.",
          },
        ],
      },
      {
        id: "proses-pelamar",
        title: "Memproses pelamar",
        summary: "Papan seleksi, penolakan, dan perekrutan menjadi karyawan.",
        audience: ["HRD", "SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Tekan sebuah lowongan untuk membuka papan pelamarnya. Kolom pada papan itu adalah tahap seleksi yang Anda tetapkan saat membuat lowongan, dan setiap pelamar berada tepat di satu kolom.",
          },
          {
            type: "steps",
            items: [
              "Tekan kartu pelamar untuk membaca datanya, mengunduh CV, dan melihat riwayat perpindahannya.",
              "Tekan Tahap berikutnya untuk meluluskan, atau Tolak dan tuliskan alasannya.",
              "Untuk pelamar yang masuk lewat jalur lain, misalnya referensi karyawan, gunakan Tambah pelamar.",
              "Pada tahap akhir, tekan Rekrut untuk mengubah pelamar menjadi karyawan.",
            ],
          },
          {
            type: "p",
            text:
              "Saat merekrut, isi cabang, divisi, jabatan, tanggal masuk, dan email kantor. Sistem membuat data karyawan sekaligus akun penggunanya, memberi NIP berurutan, lalu menutup lowongan bila jumlah kebutuhannya sudah terpenuhi.",
          },
          {
            type: "note",
            tone: "info",
            title: "Alasan penolakan tidak terkirim otomatis",
            text:
              "Alasan yang Anda tulis tersimpan sebagai catatan internal pada riwayat pelamar. Kabar kepada pelamar tetap dikirim manual agar redaksinya dapat disesuaikan.",
          },
        ],
      },
      {
        id: "halaman-karier",
        title: "Halaman karier dan alur melamar",
        summary: "Apa yang dilihat pelamar dan bagaimana lamaran masuk.",
        audience: ["HRD", "SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Halaman karier di alamat /career memuat seluruh lowongan berstatus terbuka yang belum melewati tanggal tutup. Pelamar dapat menyaring menurut divisi, tipe kerja, dan penempatan, lalu membuka detail lowongan lewat alamat yang memakai slug, bukan ID.",
          },
          {
            type: "list",
            items: [
              "Pelamar mengisi nama, email, telepon, dan mengunggah CV berformat PDF. Surat pengantar dan tautan portofolio bersifat opsional.",
              "Satu email hanya boleh melamar satu kali per lowongan, sehingga orang yang sama tetap dapat melamar lowongan lain.",
              "Lamaran yang masuk langsung muncul di kolom pertama papan pelamar.",
              "Penghitung kunjungan pada kartu lowongan hanya bertambah saat halaman detail dibuka, bukan saat daftar ditampilkan.",
            ],
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "kpi",
    title: "KPI & Kinerja",
    sections: [
      {
        id: "template-kpi",
        title: "Menyusun template penilaian",
        summary: "Aspek, indikator, bobot, skala nilai, dan ambang predikat.",
        audience: ["HRD", "SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Template menentukan bentuk formulir penilaian. Indikator tidak berdiri sendiri melainkan bersarang di dalam aspek, sama seperti formulir penilaian yang ditulis manual: satu aspek Kualitas Kerja berbobot 40% yang memuat beberapa indikator di dalamnya.",
          },
          {
            type: "steps",
            items: [
              "Buka KPI & Kinerja, pilih tab Template, lalu tekan Baru.",
              "Isi nama template, periode penilaian, dan skala nilai yang dilihat penilai.",
              "Tambahkan aspek beserta bobotnya. Total bobot seluruh aspek harus 100%.",
              "Di dalam tiap aspek, tambahkan indikator beserta bobot dan targetnya. Total bobot indikator dalam satu aspek juga harus 100%.",
              "Atur ambang predikat bila ingin berbeda dari bawaan, lalu simpan.",
            ],
          },
          {
            type: "table",
            head: ["Pengaturan", "Pengaruhnya"],
            rows: [
              ["Periode penilaian", "Menentukan format periode: bulanan menulis 2026-09, triwulanan menulis 2026-Q3, tahunan menulis 2026."],
              ["Skala nilai", "Bentuk input yang dilihat penilai. Nilai selalu disimpan sebagai 0-100, apa pun skalanya."],
              ["Bobot aspek", "Porsi aspek tersebut terhadap nilai akhir."],
              ["Bobot indikator", "Porsi indikator di dalam aspeknya, bukan terhadap nilai akhir."],
              ["Predikat", "Ambang bawah tiap label, misalnya 90 untuk Sangat Baik."],
              ["Penilaian mandiri", "Memberi karyawan kolom nilai sendiri sebelum atasan menilai."],
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Menyunting template tidak mengubah penilaian lama",
            text:
              "Setiap penilaian menyimpan salinan bentuk template saat penilaian itu dibuat. Anda bebas merombak template untuk siklus berikutnya tanpa mengubah appraisal yang sudah ditandatangani.",
          },
          {
            type: "note",
            tone: "warning",
            title: "Template terpakai tidak dapat dihapus",
            text:
              "Template yang sudah dipakai menilai hanya bisa dinonaktifkan. Template nonaktif tidak muncul lagi saat membuat penilaian baru, tetapi penilaian lama tetap terbaca.",
          },
        ],
      },
      {
        id: "menilai",
        title: "Menilai karyawan",
        summary: "Mengisi formulir, mengirim, dan memfinalkan penilaian.",
        audience: ["SPV", "HRD", "SUPERADMIN"],
        blocks: [
          {
            type: "steps",
            items: [
              "Buka KPI & Kinerja, pilih tab Penilaian, lalu tekan Buat penilaian.",
              "Pilih karyawan dan template. Formulirnya muncul lengkap dengan indikator dan bobotnya.",
              "Periode terisi otomatis mengikuti irama template, dan tetap dapat Anda ubah.",
              "Beri nilai tiap indikator. Nilai sementara di bagian atas ikut berubah setiap kali Anda menilai.",
              "Isi kekuatan, hal yang perlu ditingkatkan, rencana pengembangan, dan rekomendasi.",
              "Simpan sebagai draf bila belum selesai, atau Kirim ke karyawan bila sudah.",
            ],
          },
          {
            type: "table",
            head: ["Status", "Artinya"],
            rows: [
              ["Draf", "Masih Anda kerjakan. Belum terlihat oleh karyawan."],
              ["Menunggu tanggapan", "Sudah dikirim. Karyawan dapat membaca dan menanggapinya."],
              ["Sudah ditanggapi", "Karyawan sudah membaca dan, bila mau, meninggalkan komentar."],
              ["Final", "Dikunci HRD. Tidak dapat disunting lagi dan dapat diunduh karyawan."],
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Menarik kembali penilaian",
            text:
              "Tombol Tarik mengembalikan penilaian ke draf, tetapi hanya selama karyawan belum menanggapinya. Setelah ditanggapi, perbaikan dilakukan dengan penilaian baru agar riwayatnya tetap utuh.",
          },
          {
            type: "p",
            text:
              "Tekan Cetak untuk membuka formulir penilaian dalam bentuk dokumen. Halaman itu memanggil dialog cetak peramban; pilih tujuan Save as PDF untuk menyimpannya.",
          },
        ],
      },
      {
        id: "tanggapi-kpi",
        title: "Menanggapi penilaian Anda",
        summary: "Membaca hasil penilaian dan memberi tanggapan.",
        audience: ["STAFF", "SPV"],
        blocks: [
          {
            type: "p",
            text:
              "Penilaian yang sudah dikirim atasan muncul di menu Penilaian Kinerja pada portal. Anda melihat nilai tiap indikator beserta bobotnya, nilai akhir, predikat, dan catatan atasan. Penilaian yang masih berstatus draf tidak pernah terlihat.",
          },
          {
            type: "steps",
            items: [
              "Buka Penilaian Kinerja, lalu pilih periode yang ingin dibaca.",
              "Telusuri nilai per aspek dan catatan pada tiap indikator.",
              "Tekan Tanggapi. Anda boleh menuliskan komentar, boleh juga mengosongkannya.",
              "Setelah HRD memfinalkan, dokumen penilaian dapat Anda unduh kapan saja.",
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Menanggapi bukan berarti menyetujui",
            text:
              "Tanggapan menandakan Anda sudah membaca hasil penilaian. Bila ada yang keliru, tuliskan pada kolom komentar; catatan itu ikut tercetak pada dokumen penilaian.",
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "admin",
    title: "Administrasi Sistem",
    sections: [
      {
        id: "pengaturan",
        title: "Mengubah aturan bisnis",
        summary: "Semua tolok ukur sistem dan cara mengubahnya tanpa deploy ulang.",
        audience: ["SUPERADMIN", "HRD"],
        blocks: [
          {
            type: "p",
            text:
              "Menu Pengaturan Sistem mengelompokkan seluruh aturan bisnis ke dalam beberapa bagian. Nilai yang Anda ubah ditandai, dan tombol simpan hanya mengirim kunci yang benar-benar berubah sehingga dua administrator dapat bekerja di bagian berbeda tanpa saling menimpa.",
          },
          {
            type: "table",
            head: ["Bagian", "Contoh yang diatur"],
            rows: [
              ["Identitas Perusahaan", "Nama dan alamat yang tercetak di slip gaji serta email"],
              ["Presensi", "Toleransi telat, radius default, wajib selfie, kuota koreksi absen"],
              ["Izin & Cuti", "Mode perhitungan hari, ambang wajib bukti, izin pembatalan mandiri"],
              ["Tukar Libur & Lembur", "Batas H-, setengah hari, bentrok divisi, lembur otomatis"],
              ["Payroll", "Tarif potongan telat, upah lembur, persentase BPJS dan PPh 21"],
              ["Keamanan", "Panjang minimal kata sandi, batas percobaan login, durasi kunci akun"],
              ["Notifikasi", "Menyalakan atau mematikan kanal email, WhatsApp, dan notifikasi aplikasi"],
            ],
          },
          {
            type: "note",
            tone: "success",
            title: "Berlaku seketika",
            text:
              "Perubahan pengaturan langsung dipakai pada permintaan berikutnya. Tidak perlu restart server maupun deploy ulang.",
          },
        ],
      },
      {
        id: "peran",
        title: "Peran dan hak akses",
        summary: "Menyusun matriks modul × aksi × lingkup untuk setiap peran.",
        audience: ["SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Hak akses disusun sebagai matriks. Untuk setiap modul Anda mencentang aksi yang boleh dilakukan, lalu memilih lingkup data yang boleh dilihat.",
          },
          {
            type: "table",
            head: ["Lingkup", "Data yang terlihat"],
            rows: [
              ["Data sendiri", "Hanya catatan milik pengguna itu sendiri"],
              ["Satu divisi", "Seluruh karyawan pada divisi yang sama"],
              ["Satu cabang", "Seluruh karyawan pada cabang penempatan yang sama"],
              ["Seluruh perusahaan", "Semua data tanpa batas"],
            ],
          },
          {
            type: "list",
            items: [
              "Modul tanpa satu pun centang berarti peran tersebut tidak memiliki akses ke modul itu.",
              "Peran SUPERADMIN tidak dapat dibatasi karena melewati tabel hak akses. Buat peran baru bila Anda memerlukan administrator dengan akses terbatas.",
              "Peran STAFF wajib tetap dapat membaca presensi dan cuti miliknya sendiri.",
              "Peran yang masih dipakai akun tidak dapat dihapus; pindahkan akunnya terlebih dahulu.",
            ],
          },
          {
            type: "note",
            tone: "warning",
            title: "Nama modul menentukan pemeriksaan di server",
            text:
              "Setiap permintaan API memeriksa kombinasi modul dan aksi ini di basis data. Menyembunyikan menu saja tidak cukup — izin yang benar di sinilah yang menjadi penjaga sesungguhnya.",
          },
        ],
      },
      {
        id: "hari-libur",
        title: "Hari libur nasional",
        summary: "Mengapa kalender ini harus diisi dan beda kedua jenisnya.",
        audience: ["SUPERADMIN", "HRD"],
        blocks: [
          {
            type: "p",
            text:
              "Kalender hari libur memengaruhi tiga hal sekaligus: perhitungan hari cuti, daftar tanggal yang boleh ditukar libur, dan jumlah hari kerja yang dipakai payroll untuk menghitung alpha. Mengisi kalender di awal tahun adalah langkah persiapan yang paling penting.",
          },
          {
            type: "table",
            head: ["Jenis", "Memotong saldo cuti?", "Bisa ditukar libur?"],
            rows: [
              ["Libur nasional", "Tidak", "Ya"],
              ["Cuti bersama", "Ya", "Tidak"],
            ],
          },
        ],
      },
      {
        id: "karyawan",
        title: "Mengelola data karyawan",
        summary: "Menambah karyawan, data sensitif, dan menonaktifkan akun.",
        audience: ["HRD", "SUPERADMIN"],
        blocks: [
          {
            type: "steps",
            items: [
              "Buka Data Karyawan lalu tambah karyawan baru. NIP dibuat otomatis dengan format EMP-TAHUN-NOMOR.",
              "Isi data diri, penempatan cabang dan divisi, lalu pilih peran akun agar login otomatis dibuat.",
              "Sampaikan kata sandi awal secara aman. Karyawan wajib menggantinya saat login pertama.",
              "Setelah karyawan aktif, ia dapat melengkapi sendiri data kontak, alamat domisili, dan media sosialnya.",
            ],
          },
          {
            type: "note",
            tone: "danger",
            title: "Data sensitif terenkripsi",
            text:
              "NIK, NPWP, dan nomor rekening disimpan terenkripsi. Hanya peran dengan lingkup seluruh perusahaan yang melihat nilai aslinya; peran lain melihat versi tersamar. Log audit pun menyimpan penanda, bukan nilainya.",
          },
          {
            type: "note",
            tone: "info",
            title: "Karyawan tidak dihapus, tetapi dinonaktifkan",
            text:
              "Menghapus baris karyawan akan memutus riwayat presensi, payroll, dan audit yang mengacu padanya. Karena itu tombol hapus mengubah status menjadi resign dan menutup akses login, sementara seluruh riwayat tetap tersimpan.",
          },
        ],
      },
      {
        id: "laporan",
        title: "Mengekspor laporan",
        summary: "Mengunduh data presensi, cuti, payroll, dan karyawan.",
        audience: ["HRD", "AUDIT", "DIREKSI", "SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Laporan diekspor sebagai berkas CSV yang dapat langsung dibuka di Excel maupun Google Sheets. Setiap ekspor tercatat di log audit lengkap dengan siapa yang mengunduh, kapan, dan berapa baris.",
          },
          {
            type: "code",
            text: "/api/v1/reports/export?dataset=attendance&period=2026-07",
          },
          {
            type: "list",
            items: [
              "dataset: attendance, leave, payroll, employees, atau corrections",
              "period: bulan dalam format YYYY-MM",
              "Peran Anda harus memiliki aksi Ekspor pada modul terkait.",
            ],
          },
        ],
      },
      {
        id: "audit",
        title: "Log audit",
        summary: "Apa saja yang dicatat dan bagaimana membacanya.",
        audience: ["AUDIT", "SUPERADMIN", "DIREKSI"],
        blocks: [
          {
            type: "p",
            text:
              "Sistem mencatat aktivitas yang berkonsekuensi: login dan penguncian akun, perubahan data karyawan, seluruh keputusan persetujuan, pembuatan slip gaji, pembukaan dokumen sensitif, perubahan pengaturan, dan perubahan hak akses.",
          },
          {
            type: "list",
            items: [
              "Setiap entri menyimpan siapa, aksi apa, modul, nilai sebelum dan sesudah, alamat IP, perangkat, dan waktu.",
              "Pengaduan anonim dicatat tanpa identitas pelapor, agar log audit sendiri tidak membocorkan anonimitas.",
              "Nilai terenkripsi ditampilkan sebagai penanda, bukan nilai aslinya.",
            ],
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "pengaduan",
    title: "Pengaduan",
    sections: [
      {
        id: "cara-mengadu",
        title: "Menyampaikan pengaduan",
        summary: "Alur pelaporan dan cara kerja opsi anonim.",
        audience: [],
        blocks: [
          {
            type: "steps",
            items: [
              "Buka menu Pengaduan, lalu tekan Buat pengaduan.",
              "Pilih tujuan laporan: atasan langsung, HRD, atau Direksi untuk kasus sensitif.",
              "Pilih kategori, tulis judul singkat, lalu uraikan kejadian minimal 30 karakter.",
              "Lampirkan bukti bila ada, aktifkan opsi anonim bila diperlukan, lalu kirim.",
              "Catat nomor tiket yang muncul. Anda dapat memantau perkembangannya di halaman yang sama.",
            ],
          },
          {
            type: "note",
            tone: "info",
            title: "Bagaimana anonim bekerja",
            text:
              "Pengaduan anonim tidak menampilkan identitas Anda kepada atasan. Identitas tetap tersimpan terbatas untuk HRD dan Audit agar laporan dapat dipertanggungjawabkan dan agar Anda tetap dapat memantau tindak lanjutnya serta menerima notifikasi.",
          },
        ],
      },
      {
        id: "menangani",
        title: "Menangani pengaduan",
        summary: "Kewajiban penangan laporan.",
        audience: ["SPV", "HRD", "DIREKSI", "AUDIT", "SUPERADMIN"],
        blocks: [
          {
            type: "list",
            items: [
              "Perbarui status agar pelapor tahu laporannya berjalan: Diterima → Diproses → Selesai atau Ditolak.",
              "Tanggapan biasa akan terbaca pelapor beserta notifikasinya.",
              "Catatan internal hanya terlihat oleh sesama penangan dan tidak dikirim ke pelapor.",
              "Identitas pelapor anonim tidak boleh diungkap kepada terlapor dalam keadaan apa pun.",
            ],
          },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: "teknis",
    title: "Catatan Teknis",
    sections: [
      {
        id: "instalasi",
        title: "Menjalankan sistem",
        summary: "Perintah dasar untuk pengembangan dan penyiapan awal.",
        audience: ["SUPERADMIN"],
        blocks: [
          {
            type: "code",
            text:
              "npm install\nnpm run seed      # mengisi peran, hak akses, pengaturan, dan hari libur\nnpm run dev       # mode pengembangan\nnpm run build     # build produksi\nnpm start         # menjalankan hasil build",
          },
          {
            type: "note",
            tone: "warning",
            title: "Variabel wajib",
            text:
              "MONGODB_URI dan NEXTAUTH_SECRET wajib diisi. NEXTAUTH_SECRET juga dipakai untuk menandatangani tautan berkas dan mengenkripsi data sensitif — menggantinya membuat data lama tidak terbaca, jadi simpan dengan aman dan jangan diubah setelah sistem berisi data.",
          },
        ],
      },
      {
        id: "berkas",
        title: "Penyimpanan berkas",
        summary: "Di mana foto presensi dan slip gaji disimpan, dan siapa yang boleh membukanya.",
        audience: ["SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text:
              "Berkas disimpan di luar folder publik dan hanya dapat dibaca melalui satu pintu, yaitu rute unduhan terautentikasi. Rute tersebut memeriksa dua hal sekaligus: sesi yang sah (atau tautan bertanda tangan yang belum kedaluwarsa) dan kepemilikan berkas.",
          },
          {
            type: "list",
            items: [
              "Karyawan hanya dapat membuka berkas yang berada di foldernya sendiri.",
              "Tautan bertanda tangan berumur pendek, umumnya 15 menit.",
              "Pembukaan slip gaji dan dokumen karyawan dicatat di log audit.",
              "Mengganti STORAGE_PROVIDER memindahkan lokasi penyimpanan tanpa mengubah kode aplikasi.",
            ],
          },
          {
            type: "note",
            tone: "danger",
            title: "Bila Anda memutakhirkan dari versi lama",
            text:
              "Versi sebelumnya menyimpan berkas di public/uploads sehingga dapat diakses siapa pun yang menebak alamatnya. Pindahkan isi folder tersebut ke storage/uploads, lalu pastikan public/uploads sudah kosong.",
          },
        ],
      },
      {
        id: "api",
        title: "Antarmuka API",
        summary: "Format respons dan endpoint publik.",
        audience: ["SUPERADMIN"],
        blocks: [
          {
            type: "p",
            text: "Seluruh endpoint berada di bawah /api/v1 dan memakai format respons yang seragam.",
          },
          {
            type: "code",
            text:
              '{ "success": true, "data": {...}, "message": "...", "meta": { "page": 1, "limit": 25, "total": 120 } }\n\n{ "success": false, "error": { "code": "GEOFENCE_REJECTED", "message": "..." } }',
          },
          {
            type: "p",
            text:
              "Endpoint publik POST /api/v1/public/candidates menerima lamaran dari situs lain. Sertakan header x-api-key yang cocok dengan PUBLIC_API_KEY. Endpoint ini dibatasi lajunya per alamat IP dan dapat dilindungi Cloudflare Turnstile bila TURNSTILE_SECRET_KEY diisi.",
          },
        ],
      },
    ],
  },
];

/** Flat list used by the in-page search. */
export const ALL_SECTIONS = CHAPTERS.flatMap((c) =>
  c.sections.map((s) => ({ ...s, chapterId: c.id, chapterTitle: c.title }))
);
