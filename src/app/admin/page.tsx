import React from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  FileCheck2, 
  CalendarDays, 
  ArrowRight,
  TrendingUp,
  UserPlus,
  Compass,
  ListTodo
} from "lucide-react";
import { connectToDatabase, isDbConnected } from "@/lib/db";
import Employee from "@/models/Employee";
import Branch from "@/models/Branch";
import Role from "@/models/Role";

// Force dynamic server rendering
export const dynamic = "force-dynamic";

async function getStats() {
  try {
    await connectToDatabase();
    
    if (isDbConnected()) {
      const [totalEmployees, totalBranches, totalRoles] = await Promise.all([
        Employee.countDocuments({ status: "active" }),
        Branch.countDocuments({}),
        Role.countDocuments({})
      ]);
      return {
        dbStatus: "Online",
        totalEmployees,
        totalBranches,
        totalRoles,
        pendingApprovals: 3 // hardcoded placeholder since approvals collections are built in next phases
      };
    }
  } catch (e) {
    console.error("Failed to connect database for dashboard stats");
  }

  // Fallback / Offline stats
  return {
    dbStatus: "Offline",
    totalEmployees: 0,
    totalBranches: 0,
    totalRoles: 0,
    pendingApprovals: 0
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      name: "Total Karyawan Aktif",
      value: stats.totalEmployees,
      desc: "Karyawan berstatus aktif",
      icon: Users,
      href: "/admin/employees"
    },
    {
      name: "Cabang Penempatan",
      value: stats.totalBranches,
      desc: "Cabang kantor terdaftar",
      icon: Building2,
      href: "/admin/branches"
    },
    {
      name: "Persetujuan Tertunda",
      value: stats.pendingApprovals,
      desc: "Menunggu tindakan koreksi/izin",
      icon: FileCheck2,
      href: "/admin/approvals"
    },
    {
      name: "Role & Akses Sistem",
      value: stats.totalRoles,
      desc: "Matriks hak akses RBAC",
      icon: UserPlus,
      href: "/admin/settings"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-linear-to-r dark:from-slate-900 dark:via-[#0a0c16] dark:to-slate-900 border border-slate-200 dark:border-white/4 p-8 shadow-xs">
        <div className="absolute top-0 right-0 w-[40%] h-full bg-slate-500/2 blur-[80px]" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8">
            <span className={`w-2 h-2 rounded-full ${stats.dbStatus === "Online" ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-400">Database Status: {stats.dbStatus}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Selamat Datang di Portal HRIS Admin
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl">
            Gunakan panel admin untuk mengonfigurasi parameter sistem, memantau absensi real-time, mengelola cuti karyawan, dan menyusun laporan gaji.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.name} 
              className="relative overflow-hidden rounded-xl bg-white border border-slate-200/60 dark:border-white/6 shadow-xs p-6 flex flex-col justify-between h-40 group hover:border-white/12 hover:bg-white dark:bg-white/3 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">{card.name}</p>
                  <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-slate-100 tracking-tight">{card.value}</h3>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-900 dark:border-white shadow-xs transition-all">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/4">
                <span className="text-[11px] text-slate-500">{card.desc}</span>
                <Link href={card.href} className="text-xs text-slate-700 hover:text-slate-950 dark:text-slate-350 dark:hover:text-white flex items-center gap-1 group-hover:translate-x-0.5 transition-all font-semibold">
                  Kelola <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Shortcuts & Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Quick Setup instructions */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-200 dark:border-white/4 pb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">Panduan Mulai Cepat (Local Setup)</h3>
            <p className="text-xs text-slate-500 mt-1">Langkah awal untuk memulai pengembangan sistem HRIS di lokal</p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-xs text-slate-700 dark:text-slate-300 font-bold shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Aktifkan MongoDB & Hubungkan Database</h4>
                <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                  Pastikan MongoDB lokal Anda aktif di port 27017, atau ubah `MONGODB_URI` di file `.env` ke MongoDB Atlas Anda.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-xs text-slate-700 dark:text-slate-300 font-bold shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Jalankan Database Seeder</h4>
                <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                  Seeding data awal untuk mengisi default role, hak akses permission, default settings, serta akun Superadmin dengan menjalankan command:
                  <code className="block mt-2 p-3 rounded-lg bg-slate-50 dark:bg-white/2 text-[11px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/8 font-mono">
                    node --import tsx --env-file=.env src/scripts/seed.ts
                  </code>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-xs text-slate-700 dark:text-slate-300 font-bold shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Eksplorasi Portal Karyawan</h4>
                <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                  Setelah seeder berhasil, gunakan portal login (`/auth/login`) dengan kredensial: <br/>
                  Email: <span className="font-semibold text-slate-700 dark:text-slate-300">admin@hris.com</span> | Password: <span className="font-semibold text-slate-700 dark:text-slate-300">admin123</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Status Overview */}
        <div className="rounded-xl bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-200 dark:border-white/4 pb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">System Checklist</h3>
              <p className="text-xs text-slate-500 mt-1">Pantau status integrasi pihak ketiga</p>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-550 dark:text-slate-400">Peta & Geolocation (Leaflet)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">Aktif (OSM)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Penyimpanan Berkas (Storage)</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-750 dark:text-slate-300 border border-slate-200 dark:border-white/8 font-semibold text-[10px]">Lokal (public/uploads)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Antrian Job (Scheduler)</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 font-semibold text-[10px]">In-Memory Fallback</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-550 dark:text-slate-400">Deteksi Wajah (Face API)</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold text-[10px]">Client Ready</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/1 border border-slate-200 dark:border-white/4 text-xs text-slate-550 dark:text-slate-400 mt-4">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Catatan Maintenance:</span>
            Detail log perbaikan, konfigurasi modul, dan update developer tercatat lengkap di file <Link href="/maintenance.md" className="text-slate-700 dark:text-slate-300 underline font-mono">maintenance.md</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}
