"use client";

import {
  Boxes,
  Building2,
  BookOpen,
  CalendarClock,
  CalendarOff,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Network,
  ReceiptText,
  ScrollText,
  SlidersHorizontal,
  SquareArrowOutUpRight,
  Target,
  UserRoundSearch,
  UsersRound,
  Workflow,
} from "lucide-react";
import { AppShell, type NavSection } from "@/components/shell/AppShell";

/**
 * Admin navigation.
 *
 * Icons are chosen for what the screen actually does rather than for a loose
 * association: payroll is a receipt, not a credit card; divisions and positions
 * are an org network, not a clipboard. The same glyph is used for a concept
 * everywhere it appears, including on the public landing page.
 *
 * `roles` mirrors the section gate in `src/proxy.ts` so the menu never offers a
 * page the router will bounce the user away from.
 */
const sections: NavSection[] = [
  {
    label: "Ringkasan",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Persetujuan", href: "/admin/approvals", icon: Workflow },
    ],
  },
  {
    label: "Operasional HR",
    items: [
      {
        name: "Data Karyawan",
        href: "/admin/employees",
        icon: UsersRound,
        roles: ["SUPERADMIN", "HRD", "AUDIT", "DIREKSI"],
      },
      {
        name: "Jadwal & Shift",
        href: "/admin/schedules",
        icon: CalendarClock,
        roles: ["SUPERADMIN", "HRD", "SPV"],
      },
      {
        name: "Slip Gaji",
        href: "/admin/payroll",
        icon: ReceiptText,
        roles: ["SUPERADMIN", "HRD", "AUDIT", "DIREKSI"],
      },
      { name: "KPI & Kinerja", href: "/admin/kpi-dashboard", icon: Target },
      {
        name: "Lowongan Kerja",
        href: "/admin/vacancies",
        icon: Megaphone,
        roles: ["SUPERADMIN", "HRD", "DIREKSI"],
      },
      {
        name: "Pelamar",
        href: "/admin/recruitment",
        icon: UserRoundSearch,
        roles: ["SUPERADMIN", "HRD", "DIREKSI"],
      },
      { name: "Pengaduan", href: "/admin/complaints", icon: MessageSquareWarning },
    ],
  },
  {
    label: "Master Data",
    items: [
      {
        name: "Cabang Kantor",
        href: "/admin/branches",
        icon: Building2,
        roles: ["SUPERADMIN", "HRD", "GA"],
      },
      {
        name: "Divisi & Jabatan",
        href: "/admin/departments",
        icon: Network,
        roles: ["SUPERADMIN", "HRD"],
      },
      {
        name: "Hari Libur Nasional",
        href: "/admin/holidays",
        icon: CalendarOff,
        roles: ["SUPERADMIN", "HRD"],
      },
      { name: "Inventaris Aset", href: "/admin/inventory", icon: Boxes },
    ],
  },
  {
    label: "Sistem",
    items: [
      {
        name: "Pengaturan & Peran",
        href: "/admin/settings",
        icon: SlidersHorizontal,
        roles: ["SUPERADMIN", "HRD"],
      },
      {
        name: "Jejak Audit",
        href: "/admin/audit",
        icon: ScrollText,
        roles: ["SUPERADMIN", "AUDIT", "DIREKSI"],
      },
      { name: "Portal Karyawan", href: "/portal/attendance", icon: SquareArrowOutUpRight },
      { name: "Dokumentasi", href: "/docs", icon: BookOpen },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sections={sections}
      brand={{ title: "HRIS Admin", subtitle: "Panel administrasi" }}
      brandHref="/admin"
    >
      {children}
    </AppShell>
  );
}
