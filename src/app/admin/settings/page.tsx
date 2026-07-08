"use client";

import React, { useState, useEffect } from "react";
import { Settings, Shield, Plus, X, Loader2, AlertCircle, Save, Tag } from "lucide-react";
import { motion } from "framer-motion";

interface SettingMap {
  grace_period_minutes: number;
  max_absen_correction: number;
  holiday_swap_lead_days: number;
  default_geo_radius: number;
  default_employee_password: string;
  require_selfie_clock_in: boolean;
  require_selfie_break_out: boolean;
  require_selfie_break_in: boolean;
  require_selfie_clock_out: boolean;
  enable_break_attendance: boolean;
  [key: string]: any;
}

interface Permission {
  module: string;
  actions: string[];
  scope: "all" | "branch" | "division" | "self";
}

interface RoleWithPermissions {
  _id: string;
  name: string;
  isSystemDefault: boolean;
  permissions: Permission[];
}

const MODULES = [
  "attendance",
  "leave",
  "recruitment",
  "payroll",
  "kpi",
  "contracts",
  "inventory",
  "settings",
  "reports"
];

const ACTIONS = ["read", "write", "delete", "approve", "export"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"settings" | "roles" | "categories">("settings");
  
  // Settings States
  const [settings, setSettings] = useState<SettingMap | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  // Roles States
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [rolesSubmitting, setRolesSubmitting] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  // Categories States
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesSubmitting, setCategoriesSubmitting] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (activeTab === "settings") {
      fetchSettings();
    } else if (activeTab === "roles") {
      fetchRoles();
    } else if (activeTab === "categories") {
      fetchCategories();
    }
    setErrorMessage("");
    setSuccessMessage("");
  }, [activeTab]);

  // --- Fetching ---
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/v1/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error("Gagal memuat settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch("/api/v1/settings/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat kategori:", err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch("/api/v1/roles");
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
        if (data.data.length > 0) {
          // Keep current selection or default to first
          const current = selectedRole ? data.data.find((r: any) => r._id === selectedRole._id) : null;
          setSelectedRole(current || data.data[0]);
        }
      }
    } catch (err) {
      console.error("Gagal memuat roles:", err);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/v1/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || "Berhasil membuat peran baru");
        setNewRoleName("");
        await fetchRoles();
        const newlyCreatedRole = data.data;
        if (newlyCreatedRole) {
          setSelectedRole(newlyCreatedRole);
        }
      } else {
        setErrorMessage(data.error?.message || "Gagal membuat peran baru");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi internet");
    } finally {
      setAddingRole(false);
    }
  };

  // --- Handling Settings Updates ---
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSettingsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/v1/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage("Pengaturan sistem berhasil diperbarui");
        setSettings(data.data);
      } else {
        setErrorMessage(data.error?.message || "Gagal memperbarui pengaturan");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // --- Handling Roles Matrix Updates ---
  const handlePermissionToggle = (module: string, action: string) => {
    if (!selectedRole) return;

    const updatedPermissions = [...selectedRole.permissions];
    const permIdx = updatedPermissions.findIndex(p => p.module === module);

    if (permIdx > -1) {
      const actions = [...updatedPermissions[permIdx].actions];
      const actIdx = actions.indexOf(action);
      if (actIdx > -1) {
        actions.splice(actIdx, 1);
      } else {
        actions.push(action);
      }
      updatedPermissions[permIdx] = { ...updatedPermissions[permIdx], actions };
    } else {
      updatedPermissions.push({ module, actions: [action], scope: "self" });
    }

    setSelectedRole({ ...selectedRole, permissions: updatedPermissions });
  };

  const handleScopeChange = (module: string, scope: "all" | "branch" | "division" | "self") => {
    if (!selectedRole) return;

    const updatedPermissions = [...selectedRole.permissions];
    const permIdx = updatedPermissions.findIndex(p => p.module === module);

    if (permIdx > -1) {
      updatedPermissions[permIdx] = { ...updatedPermissions[permIdx], scope };
    } else {
      updatedPermissions.push({ module, actions: [], scope });
    }

    setSelectedRole({ ...selectedRole, permissions: updatedPermissions });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setRolesSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/v1/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRole._id,
          permissions: selectedRole.permissions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Matriks akses role ${selectedRole.name} berhasil diperbarui`);
        fetchRoles();
      } else {
        setErrorMessage(data.error?.message || "Gagal memperbarui matriks akses");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setRolesSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Pengaturan & Hak Akses</h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Konfigurasi parameter global HRIS dan kelola matriks permission RBAC</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "settings" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Parameter Global
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "roles" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Matriks Peran (RBAC)
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* --- Parameter Global Tab --- */}
      {activeTab === "settings" && (
        settingsLoading ? (
          <div className="h-48 flex items-center justify-center text-slate-550 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-slate-800 dark:text-slate-200" />
          </div>
        ) : settings && (
          <form onSubmit={handleSettingsSubmit} className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl p-6 space-y-6 max-w-xl">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4">
              Konfigurasi Absensi & Dispensasi
            </h2>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Toleransi Keterlambatan Absensi (Menit)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={settings.grace_period_minutes}
                  onChange={e => setSettings({ ...settings, grace_period_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
                <p className="text-[10px] text-slate-500 italic">Dispensasi keterlambatan presensi masuk karyawan.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Maks Koreksi Absen per Bulan</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={settings.max_absen_correction}
                  onChange={e => setSettings({ ...settings, max_absen_correction: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
                <p className="text-[10px] text-slate-500 italic">Kuota bulanan koreksi absen (lupa scan/tap) mandiri karyawan.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Batas Pengajuan Tukar Libur (Hari Sebelum)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={settings.holiday_swap_lead_days}
                  onChange={e => setSettings({ ...settings, holiday_swap_lead_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
                <p className="text-[10px] text-slate-500 italic">Batas H- pengajuan tukar libur saat masuk di tanggal merah nasional.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Default Radius Geofence (Meter)</label>
                <input
                  type="number"
                  min={5}
                  required
                  value={settings.default_geo_radius}
                  onChange={e => setSettings({ ...settings, default_geo_radius: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
                <p className="text-[10px] text-slate-500 italic">Jarak radius area aman lokasi kantor penempatan untuk absen.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Kata Sandi Default Karyawan Baru</label>
                <input
                  type="text"
                  required
                  value={settings.default_employee_password || ""}
                  onChange={e => setSettings({ ...settings, default_employee_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
                <p className="text-[10px] text-slate-550 dark:text-slate-500 italic">Kata sandi default untuk akun login karyawan baru saat pertama kali didaftarkan.</p>
              </div>

              <div className="space-y-3 border-t border-slate-200 dark:border-white/4 pt-4">
                <span className="font-bold text-slate-700 dark:text-slate-350 block text-[11px] mb-1 uppercase tracking-wider">Fitur Istirahat & Swafoto (Selfie)</span>
                
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4">
                  <div>
                    <label className="font-semibold text-slate-750 dark:text-slate-250 block text-xs">Aktifkan Absensi Istirahat Karyawan</label>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500">Jika diaktifkan, karyawan wajib melakukan absen istirahat & kembali istirahat.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enable_break_attendance !== undefined ? settings.enable_break_attendance : true}
                    onChange={e => setSettings({ ...settings, enable_break_attendance: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 accent-blue-500 cursor-pointer"
                  />
                </div>

                <span className="font-bold text-slate-700 dark:text-slate-350 block text-[11px] mt-2 mb-1 uppercase tracking-wider">Metode Verifikasi Swafoto (Selfie)</span>
                
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4">
                  <div>
                    <label className="font-semibold text-slate-750 dark:text-slate-250 block text-xs">Selfie Saat Absen Masuk</label>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500">Wajibkan mengambil foto selfie saat absen masuk.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.require_selfie_clock_in || false}
                    onChange={e => setSettings({ ...settings, require_selfie_clock_in: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4">
                  <div>
                    <label className="font-semibold text-slate-750 dark:text-slate-250 block text-xs">Selfie Saat Mulai Istirahat</label>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500">Wajibkan mengambil foto selfie saat mulai istirahat.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.require_selfie_break_out || false}
                    onChange={e => setSettings({ ...settings, require_selfie_break_out: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4">
                  <div>
                    <label className="font-semibold text-slate-750 dark:text-slate-250 block text-xs">Selfie Saat Kembali Istirahat</label>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500">Wajibkan mengambil foto selfie saat selesai istirahat.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.require_selfie_break_in || false}
                    onChange={e => setSettings({ ...settings, require_selfie_break_in: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4">
                  <div>
                    <label className="font-semibold text-slate-750 dark:text-slate-250 block text-xs">Selfie Saat Absen Pulang</label>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500">Wajibkan mengambil foto selfie saat absen pulang.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.require_selfie_clock_out || false}
                    onChange={e => setSettings({ ...settings, require_selfie_clock_out: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={settingsSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              {settingsSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Simpan Pengaturan
            </button>
          </form>
        )
      )}

      {/* --- Matriks Peran Tab --- */}
      {activeTab === "roles" && (
        rolesLoading ? (
          <div className="h-48 flex items-center justify-center text-slate-550 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-slate-800 dark:text-slate-200" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Roles selection list */}
            <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl p-4 flex flex-col space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-3">Daftar Peran (Roles)</h3>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {roles.map(role => (
                    <button
                      key={role._id}
                      onClick={() => setSelectedRole(role)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${ selectedRole?._id === role._id ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium" : "text-slate-500 dark:text-slate-550 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white dark:bg-white/2" }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add New Role Section */}
              <div className="border-t border-slate-200 dark:border-white/4 pt-3 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Tambah Peran Baru</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nama Peran (e.g. SPV_MARKETING)"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value.toUpperCase())}
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-[11px] text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddRole}
                    disabled={addingRole || !newRoleName.trim()}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center justify-center shrink-0"
                  >
                    {addingRole ? <Loader2 className="w-3 h-3 animate-spin" /> : "Tambah"}
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix configurations */}
            {selectedRole && (
              <div className="md:col-span-3 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-200">Konfigurasi Akses: {selectedRole.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Centang tindakan yang diizinkan dan tentukan cakupan (scope) filter data.</p>
                  </div>
                  <button
                    onClick={handleSavePermissions}
                    disabled={rolesSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all"
                  >
                    {rolesSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Simpan Akses
                  </button>
                </div>

                <div className="overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/8 text-slate-550 dark:text-slate-400">
                        <th className="pb-3 font-semibold">Modul</th>
                        {ACTIONS.map(act => (
                          <th key={act} className="pb-3 font-semibold text-center capitalize">{act}</th>
                        ))}
                        <th className="pb-3 font-semibold text-center">Cakupan Data (Scope)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map(mod => {
                        const perm = selectedRole.permissions.find(p => p.module === mod);
                        const isSystem = selectedRole.isSystemDefault && selectedRole.name === "SUPERADMIN";

                        return (
                          <tr key={mod} className="border-b border-slate-200 dark:border-white/4">
                            <td className="py-4 font-bold text-slate-900 dark:text-slate-200 capitalize">{mod}</td>
                            
                            {/* Actions checkmarks */}
                            {ACTIONS.map(act => {
                              const checked = perm ? perm.actions.includes(act) : false;
                              return (
                                <td key={act} className="py-4 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={isSystem}
                                    checked={isSystem ? true : checked}
                                    onChange={() => handlePermissionToggle(mod, act)}
                                    className="w-4 h-4 rounded border-white/10 bg-slate-900 accent-blue-500 disabled:opacity-50 cursor-pointer"
                                  />
                                </td>
                              );
                            })}

                            {/* Scope selector */}
                            <td className="py-4 text-center">
                              <select
                                disabled={isSystem}
                                value={isSystem ? "all" : (perm?.scope || "self")}
                                onChange={e => handleScopeChange(mod, e.target.value as any)}
                                className="px-2 py-1 rounded bg-white dark:bg-[#0e1017] border border-slate-200 dark:border-white/8 text-slate-900 dark:text-slate-300 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                              >
                                <option value="self">Self (Sendiri)</option>
                                <option value="division">Division (Divisi)</option>
                                <option value="branch">Branch (Cabang)</option>
                                <option value="all">All (Seluruh Perusahaan)</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
