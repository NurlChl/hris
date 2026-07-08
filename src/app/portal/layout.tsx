"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  Clock, Calendar, User, HelpCircle, LogOut, Menu, X, Sun, Moon, Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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

  const navItems = [
    { name: "Presensi Mandiri", href: "/portal/attendance", icon: Clock },
    { name: "Pengajuan Cuti", href: "/portal/leave", icon: Calendar },
    { name: "Inventaris Aset", href: "/portal/inventory", icon: Package },
    { name: "Profil & Keamanan", href: "/portal/profile", icon: User },
    { name: "Bantuan Panduan", href: "/portal/help", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-[#0a0c14] border-b border-slate-200 dark:border-white/4 flex items-center justify-between px-6 relative z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 text-slate-700 dark:text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <Link href="/portal/attendance" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center font-bold text-white dark:text-slate-900 text-sm">
              HR
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">HRIS PORTAL</span>
              <p className="text-[9px] text-slate-500">Employee Workspace</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${ isActive ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-550 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white dark:bg-white/3" }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Profile + Theme Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-200/50 dark:bg-white/3 border border-slate-300/40 dark:border-white/8 hover:bg-slate-200 dark:hover:bg-white/8 transition-all cursor-pointer text-slate-600 dark:text-slate-300"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/5 text-xs font-semibold cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-0 right-0 bg-white dark:bg-[#0a0c14] border-b border-slate-200 dark:border-white/8 p-4 flex flex-col gap-1 z-20 md:hidden shadow-xl"
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
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-500"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Wrapper */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}
