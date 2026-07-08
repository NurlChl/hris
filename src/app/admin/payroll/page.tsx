"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, Calendar, Users, Loader2, CheckCircle2, AlertCircle, FileText, 
  ExternalLink, Printer, Settings
} from "lucide-react";
import { motion } from "framer-motion";

interface Employee {
  _id: string;
  name: string;
  employeeId: string;
}

interface PayrollRecord {
  _id: string;
  employeeId: { _id: string; name: string; employeeId: string; } | null;
  period: string;
  basicSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  fileUrl: string;
  status: string;
}

export default function PayrollPage() {
  const [period, setPeriod] = useState("2026-07");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchMetadata();
    fetchPayrolls();
  }, [period]);

  const fetchMetadata = async () => {
    try {
      const res = await fetch("/api/v1/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat karyawan:", err);
    }
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await fetch(`/api/v1/payroll?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setPayrolls(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat payroll:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmployee = (id: string) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(eId => eId !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e._id));
    }
  };

  const handleProcessPayroll = async () => {
    if (selectedEmployees.length === 0) {
      setErrorMessage("Silakan pilih minimal satu karyawan untuk diproses");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/v1/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          employeeIds: selectedEmployees
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || "Slip gaji berhasil diproses!");
        fetchPayrolls();
        setSelectedEmployees([]);
      } else {
        setErrorMessage(data.error?.message || "Gagal memproses slip gaji");
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan koneksi server");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Manajemen Gaji & Slip Gaji</h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Proses slip gaji bulanan, kalkulasikan BPJS, lembur, pajak PPh 21, dan denda telat otomatis</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column - Select Employees Form */}
        <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4 flex items-center gap-1.5">
            <Calendar className="w-4.5 h-4.5 text-slate-700 dark:text-slate-300" /> Pilih Periode & Karyawan
          </h2>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Periode Gaji</label>
              <input
                type="month"
                required
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 mt-4">
                <span>Daftar Karyawan ({employees.length})</span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white text-[10px] underline cursor-pointer"
                >
                  {selectedEmployees.length === employees.length ? "Batal Semua" : "Pilih Semua"}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-white/8 rounded-lg p-2 space-y-1 bg-white/1">
                {employees.map(emp => {
                  const isChecked = selectedEmployees.includes(emp._id);
                  return (
                    <div
                      key={emp._id}
                      onClick={() => handleSelectEmployee(emp._id)}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-white/4 cursor-pointer text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div click
                        className="w-3.5 h-3.5 rounded border-slate-200 dark:border-white/8 accent-blue-500 cursor-pointer"
                      />
                      <span className="text-slate-700 dark:text-slate-300">{emp.name} ({emp.employeeId})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleProcessPayroll}
              disabled={submitting || selectedEmployees.length === 0}
              className="w-full mt-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
              Proses Slip Gaji ({selectedEmployees.length})
            </button>
          </div>
        </div>

        {/* Right Column - Slips logs table */}
        <div className="lg:col-span-2 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4 flex items-center gap-1.5">
            <CreditCard className="w-4.5 h-4.5 text-purple-500" /> Riwayat Slip Gaji Terbit
          </h2>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-550 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
            </div>
          ) : payrolls.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
              <CreditCard className="w-8 h-8 mb-2 opacity-50 text-slate-600" />
              Belum ada slip gaji yang diproses untuk periode ini.
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/8 bg-white dark:bg-white/2 text-slate-550 dark:text-slate-400">
                    <th className="p-3 font-semibold">Karyawan</th>
                    <th className="p-3 font-semibold">Gaji Bersih</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map(pr => (
                    <tr key={pr._id} className="border-b border-slate-200 dark:border-white/4 hover:bg-white/1 transition-all">
                      <td className="p-3">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-200">{pr.employeeId?.name || "Karyawan Terhapus"}</span>
                          <span className="block text-[10px] text-slate-500">{pr.employeeId?.employeeId || "-"}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-900 dark:text-slate-200 font-semibold">
                        Rp {pr.netSalary.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[9px] uppercase">
                          {pr.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <a
                          href={pr.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white underline font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5" /> Lihat <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
