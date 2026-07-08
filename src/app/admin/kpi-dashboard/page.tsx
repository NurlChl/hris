"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Users, Settings, Award, Plus, Trash2, CheckCircle2, 
  AlertCircle, Loader2, BarChart2, ClipboardList, UserCheck, ChevronRight 
} from "lucide-react";
import SearchSelect from "@/components/SearchSelect";

interface KpiIndicator {
  name: string;
  weight: number;
  target: string;
}

interface KpiTemplate {
  _id: string;
  name: string;
  divisionId: { _id: string; name: string } | any;
  indicators: KpiIndicator[];
}

interface Employee {
  _id: string;
  name: string;
  employeeId: string;
  divisionId?: { _id: string; name: string } | any;
}

interface KpiEvaluation {
  _id: string;
  employeeId: { name: string; employeeId: string; divisionId?: { name: string } };
  templateId: { name: string };
  period: string;
  finalScore: number;
  notes: string;
  evaluatorId: { name: string };
}

export default function KpiDashboardPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "grading" | "templates">("dashboard");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [templates, setTemplates] = useState<KpiTemplate[]>([]);
  const [evaluations, setEvaluations] = useState<KpiEvaluation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<{ _id: string; name: string }[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");

  // Analytics states
  const [stats, setStats] = useState({ totalEmployees: 0, totalEvaluated: 0, averageScore: 0, averagePercentage: 0 });
  const [divisionAverages, setDivisionAverages] = useState<{ name: string; average: number }[]>([]);
  const [topPerformers, setTopPerformers] = useState<{ employeeName: string; divisionName: string; finalScore: number; period: string }[]>([]);

  // Notification states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Template Form Fields
  const [templateName, setTemplateName] = useState("");
  const [templateDivisionId, setTemplateDivisionId] = useState("");
  const [templateIndicators, setTemplateIndicators] = useState<KpiIndicator[]>([
    { name: "Kedisiplinan & Kehadiran", weight: 20, target: ">= 95%" },
    { name: "Kualitas Hasil Kerja", weight: 30, target: "Nihil Error/Revisi" },
    { name: "Penyelesaian Tugas tepat waktu", weight: 30, target: "100% SLA" },
    { name: "Kerjasama Tim", weight: 20, target: "Feedback Positif" }
  ]);
  const [newIndicatorName, setNewIndicatorName] = useState("");
  const [newIndicatorWeight, setNewIndicatorWeight] = useState(10);
  const [newIndicatorTarget, setNewIndicatorTarget] = useState("");

  // Grading Form Fields
  const [gradeEmployeeId, setGradeEmployeeId] = useState("");
  const [gradeTemplateId, setGradeTemplateId] = useState("");
  const [gradePeriod, setGradePeriod] = useState("2026-07");
  const [gradeScores, setGradeScores] = useState<number[]>([]);
  const [gradeNotes, setGradeNotes] = useState("");

  const fetchDashboardStats = async (divId: string) => {
    try {
      const query = divId ? `?type=dashboard&divisionId=${divId}` : "?type=dashboard";
      const resDash = await fetch(`/api/v1/kpi${query}`);
      const dataDash = await resDash.json();
      if (dataDash.success) {
        setStats(dataDash.data.stats);
        setDivisionAverages(dataDash.data.divisionAverages || []);
        setTopPerformers(dataDash.data.topPerformers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard analytics
      await fetchDashboardStats(selectedDivisionId);

      // 2. Fetch templates
      const resTemp = await fetch("/api/v1/kpi?type=templates");
      const dataTemp = await resTemp.json();
      if (dataTemp.success) setTemplates(dataTemp.data || []);

      // 3. Fetch evaluations
      const resEval = await fetch("/api/v1/kpi?type=evaluations");
      const dataEval = await resEval.json();
      if (dataEval.success) setEvaluations(dataEval.data || []);

      // 4. Fetch divisions & employees for forms
      const resDivs = await fetch("/api/v1/divisions");
      const dataDivs = await resDivs.json();
      if (dataDivs.success) setDivisions(dataDivs.data || []);

      const resEmps = await fetch("/api/v1/employees");
      const dataEmps = await resEmps.json();
      if (dataEmps.success) setEmployees(dataEmps.data || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardStats(selectedDivisionId);
    }
  }, [selectedDivisionId, activeTab]);

  // Update grading scores array size when selected template changes
  useEffect(() => {
    const selected = templates.find(t => t._id === gradeTemplateId);
    if (selected) {
      setGradeScores(new Array(selected.indicators.length).fill(80));
    } else {
      setGradeScores([]);
    }
  }, [gradeTemplateId, templates]);

  const handleAddIndicator = () => {
    if (!newIndicatorName || !newIndicatorTarget) return;
    const item: KpiIndicator = {
      name: newIndicatorName,
      weight: Number(newIndicatorWeight),
      target: newIndicatorTarget
    };
    setTemplateIndicators([...templateIndicators, item]);
    setNewIndicatorName("");
    setNewIndicatorTarget("");
  };

  const handleRemoveIndicator = (index: number) => {
    setTemplateIndicators(templateIndicators.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalWeight = templateIndicators.reduce((sum, ind) => sum + ind.weight, 0);
    if (totalWeight !== 100) {
      setErrorMsg(`Total bobot indikator harus 100%. Saat ini: ${totalWeight}%`);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/v1/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "template",
          name: templateName,
          divisionId: templateDivisionId,
          indicators: templateIndicators
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Templat KPI berhasil disimpan!");
        setTemplateName("");
        setTemplateDivisionId("");
        fetchData();
      } else {
        setErrorMsg(data.message || "Gagal menyimpan templat");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeEmployeeId || !gradeTemplateId) return;

    const selectedTemplate = templates.find(t => t._id === gradeTemplateId);
    if (!selectedTemplate) return;

    // Build the scores objects
    const scores = selectedTemplate.indicators.map((ind, idx) => ({
      indicatorName: ind.name,
      weight: ind.weight,
      score: gradeScores[idx] || 0
    }));

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/v1/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "evaluation",
          employeeId: gradeEmployeeId,
          templateId: gradeTemplateId,
          period: gradePeriod,
          scores,
          notes: gradeNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Penilaian KPI Karyawan berhasil disimpan!");
        setGradeEmployeeId("");
        setGradeTemplateId("");
        setGradeNotes("");
        fetchData();
        setTimeout(() => setActiveTab("dashboard"), 1000);
      } else {
        setErrorMsg(data.message || "Gagal menyimpan penilaian");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvaluations = selectedDivisionId
    ? evaluations.filter((ev) => {
        const emp = ev.employeeId as any;
        const empDivId = emp?.divisionId?._id || emp?.divisionId;
        return empDivId?.toString() === selectedDivisionId;
      })
    : evaluations;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-white/4 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-700 dark:text-slate-350" />
            Dashboard KPI & Kinerja Karyawan
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            Pantau persentase pencapaian KPI bulanan, kelola templat penilaian, dan input penilaian kinerja staf.
          </p>
        </div>
      </div>


      {/* Tabs and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "dashboard" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Dashboard Pencapaian
          </button>
          <button
            onClick={() => setActiveTab("grading")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "grading" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Penilaian Karyawan
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "templates" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Templat KPI Divisi
          </button>
        </div>

        {activeTab === "dashboard" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Filter Divisi:</span>
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-950 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer"
            >
              <option value="">Semua Divisi (Keseluruhan)</option>
              {divisions.map((div) => (
                <option key={div._id} value={div._id}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-250" />
        </div>
      ) : activeTab === "dashboard" ? (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Rata-rata KPI Perusahaan</span>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.averageScore}%</div>
                <p className="text-[9px] text-slate-400">Rasio pencapaian target kumulatif</p>
              </div>
              <div className="w-14 h-14 rounded-full border-4 border-slate-100 dark:border-white/5 flex items-center justify-center relative">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stats.averageScore}</span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Karyawan Dinilai</span>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.totalEvaluated} / {stats.totalEmployees}</div>
                <p className="text-[9px] text-slate-400">Jumlah staf aktif dengan penilaian</p>
              </div>
              <Users className="w-10 h-10 text-slate-300 dark:text-white/10" />
            </div>

            <div className="p-5 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Templat Aktif</span>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{templates.length} Divisi</div>
                <p className="text-[9px] text-slate-400">Rasio bobot kinerja terintegrasi</p>
              </div>
              <ClipboardList className="w-10 h-10 text-slate-300 dark:text-white/10" />
            </div>
          </div>

          {/* Division Averages Graph (Custom Premium CSS Bar Chart) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-200 uppercase tracking-wider">Pencapaian Rata-Rata KPI Per Divisi</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Metrik penilaian kumulatif berdasarkan divisi aktif</p>
              </div>

              {divisionAverages.length === 0 ? (
                <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                  Belum ada data evaluasi divisi untuk divisualisasikan
                </div>
              ) : (
                <div className="flex items-end justify-between gap-4 h-48 pt-6 border-b border-slate-200 dark:border-white/8">
                  {divisionAverages.map(div => (
                    <div key={div.name} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-all shadow-md z-10 pointer-events-none">
                        {div.average}%
                      </div>
                      {/* Bar */}
                      <div 
                        style={{ height: `${div.average}%` }}
                        className="w-full max-w-[40px] bg-linear-to-t from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 rounded-t-sm transition-all duration-500 hover:opacity-80"
                      />
                      {/* Label */}
                      <span className="text-[9px] font-semibold text-slate-550 dark:text-slate-400 truncate w-full text-center max-w-[60px]" title={div.name}>
                        {div.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Performers */}
            <div className="p-5 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-200 uppercase tracking-wider">Top Performers Karyawan</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Penghargaan skor KPI tertinggi bulan ini</p>
              </div>

              <div className="space-y-3">
                {topPerformers.map((perf, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-white/2 rounded-lg border border-slate-200 dark:border-white/4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-[10px]">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-200">{perf.employeeName}</div>
                        <div className="text-[9px] text-slate-400">{perf.divisionName} &bull; Periode: {perf.period}</div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">{perf.finalScore}%</span>
                  </div>
                ))}
                {topPerformers.length === 0 && (
                  <p className="text-center text-slate-400 text-xs py-8">Belum ada evaluasi tersimpan</p>
                )}
              </div>
            </div>
          </div>

          {/* Evaluations History List */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-250 uppercase tracking-wider">Riwayat Pengukuran Evaluasi KPI</h3>
            <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/8 bg-slate-50/50 dark:bg-white/2 text-slate-700 dark:text-slate-400">
                    <th className="p-4 font-semibold">NIP / Karyawan</th>
                    <th className="p-4 font-semibold">Periode</th>
                    <th className="p-4 font-semibold">Templat KPI</th>
                    <th className="p-4 font-semibold">Skor Akhir</th>
                    <th className="p-4 font-semibold">Penilai (Evaluator)</th>
                    <th className="p-4 font-semibold">Catatan Evaluasi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvaluations.map((ev) => (
                    <tr key={ev._id} className="border-b border-slate-200 dark:border-white/4 hover:bg-slate-50/50 dark:hover:bg-white/1 transition-all">
                      <td className="p-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">{ev.employeeId?.name || "Karyawan Dihapus"}</span>
                        <span className="text-[10px] text-slate-550 dark:text-slate-400 font-mono">{ev.employeeId?.employeeId || "-"}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{ev.period}</td>
                      <td className="p-4 text-slate-550 dark:text-slate-450">{ev.templateId?.name || "-"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-black ${
                          ev.finalScore >= 85
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : ev.finalScore >= 70
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-red-500/10 text-red-700 dark:text-red-400"
                        }`}>
                          {ev.finalScore}%
                        </span>
                      </td>
                      <td className="p-4 text-slate-550 dark:text-slate-400">{ev.evaluatorId?.name || "HRD"}</td>
                      <td className="p-4 text-slate-500 italic max-w-xs truncate" title={ev.notes}>{ev.notes || "-"}</td>
                    </tr>
                  ))}
                  {filteredEvaluations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">Belum ada evaluasi kinerja terdaftar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "grading" ? (
        <div className="max-w-2xl bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 rounded-xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-200 dark:border-white/4 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
              <Award className="w-4 h-4 text-slate-700 dark:text-slate-350" />
              Input Hasil Penilaian Karyawan
            </h3>
            <p className="text-[10px] text-slate-400">Evaluasi pencapaian bulanan berdasarkan bobot indikator template divisi</p>
          </div>

          {errorMsg && (
            <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-4 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleGradeSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex-1 w-full">
                <SearchSelect
                  label="Pilih Karyawan"
                  value={gradeEmployeeId}
                  onChange={setGradeEmployeeId}
                  options={employees.map(emp => ({
                    label: `${emp.name} (${emp.employeeId})`,
                    value: emp._id
                  }))}
                  placeholder="Pilih..."
                />
              </div>

              <div className="flex-1 w-full">
                <SearchSelect
                  label="Pilih Templat KPI"
                  value={gradeTemplateId}
                  onChange={setGradeTemplateId}
                  options={templates.map(t => ({
                    label: t.name,
                    value: t._id
                  }))}
                  placeholder="Pilih..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Periode Penilaian</label>
                <input
                  type="month"
                  required
                  value={gradePeriod}
                  onChange={(e) => setGradePeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Dynamic Rendering of Template Indicators */}
            {gradeTemplateId && (
              <div className="space-y-4 border-t border-slate-250 dark:border-white/5 pt-4">
                <h4 className="font-bold text-[11px] text-slate-900 dark:text-slate-200 uppercase tracking-wider">Skor per Indikator KPI:</h4>
                <div className="space-y-3 bg-slate-50 dark:bg-white/2 p-4 rounded-xl border border-slate-200 dark:border-white/4">
                  {templates.find(t => t._id === gradeTemplateId)?.indicators.map((ind, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-200 dark:border-white/4 pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-250">{ind.name}</div>
                        <div className="text-[10px] text-slate-400">Bobot: {ind.weight}% &bull; Target: {ind.target}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          value={gradeScores[idx] ?? 80}
                          onChange={(e) => {
                            const updated = [...gradeScores];
                            updated[idx] = Number(e.target.value);
                            setGradeScores(updated);
                          }}
                          className="w-16 px-2 py-1 rounded bg-white dark:bg-white/3 border border-slate-200 dark:border-white/8 text-center font-bold text-slate-900 dark:text-slate-100"
                        />
                        <span className="text-slate-400 font-bold">/ 100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Catatan/Evaluasi Tambahan</label>
              <textarea
                rows={3}
                value={gradeNotes}
                onChange={(e) => setGradeNotes(e.target.value)}
                placeholder="Tuliskan masukan kinerja, pencapaian luar biasa atau area evaluasi..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setGradeEmployeeId("");
                  setGradeTemplateId("");
                  setActiveTab("dashboard");
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !gradeTemplateId || !gradeEmployeeId}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Simpan Penilaian
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Templates Configuration
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List of existing templates */}
          <div className="space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-250 uppercase tracking-wider">Templat KPI Aktif</h3>
            <div className="space-y-3">
              {templates.map((temp) => (
                <div key={temp._id} className="p-4 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-200">{temp.name}</h4>
                      <p className="text-[10px] text-slate-400">Divisi: {temp.divisionId?.name || "Divisi Lain"}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 border-t border-slate-100 dark:border-white/4 pt-2">
                    {temp.indicators.map((ind, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] text-slate-550 dark:text-slate-400 font-medium">
                        <span>{idx + 1}. {ind.name}</span>
                        <span>{ind.weight}% &bull; Target: {ind.target}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-center text-slate-400 text-xs py-8">Belum ada templat KPI terdaftar</p>
              )}
            </div>
          </div>

          {/* Form to create template */}
          <div className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 rounded-xl p-5 shadow-xs h-fit space-y-4">
            <div className="pb-3 border-b border-slate-200 dark:border-white/4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-slate-700 dark:text-slate-350" />
                Buat Templat KPI Divisi Baru
              </h3>
            </div>

            {errorMsg && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Nama Templat</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Contoh: KPI Staff Divisi Teknologi"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Terapkan untuk Divisi</label>
                <select
                  required
                  value={templateDivisionId}
                  onChange={(e) => setTemplateDivisionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                >
                  <option value="">-- Pilih --</option>
                  {divisions.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Indicators list configuration */}
              <div className="space-y-2 border-t border-slate-200 dark:border-white/4 pt-3">
                <label className="font-bold text-slate-700 dark:text-slate-350">Indikator KPI & Bobot (Total Wajib 100%):</label>
                <div className="space-y-1.5">
                  {templateIndicators.map((ind, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-white/3 border border-slate-250 dark:border-white/6">
                      <div className="font-semibold text-slate-900 dark:text-slate-200">
                        {ind.name} <span className="text-slate-400">({ind.weight}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">Target: {ind.target}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIndicator(idx)}
                          className="text-red-500 hover:text-red-700 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add indicator inline */}
              <div className="p-3 rounded-lg border border-dashed border-slate-250 dark:border-white/8 space-y-3 bg-slate-50/50">
                <h4 className="font-bold text-[10px] uppercase text-slate-700 dark:text-slate-350">Tambah Indikator</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newIndicatorName}
                    onChange={(e) => setNewIndicatorName(e.target.value)}
                    placeholder="Nama Indikator (e.g. Sales KPI)"
                    className="px-2 py-1.5 rounded bg-white dark:bg-white/2 border border-slate-250 text-xs text-slate-900 dark:text-slate-250 focus:outline-none"
                  />
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="number"
                      value={newIndicatorWeight}
                      onChange={(e) => setNewIndicatorWeight(Number(e.target.value))}
                      placeholder="Bobot (e.g. 25)"
                      className="w-16 px-2 py-1.5 rounded bg-white dark:bg-white/2 border border-slate-250 text-xs text-slate-900 dark:text-slate-250 focus:outline-none text-center"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
                <input
                  type="text"
                  value={newIndicatorTarget}
                  onChange={(e) => setNewIndicatorTarget(e.target.value)}
                  placeholder="Target Pencapaian (e.g. >= 100%)"
                  className="w-full px-2 py-1.5 rounded bg-white dark:bg-white/2 border border-slate-250 text-xs text-slate-900 dark:text-slate-250 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddIndicator}
                  disabled={!newIndicatorName || !newIndicatorTarget}
                  className="w-full py-1.5 bg-slate-900 dark:bg-white text-[10px] font-bold text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                >
                  Tambah Indikator
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/4 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Templat KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
