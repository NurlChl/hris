"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  HelpCircle, BookOpen, Clock, ShieldAlert, Award, FileSpreadsheet, 
  MapPin, CheckCircle2, UserCheck, Key, Loader2
} from "lucide-react";

interface GuideItem {
  title: string;
  icon: any;
  steps: string[];
  faq: Array<{ q: string; a: string }>;
}

export default function HelpCenterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [guides, setGuides] = useState<GuideItem[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated") {
      buildGuidesByRole(session.user.role);
    }
  }, [status]);

  const buildGuidesByRole = (role: string) => {
    const staffGuides: GuideItem[] = [
      {
        title: "Panduan Absensi Presensi Geofence",
        icon: Clock,
        steps: [
          "Buka menu portal presensi di handphone/laptop Anda.",
          "Izinkan browser mendeteksi koordinat lokasi GPS Anda.",
          "Aktifkan kamera depan dan posisikan wajah Anda di dalam lingkaran panduan.",
          "Ambil foto selfie. Sistem akan otomatis mencocokkan dengan referensi wajah Anda.",
          "Klik 'Absen Masuk' saat pagi hari, dan 'Absen Pulang' setelah jam kantor berakhir.",
          "Gunakan opsi 'Absen Darurat' jika GPS mengalami kendala lokasi di dalam gedung, dengan menuliskan alasan kendala wajib."
        ],
        faq: [
          { q: "Mengapa absen saya ditolak karena Geofence?", a: "Sistem mendeteksi Anda berada di luar radius aman (15 meter) dari cabang kantor Anda. Pastikan GPS aktif dengan akurasi tinggi." },
          { q: "Apa itu flag cross_branch?", a: "Anda melakukan absensi di cabang kantor lain dari penempatan utama Anda. Absen tetap masuk namun ditandai untuk tinjauan HRD." }
        ]
      },
      {
        title: "Panduan Pengajuan Cuti & Izin",
        icon: BookOpen,
        steps: [
          "Buka menu portal cuti di halaman utama.",
          "Pilih jenis cuti (contoh: Cuti Tahunan, Izin Sakit).",
          "Tentukan tanggal mulai dan selesai.",
          "Tulis alasan pengajuan cuti secara singkat dan jelas.",
          "Lampirkan foto surat dokter/keterangan sah jika mengajukan Izin Sakit.",
          "Klik 'Ajukan Cuti'. Pengajuan akan diteruskan otomatis ke Supervisor (SPV) Anda."
        ],
        faq: [
          { q: "Berapa lama approval pengajuan cuti?", a: "Tergantung flow masing-masing divisi. Biasanya membutuhkan 1-2 hari kerja untuk disetujui SPV & HRD." }
        ]
      }
    ];

    const spvGuides: GuideItem[] = [
      ...staffGuides,
      {
        title: "Panduan Tinjauan Persetujuan (Supervisor)",
        icon: UserCheck,
        steps: [
          "Masuk ke Dashboard Panel Admin.",
          "Buka menu 'Persetujuan' di sidebar kiri.",
          "Pilih baris pengajuan cuti/izin karyawan divisi Anda yang ingin ditinjau.",
          "Periksa tanggal pengajuan, sisa kuota saldo, dan alasan pengaju.",
          "Tulis komentar persetujuan jika diperlukan.",
          "Klik 'Setujui Langkah' untuk menyetujui, atau 'Tolak Pengajuan' jika tidak sah."
        ],
        faq: [
          { q: "Ke mana pengajuan mengalir setelah saya setujui?", a: "Pengajuan otomatis diteruskan ke tahap persetujuan berikutnya (HRD) sesuai alur yang dikonfigurasi di CMS." }
        ]
      }
    ];

    const adminGuides: GuideItem[] = [
      ...spvGuides,
      {
        title: "Konfigurasi Cabang & Geofence (Admin/HRD)",
        icon: MapPin,
        steps: [
          "Buka menu 'Cabang Kantor' di panel admin.",
          "Klik 'Tambah Cabang' untuk mendaftarkan kantor baru.",
          "Tulis alamat lengkap dan tentukan radius area geofence aman (default 15 meter).",
          "Klik/geser pin koordinat pada Peta Interaktif Leaflet secara presisi.",
          "Simpan perubahan. Aturan radius baru langsung aktif tanpa perlu deploy ulang."
        ],
        faq: []
      },
      {
        title: "Kalkulasi Slip Gaji Bulanan (Payroll)",
        icon: FileSpreadsheet,
        steps: [
          "Buka menu 'Slip Gaji' di panel admin.",
          "Pilih Periode Gaji (tahun-bulan).",
          "Centang nama-nama karyawan yang ingin diproses gajinya.",
          "Klik 'Proses Slip Gaji'. Sistem akan menghitung gaji pokok, BPJS, lembur otomatis, dan potongan denda telat presensi.",
          "Tinjau slip gaji berbentuk dokumen HTML/PDF yang diterbitkan otomatis."
        ],
        faq: []
      }
    ];

    if (role === "SUPERADMIN" || role === "HRD") {
      setGuides(adminGuides);
    } else if (role === "SPV") {
      setGuides(spvGuides);
    } else {
      setGuides(staffGuides);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center text-slate-550 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-200 p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-slate-500/2 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-slate-500/2 blur-[120px]" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-slate-700 dark:text-slate-300" /> Pusat Bantuan Pengguna
            </h1>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
              Panduan interaktif dan instruksi operasional sistem berdasarkan peran akses Anda ({session?.user.role}).
            </p>
          </div>
          <button 
            onClick={() => router.push("/admin")}
            className="px-4 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-100 hover:bg-white/4 transition-all cursor-pointer"
          >
            Dashboard
          </button>
        </div>

        <div className="space-y-6">
          {guides.map((guide, idx) => {
            const Icon = guide.icon;
            return (
              <div key={idx} className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/4">
                  <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  {guide.title}
                </h3>

                <div className="space-y-3">
                  <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Langkah-Langkah:</span>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-550 dark:text-slate-400 pl-2">
                    {guide.steps.map((st, sIdx) => (
                      <li key={sIdx} className="leading-relaxed"><span className="text-slate-700 dark:text-slate-300">{st}</span></li>
                    ))}
                  </ol>
                </div>

                {guide.faq.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/4">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">FAQ (Tanya Jawab):</span>
                    <div className="space-y-3">
                      {guide.faq.map((faq, fIdx) => (
                        <div key={fIdx} className="p-3 bg-white/1 border border-slate-200 dark:border-white/4 rounded-xl space-y-1">
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-200">Q: {faq.q}</p>
                          <p className="text-xs text-slate-550 dark:text-slate-400">A: {faq.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
