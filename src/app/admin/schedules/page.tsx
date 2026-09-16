"use client";

import { wibDateKey } from "@/lib/time";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, Plus, Trash2, Edit, X, Loader2, AlertCircle, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchSelect from "@/components/SearchSelect";

import { DatePicker } from "@/components/ui/DatePicker";
interface ScheduleTemplate {
  _id: string;
  name: string;
  clockIn: string;
  clockOut: string;
  isBreakActive: boolean;
  breakOut?: string;
  breakIn?: string;
  activeDays: number[];
  gracePeriodMinutes: number;
}

interface Employee {
  _id: string;
  name: string;
  employeeId: string;
}

interface Assignment {
  _id: string;
  employeeId: { _id: string; name: string; employeeId: string; } | null;
  scheduleId: { _id: string; name: string; clockIn?: string; clockOut?: string } | null;
  date: string;
}

export default function SchedulesPage() {
  const [activeTab, setActiveTab] = useState<"template" | "shift">("template");
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state template
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState("17:00");
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [breakOut, setBreakOut] = useState("12:00");
  const [breakIn, setBreakIn] = useState("13:00");
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]); // Senin - Jumat
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(1);
  
  // Shift assignment state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignScheduleId, setAssignScheduleId] = useState("");
  const [assignDate, setAssignDate] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "template") {
        const res = await fetch("/api/v1/schedules?type=template");
        const data = await res.json();
        if (data.success) setTemplates(data.data);
      } else {
        // Load assignments & employees for builder
        const [rEmp, rAssign, rTemp] = await Promise.all([
          fetch("/api/v1/employees"),
          fetch("/api/v1/schedules?type=assign"),
          fetch("/api/v1/schedules?type=template"),
        ]);
        const [dEmp, dAssign, dTemp] = await Promise.all([
          rEmp.json(),
          rAssign.json(),
          rTemp.json(),
        ]);
        if (dEmp.success) setEmployees(dEmp.data);
        if (dAssign.success) setAssignments(dAssign.data);
        if (dTemp.success) setTemplates(dTemp.data);
      }
    } catch (err) {
      console.error("Gagal memuat jadwal:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleOpenForm = (temp?: ScheduleTemplate) => {
    if (temp) {
      setSelectedTemplateId(temp._id);
      setName(temp.name);
      setClockIn(temp.clockIn);
      setClockOut(temp.clockOut);
      setIsBreakActive(temp.isBreakActive);
      setBreakOut(temp.breakOut || "12:00");
      setBreakIn(temp.breakIn || "13:00");
      setActiveDays(temp.activeDays);
      setGracePeriodMinutes(temp.gracePeriodMinutes);
    } else {
      setSelectedTemplateId(null);
      setName("");
      setClockIn("09:00");
      setClockOut("17:00");
      setIsBreakActive(false);
      setBreakOut("12:00");
      setBreakIn("13:00");
      setActiveDays([1, 2, 3, 4, 5]);
      setGracePeriodMinutes(1);
    }
    setErrorMessage("");
    setFormOpen(true);
  };

  const handleCloseForm = () => setFormOpen(false);

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTemplateId,
          name,
          clockIn,
          clockOut,
          isBreakActive,
          breakOut: isBreakActive ? breakOut : undefined,
          breakIn: isBreakActive ? breakIn : undefined,
          activeDays,
          gracePeriodMinutes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        setFormOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal menyimpan template");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template jadwal ini?")) return;
    try {
      const res = await fetch(`/api/v1/schedules/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Gagal menghapus template:", err);
    }
  };

  const handleDayToggle = (day: number) => {
    if (activeDays.includes(day)) {
      setActiveDays(activeDays.filter(d => d !== day));
    } else {
      setActiveDays([...activeDays, day].sort());
    }
  };

  const handleOpenAssign = () => {
    setAssignEmployeeId(employees[0]?._id || "");
    setAssignScheduleId(templates[0]?._id || "");
    setAssignDate(wibDateKey());
    setErrorMessage("");
    setAssignOpen(true);
  };

  const handleCloseAssign = () => setAssignOpen(false);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "assign",
          employeeId: assignEmployeeId,
          scheduleId: assignScheduleId,
          date: assignDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        setAssignOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal menugaskan jadwal");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSubmitting(false);
    }
  };

  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-title font-semibold text-foreground dark:text-foreground">Jadwal Kerja & Shift</h1>
          <p className="text-label text-muted dark:text-muted mt-1">Buat template jam operasional shift kerja dan petakan kalender penugasan karyawan</p>
        </div>
        {activeTab === "template" ? (
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-body font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Template
          </button>
        ) : (
          <button
            onClick={handleOpenAssign}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-body font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 active:scale-[0.98] transition-all"
          >
            <Calendar className="w-4 h-4" />
            Tugaskan Jadwal
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface-2 border border-line rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("template")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-label font-semibold cursor-pointer transition-all ${ activeTab === "template" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground" }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Template Jam Kerja
        </button>
        <button
          onClick={() => setActiveTab("shift")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-label font-semibold cursor-pointer transition-all ${ activeTab === "shift" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground" }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Shift Builder & Kalender
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted dark:text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
        </div>
      ) : activeTab === "template" ? (
        // Templates Layout
        templates.length === 0 ? (
          <div className="h-48 border border-dashed border-line rounded-xl flex flex-col items-center justify-center text-center p-6 text-muted">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-body font-medium">Belum ada template jam kerja</p>
            <p className="text-label mt-1">Buat template jam kerja (contoh: Shift Pagi, Backoffice) untuk mempermudah pemetaan presensi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(temp => (
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={temp._id}
                className="bg-white border border-line/60 dark:border-white/6 rounded-xl p-5 hover:border-white/12 hover:bg-surface transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded bg-primary-soft text-primary dark:text-primary border border-primary/20 font-semibold text-caption">
                        Late Grace: {temp.gracePeriodMinutes}m
                      </span>
                      <h3 className="text-body-lg font-semibold text-foreground dark:text-foreground mt-1">{temp.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleOpenForm(temp)} className="p-1.5 rounded hover:bg-white/4 text-muted dark:text-muted hover:text-foreground transition-all cursor-pointer">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTemplate(temp._id)} className="p-1.5 rounded hover:bg-danger-soft text-muted dark:text-muted hover:text-danger transition-all cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-label text-muted dark:text-muted">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted" />
                      <span>{temp.clockIn} - {temp.clockOut} WIB</span>
                    </div>
                    {temp.isBreakActive && (
                      <p className="text-label text-muted pl-5">
                        Istirahat: {temp.breakOut} - {temp.breakIn} WIB
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-1">
                  {dayNames.map((day, idx) => {
                    const active = temp.activeDays.includes(idx);
                    return (
                      <span
                        key={day}
                        className={`px-1.5 py-0.5 rounded text-caption font-semibold ${ active ? "bg-surface-2 dark:bg-white/10 text-muted dark:text-muted border border-line" : "bg-surface text-muted border-line" }`}
                      >
                        {day.substring(0, 3)}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        // Shift Builder Calendar List
        assignments.length === 0 ? (
          <div className="h-48 border border-dashed border-line rounded-xl flex flex-col items-center justify-center text-center p-6 text-muted">
            <CalendarDays className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-body font-medium">Belum ada penugasan jadwal kerja</p>
            <p className="text-label mt-1">Petakan template jam kerja ke kalender harian karyawan perusahaan.</p>
          </div>
        ) : (
          <div className="bg-surface border border-line/60 dark:border-white/6 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-label border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-line bg-surface text-muted dark:text-muted">
                  <th className="p-4 font-semibold">Karyawan</th>
                  <th className="p-4 font-semibold">Jadwal Kerja</th>
                  <th className="p-4 font-semibold">Tanggal Aktif</th>
                  <th className="p-4 font-semibold">Jam Operasional</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(ass => (
                  <tr key={ass._id} className="border-b border-line hover:bg-white/1 transition-all">
                    <td className="p-4">
                      <div>
                        <span className="font-semibold text-foreground dark:text-foreground">{ass.employeeId?.name || "Karyawan Terhapus"}</span>
                        <span className="block text-label text-muted">{ass.employeeId?.employeeId || "-"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-surface-2 dark:bg-white/10 text-muted dark:text-muted border border-line font-semibold text-caption">
                        {ass.scheduleId?.name || "Template Terhapus"}
                      </span>
                    </td>
                    <td className="p-4 text-foreground font-medium">
                      {new Date(ass.date).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
                    </td>
                    <td className="p-4 text-muted dark:text-muted">
                      {ass.scheduleId ? `${ass.scheduleId.clockIn ?? "?"} - ${ass.scheduleId.clockOut ?? "?"} WIB` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Template Form Panel */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={handleCloseForm} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line shadow-[var(--shadow-pop)] rounded-xl w-full max-w-md relative z-10 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                <h3 className="text-body-lg font-semibold text-foreground dark:text-foreground">
                  {selectedTemplateId ? "Edit Template Jadwal" : "Tambah Template Jadwal Baru"}
                </h3>
                <button onClick={handleCloseForm} className="p-1 rounded bg-surface border border-line text-muted dark:text-muted hover:text-foreground cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-danger text-label flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmitTemplate} className="space-y-4 text-label">
                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Nama Jadwal / Shift</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shift Pagi Satpam" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-label" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-foreground font-semibold">Jam Masuk (Clock In)</label>
                    <input type="time" required value={clockIn} onChange={e => setClockIn(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-label" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-foreground font-semibold">Jam Pulang (Clock Out)</label>
                    <input type="time" required value={clockOut} onChange={e => setClockOut(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-label" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Toleransi Telat (Menit)</label>
                  <input type="number" required min={0} value={gracePeriodMinutes} onChange={e => setGracePeriodMinutes(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-label" />
                </div>

                <div className="space-y-2">
                  <label className="text-foreground font-semibold block">Hari Kerja Aktif</label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, idx) => {
                      const active = activeDays.includes(idx);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => handleDayToggle(idx)}
                          className={`px-3 py-1 rounded text-label font-semibold cursor-pointer transition-all ${ active ? "bg-primary text-primary-foreground border border-line-strong dark:border-white shadow" : "bg-surface border border-line text-muted dark:text-muted hover:text-foreground hover:dark:text-muted" }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="break-check" checked={isBreakActive} onChange={e => setIsBreakActive(e.target.checked)} className="w-4 h-4 rounded border-line bg-surface-2 accent-blue-500 cursor-pointer" />
                    <label htmlFor="break-check" className="text-foreground font-semibold cursor-pointer">Aktifkan Jam Istirahat</label>
                  </div>
                  {isBreakActive && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="space-y-1">
                        <label className="text-muted dark:text-muted text-caption">Mulai Istirahat</label>
                        <input type="time" value={breakOut} onChange={e => setBreakOut(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-label" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted dark:text-muted text-caption">Kembali Istirahat</label>
                        <input type="time" value={breakIn} onChange={e => setBreakIn(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-label" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-6">
                  <button type="button" onClick={handleCloseForm} className="px-4 py-2 rounded-lg border border-line text-label font-semibold text-muted dark:text-muted hover:text-foreground hover:bg-surface cursor-pointer transition-all">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-label font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5">
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Simpan Template
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assignment Form Modal */}
      <AnimatePresence>
        {assignOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={handleCloseAssign} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line shadow-[var(--shadow-pop)] rounded-xl w-full max-w-md relative z-10 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                <h3 className="text-body-lg font-semibold text-foreground dark:text-foreground">Tugaskan Jadwal Kalender</h3>
                <button onClick={handleCloseAssign} className="p-1 rounded bg-surface border border-line text-muted dark:text-muted hover:text-foreground cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-danger text-label flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleAssignSubmit} className="space-y-4 text-label">
                <SearchSelect
                  label="Pilih Karyawan"
                  value={assignEmployeeId}
                  onChange={setAssignEmployeeId}
                  options={employees.map(emp => ({
                    label: `${emp.name} (${emp.employeeId})`,
                    value: emp._id
                  }))}
                  placeholder="Pilih karyawan..."
                />

                <SearchSelect
                  label="Pilih Template Jadwal Kerja"
                  value={assignScheduleId}
                  onChange={setAssignScheduleId}
                  options={templates.map(temp => ({
                    label: temp.name,
                    value: temp._id
                  }))}
                  placeholder="Pilih jadwal..."
                />

                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Tanggal Penugasan</label>
                  <DatePicker required value={assignDate} onChange={(value) => setAssignDate(value)} />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-6">
                  <button type="button" onClick={handleCloseAssign} className="px-4 py-2 rounded-lg border border-line text-label font-semibold text-muted dark:text-muted hover:text-foreground hover:bg-surface cursor-pointer transition-all">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-label font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5">
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Tugaskan Jadwal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
