"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  FileCheck2,
  UserCheck,
  Settings,
  LogOut,
  Clock,
  Menu,
  X,
  CreditCard,
  History,
  ClipboardList,
  Briefcase,
  HelpCircle,
  Sun,
  Moon,
  Package,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const activeTheme = savedTheme || "dark";
    setTheme(activeTheme);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Update clock in WIB timezone
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const formatter = new Intl.DateTimeFormat("id-ID", options);
      setCurrentTime(formatter.format(new Date()) + " WIB");
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Cabang Kantor", href: "/admin/branches", icon: Building2 },
    { name: "Divisi & Jabatan", href: "/admin/departments", icon: ClipboardList },
    { name: "Data Karyawan", href: "/admin/employees", icon: Users },
    { name: "Jadwal & Shift", href: "/admin/schedules", icon: CalendarDays },
    { name: "Persetujuan", href: "/admin/approvals", icon: FileCheck2 },
    { name: "Slip Gaji", href: "/admin/payroll", icon: CreditCard },
    { name: "KPI & Kinerja", href: "/admin/kpi-dashboard", icon: Award },
    { name: "Rekrutmen ATS", href: "/admin/recruitment", icon: Briefcase },
    { name: "Inventaris Aset", href: "/admin/inventory", icon: Package },
    { name: "Pusat Bantuan", href: "/portal/help", icon: HelpCircle },
    { name: "Aktivitas Audit", href: "/admin/audit", icon: History },
    { name: "Pengaturan & Role", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="w-64 bg-white dark:bg-[#0a0c14] border-r border-slate-200 dark:border-white/4 hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-200 dark:border-white/4">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center font-bold text-white dark:text-slate-900 text-sm">
              HR
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">HRIS ADMIN</span>
              <p className="text-[10px] text-slate-550 dark:text-slate-500">Panel Superadmin</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${ isActive ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium" : "text-slate-500 dark:text-slate-450 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white dark:bg-white/3" }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white dark:text-slate-900" : "text-slate-550 dark:text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-white/4 space-y-3">
          {/* Time widget */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/2 text-xs text-slate-500 dark:text-slate-550 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
            <span>{currentTime || "Loading..."}</span>
          </div>

          <button
            onClick={() => {
              signOut({ callbackUrl: "/auth/login" });
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar & Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-[#0a0c14] border-b border-slate-200 dark:border-white/4 flex items-center justify-between px-6 md:px-8 relative z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 text-slate-700 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize hidden sm:block">
              {pathname === "/admin" ? "Sistem Ringkasan Eksekutif" : pathname.split("/").pop()?.replace(/-/g, " ")}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/2 text-slate-550 dark:text-slate-550 dark:text-slate-400 md:hidden">
              <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span>{currentTime}</span>
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-200/50 dark:bg-white/3 border border-slate-300/40 dark:border-white/8 hover:bg-slate-200 dark:hover:bg-white/8 transition-all cursor-pointer text-slate-600 dark:text-slate-300 mr-2"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/8">
                SA
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Superadmin</p>
                <p className="text-[10px] text-slate-500">admin@hris.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-0 right-0 bg-white dark:bg-[#0a0c14] border-b border-slate-200 dark:border-white/8 p-4 flex flex-col gap-1 z-10 md:hidden shadow-xl"
            >
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${ isActive ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium" : "text-slate-500 dark:text-slate-550 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
              <hr className="border-slate-200 dark:border-white/4 my-2" />
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/auth/login" });
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-500"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
