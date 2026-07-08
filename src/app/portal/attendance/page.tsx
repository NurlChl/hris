"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Camera, MapPin, CheckCircle2, Loader2, AlertCircle, RefreshCw, Clock, History,
  Plus, X, UploadCloud, Calendar, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import Leaflet map to avoid SSR error
const BranchMap = dynamic(() => import("@/components/BranchMap"), {
  ssr: false,
  loading: () => <div className="h-48 bg-slate-900 animate-pulse rounded-lg border border-slate-200 dark:border-white/8 flex items-center justify-center text-xs text-slate-500">Memuat Peta...</div>
});

export default function EmployeeAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState("");

  const [activeTab, setActiveTab] = useState<"normal" | "correction">("normal");

  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [faceCheckCount, setFaceCheckCount] = useState(0);
  const [isManualFallback, setIsManualFallback] = useState(false);
  const [isLocationOverride, setIsLocationOverride] = useState(false);
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");

  // Attendance flow & live time states
  const [todayLog, setTodayLog] = useState<any>(null);
  const [selfieSettings, setSelfieSettings] = useState<any>({
    require_selfie_clock_in: true,
    require_selfie_break_out: false,
    require_selfie_break_in: false,
    require_selfie_clock_out: true
  });
  const [currentStep, setCurrentStep] = useState<"clock_in" | "break_out" | "break_in" | "clock_out" | "completed">("clock_in");
  const [logsLoading, setLogsLoading] = useState(true);
  const [timeStr, setTimeStr] = useState("");

  // Correction form states
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionsHistory, setCorrectionsHistory] = useState<any[]>([]);
  const [corrDate, setCorrDate] = useState("");
  const [corrClockIn, setCorrClockIn] = useState("");
  const [corrClockOut, setCorrClockOut] = useState("");
  const [corrReasonType, setCorrReasonType] = useState<"lupa_tap" | "kendala_aplikasi" | "dinas_luar" | "lainnya">("lupa_tap");
  const [corrReasonNote, setCorrReasonNote] = useState("");
  const [corrEvidenceUrl, setCorrEvidenceUrl] = useState("");
  const [corrSubmitting, setCorrSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const fetchCorrections = async () => {
    try {
      const res = await fetch("/api/v1/attendance/correction");
      const data = await res.json();
      if (data.success) {
        setCorrectionsHistory(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkTodayLog = (logsList: any[], activeSettings: any) => {
    const todayStr = new Date().toDateString();
    const found = logsList.find(log => new Date(log.date).toDateString() === todayStr);
    setTodayLog(found || null);

    const isBreakEnabled = activeSettings?.enable_break_attendance !== undefined 
      ? (activeSettings.enable_break_attendance === true || activeSettings.enable_break_attendance === "true")
      : true;

    if (!found) {
      setCurrentStep("clock_in");
    } else if (!found.clockIn) {
      setCurrentStep("clock_in");
    } else if (isBreakEnabled) {
      if (!found.breakOut) {
        setCurrentStep("break_out");
      } else if (!found.breakIn) {
        setCurrentStep("break_in");
      } else if (!found.clockOut) {
        setCurrentStep("clock_out");
      } else {
        setCurrentStep("completed");
      }
    } else {
      if (!found.clockOut) {
        setCurrentStep("clock_out");
      } else {
        setCurrentStep("completed");
      }
    }
  };

  const fetchLogsAndSettings = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/v1/attendance");
      const data = await res.json();
      if (data.success) {
        const { logs, settings } = data.data;
        if (settings) setSelfieSettings(settings);
        checkTodayLog(logs || [], settings);
      }
    } catch (err) {
      console.error("Gagal memuat absensi harian:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const isSelfieRequiredForCurrentStep = () => {
    if (currentStep === "clock_in") return selfieSettings.require_selfie_clock_in;
    if (currentStep === "break_out") return selfieSettings.require_selfie_break_out;
    if (currentStep === "break_in") return selfieSettings.require_selfie_break_in;
    if (currentStep === "clock_out") return selfieSettings.require_selfie_clock_out;
    return false;
  };

  // Fetch coordinates, corrections, and logs/settings
  useEffect(() => {
    if (status === "authenticated") {
      fetchCorrections();
      fetchLogsAndSettings();
    }
  }, [status, activeTab]);

  // Live time ticker (WIB)
  useEffect(() => {
    const timer = setInterval(() => {
      const time = new Date().toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      setTimeStr(time + " WIB");
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto manage camera activation based on step selfie requirements
  useEffect(() => {
    if (status === "authenticated" && currentStep !== "completed") {
      const needsSelfie = isSelfieRequiredForCurrentStep();
      if (needsSelfie) {
        startCamera();
      } else {
        stopCamera();
        setPhoto(null);
      }
    } else {
      stopCamera();
      setPhoto(null);
    }
    return () => stopCamera();
  }, [currentStep, selfieSettings, status]);

  // Fetch coordinates
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    setLocLoading(true);
    setLocError("");

    if (!navigator.geolocation) {
      setLocError("Geolocation tidak didukung oleh browser Anda");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocLoading(false);
      },
      (err) => {
        console.error(err);
        setLocError("Gagal mendeteksi lokasi GPS. Pastikan izin lokasi aktif.");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Start Camera
  const startCamera = async () => {
    setCameraActive(true);
    setPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Gagal membuka kamera:", err);
      setApiError("Gagal mengaktifkan kamera depan");
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Capture Selfie
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPhoto(dataUrl);
        
        // Simulate face recognition matching
        // In client-side, face-api.js would run here
        // If it fails 3x, fallback to manual selfie
        const count = faceCheckCount + 1;
        setFaceCheckCount(count);
        
        if (count >= 3) {
          setIsManualFallback(true);
          setApiError("Deteksi wajah gagal 3x. Menggunakan fallback foto selfie manual.");
        } else {
          setIsManualFallback(false);
        }
      }
      stopCamera();
    }
  };

  const handleAttendanceSubmit = async () => {
    const action = currentStep;
    const needsSelfie = isSelfieRequiredForCurrentStep();

    if (lat === null || lng === null) {
      setApiError("Lokasi GPS wajib disiapkan");
      return;
    }

    if (needsSelfie && !photo) {
      setApiError("Foto selfie wajib diambil sebelum melakukan absensi");
      return;
    }

    setSubmitting(true);
    setApiError("");
    setApiSuccess("");

    try {
      const response = await fetch("/api/v1/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lat,
          lng,
          photo: needsSelfie ? photo : undefined,
          isManualFallback,
          isLocationOverride,
          note,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setApiSuccess(data.message || "Absen berhasil!");
        setPhoto(null);
        setNote("");
        setIsLocationOverride(false);
        await fetchLogsAndSettings();
      } else {
        setApiError(data.error?.message || "Gagal memproses absensi");
      }
    } catch (err) {
      setApiError("Kesalahan komunikasi server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrSubmitting(true);
    setApiError("");
    setApiSuccess("");

    try {
      const response = await fetch("/api/v1/attendance/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: corrDate,
          clockInTime: corrClockIn,
          clockOutTime: corrClockOut,
          reasonType: corrReasonType,
          reasonNote: corrReasonNote,
          evidenceUrl: corrEvidenceUrl,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setApiSuccess(data.message || "Pengajuan koreksi berhasil dikirim!");
        setCorrectionModalOpen(false);
        setCorrDate("");
        setCorrClockIn("");
        setCorrClockOut("");
        setCorrReasonType("lupa_tap");
        setCorrReasonNote("");
        setCorrEvidenceUrl("");
        fetchCorrections();
      } else {
        setApiError(data.error?.message || "Gagal mengirim pengajuan koreksi");
      }
    } catch (err) {
      setApiError("Kesalahan komunikasi server");
    } finally {
      setCorrSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCorrEvidenceUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (status === "loading" || status === "unauthenticated") {
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
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Portal Presensi Karyawan
            </h1>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
              Absen masuk & pulang harian mandiri dengan deteksi Geofence radius kantor.
            </p>
          </div>
          <button 
            onClick={() => router.push("/admin")}
            className="px-4 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-100 hover:bg-white/4 transition-all cursor-pointer"
          >
            Dashboard Admin
          </button>
        </div>

        {apiError && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {apiSuccess && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{apiSuccess}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("normal")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "normal" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-550 dark:text-slate-400 hover:text-slate-200" }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Absensi Harian
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("correction")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "correction" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-550 dark:text-slate-400 hover:text-slate-200" }`}
          >
            <History className="w-3.5 h-3.5" />
            Koreksi Absen (Lupa Tap)
          </button>
        </div>

        {activeTab === "normal" ? (
          <div className="space-y-6">
            {/* Live Clock & Info Panel */}
            <div className="p-6 rounded-2xl bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Waktu Server Saat Ini (Asia/Jakarta)</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-xl font-mono font-bold text-slate-900 dark:text-white">{timeStr || "Memuat..."}</span>
                </div>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Hari & Tanggal</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </div>

            {/* Status Board */}
            <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-blue-500" /> Status Absensi Hari Ini
              </h2>
              
              <div className={selfieSettings.enable_break_attendance ? "grid grid-cols-2 sm:grid-cols-4 gap-4" : "grid grid-cols-2 gap-4"}>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4 text-center space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-455 block font-bold uppercase tracking-wider">Absen Masuk</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {todayLog?.clockIn 
                      ? new Date(todayLog.clockIn).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) 
                      : "-"}
                  </span>
                </div>

                {selfieSettings.enable_break_attendance && (
                  <>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4 text-center space-y-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-455 block font-bold uppercase tracking-wider">Mulai Istirahat</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {todayLog?.breakOut 
                          ? new Date(todayLog.breakOut).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) 
                          : "-"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4 text-center space-y-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-455 block font-bold uppercase tracking-wider">Kembali Bekerja</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {todayLog?.breakIn 
                          ? new Date(todayLog.breakIn).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) 
                          : "-"}
                      </span>
                    </div>
                  </>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/1 border border-slate-200/60 dark:border-white/4 text-center space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-455 block font-bold uppercase tracking-wider">Absen Pulang</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {todayLog?.clockOut 
                      ? new Date(todayLog.clockOut).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) 
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Geolocation Section */}
              <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-2xl p-6 space-y-6">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4 flex items-center gap-1.5">
                  <MapPin className="w-4.5 h-4.5 text-slate-700 dark:text-slate-300" /> Lokasi GPS Anda
                </h2>

                {locLoading ? (
                  <div className="h-48 bg-white/1 border border-slate-200 dark:border-white/8 rounded-lg flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-800 dark:text-slate-200" />
                    Mencari Koordinat GPS...
                  </div>
                ) : locError ? (
                  <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-xs text-red-400 flex flex-col gap-2">
                    <p>{locError}</p>
                    <button onClick={getLocation} className="flex items-center gap-1 text-[10px] underline hover:text-red-300 w-fit cursor-pointer">
                      <RefreshCw className="w-3 h-3" /> Coba Lagi
                    </button>
                  </div>
                ) : lat !== null && lng !== null ? (
                  <div className="space-y-4">
                    <BranchMap
                      lat={lat}
                      lng={lng}
                      radius={selfieSettings.default_geo_radius || 15}
                      onChange={(nLat, nLng) => {
                        setLat(nLat);
                        setLng(nLng);
                      }}
                    />
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>GPS: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
                      <button onClick={getLocation} className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer">
                        <RefreshCw className="w-3 h-3" /> Refresh GPS
                      </button>
                    </div>

                    {/* Emergency Override Option */}
                    <div className="p-4 rounded-xl bg-white/1 border border-slate-200 dark:border-white/4 space-y-3 mt-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="override-check"
                          checked={isLocationOverride}
                          onChange={e => setIsLocationOverride(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-200 dark:border-white/8 bg-slate-900 accent-blue-500 cursor-pointer"
                        />
                        <label htmlFor="override-check" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                          Gunakan Absen Darurat (Kendala Lokasi)
                        </label>
                      </div>
                      
                      {isLocationOverride && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-550 dark:text-slate-400 font-semibold">Alasan Kendala Lokasi (Wajib)</label>
                          <textarea
                            required
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="e.g. GPS melompat / Akurasi lemah di dalam gedung..."
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs placeholder:text-slate-650"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Camera & Submit Section */}
              <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-2xl p-6 space-y-6">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-4.5 h-4.5 text-purple-500" /> Verifikasi Wajah (Selfie)
                  </span>
                  {isSelfieRequiredForCurrentStep() ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">Wajib Swafoto</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">Tanpa Swafoto</span>
                  )}
                </h2>

                {isSelfieRequiredForCurrentStep() ? (
                  <div className="space-y-4">
                    <div className="relative aspect-video rounded-xl bg-black border border-slate-200 dark:border-white/8 overflow-hidden flex items-center justify-center">
                      {cameraActive ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      ) : photo ? (
                        <img
                          src={photo}
                          alt="Captured Selfie"
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      ) : (
                        <div className="text-center p-6 text-slate-500 space-y-2">
                          <Camera className="w-8 h-8 mx-auto opacity-40" />
                          <p className="text-xs">Mengaktifkan kamera depan...</p>
                        </div>
                      )}

                      {cameraActive && (
                        <div className="absolute inset-0 border-2 border-dashed border-blue-500/30 rounded-xl pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-48 rounded-full border border-dashed border-blue-400/40" />
                        </div>
                      )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-4">
                      {cameraActive ? (
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer active:scale-[0.98] transition-all text-center shadow-xs"
                        >
                          Ambil Foto Selfie
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex-1 py-2.5 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-100 hover:bg-white/4 cursor-pointer transition-all text-center"
                        >
                          {photo ? "Ulangi Foto Selfie" : "Aktifkan Kamera Depan"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : currentStep !== "completed" ? (
                  <div className="h-48 bg-slate-50 dark:bg-white/1 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500 dark:text-slate-400 gap-2">
                    <Camera className="w-8 h-8 opacity-40 text-blue-500" />
                    <p className="text-xs font-semibold">Swafoto (Selfie) Tidak Diperlukan</p>
                    <p className="text-[10px] opacity-70">Langkah absensi ini dapat langsung Anda kirimkan.</p>
                  </div>
                ) : null}

                {/* Submit Attendance Button */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/4">
                  {currentStep === "clock_in" && (
                    <button
                      onClick={handleAttendanceSubmit}
                      disabled={submitting || (isSelfieRequiredForCurrentStep() && !photo) || (isLocationOverride && !note) || locLoading}
                      className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow shadow-emerald-500/20 active:scale-[0.98] cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Kirim Absen Masuk
                    </button>
                  )}

                  {currentStep === "break_out" && (
                    <button
                      onClick={handleAttendanceSubmit}
                      disabled={submitting || (isSelfieRequiredForCurrentStep() && !photo) || (isLocationOverride && !note) || locLoading}
                      className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow shadow-amber-500/20 active:scale-[0.98] cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      Kirim Mulai Istirahat
                    </button>
                  )}

                  {currentStep === "break_in" && (
                    <button
                      onClick={handleAttendanceSubmit}
                      disabled={submitting || (isSelfieRequiredForCurrentStep() && !photo) || (isLocationOverride && !note) || locLoading}
                      className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow shadow-blue-500/20 active:scale-[0.98] cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Kirim Selesai Istirahat
                    </button>
                  )}

                  {currentStep === "clock_out" && (
                    <button
                      onClick={handleAttendanceSubmit}
                      disabled={submitting || (isSelfieRequiredForCurrentStep() && !photo) || (isLocationOverride && !note) || locLoading}
                      className="w-full py-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-900 dark:border-white/10 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold shadow-xs active:scale-[0.98] cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      Kirim Absen Pulang
                    </button>
                  )}

                  {currentStep === "completed" && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Anda telah menyelesaikan semua tahap absensi hari ini.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/6 shadow-xs rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 dark:border-white/4 mb-6 gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-200">Riwayat Pengajuan Koreksi Absen</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Daftar pengajuan koreksi jam masuk dan pulang harian.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCorrDate("");
                    setCorrClockIn("");
                    setCorrClockOut("");
                    setCorrReasonType("lupa_tap");
                    setCorrReasonNote("");
                    setCorrEvidenceUrl("");
                    setCorrectionModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Ajukan Koreksi
                </button>
              </div>

              {correctionsHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
                  <History className="w-8 h-8 mx-auto opacity-30" />
                  <p>Belum ada pengajuan koreksi absen.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/2">
                        <th className="p-3 font-semibold">Tanggal Absen</th>
                        <th className="p-3 font-semibold">Koreksi Jam</th>
                        <th className="p-3 font-semibold">Kategori Alasan</th>
                        <th className="p-3 font-semibold">Penjelasan</th>
                        <th className="p-3 font-semibold">Bukti</th>
                        <th className="p-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {correctionsHistory.map((corr) => (
                        <tr key={corr._id} className="border-b border-slate-200 dark:border-white/4 text-slate-900 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-white/1">
                          <td className="p-3 font-medium">
                            {new Date(corr.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="p-3 font-mono font-semibold">
                            {corr.clockInTime} - {corr.clockOutTime}
                          </td>
                          <td className="p-3 capitalize font-semibold text-slate-650 dark:text-slate-350">
                            {corr.reasonType.replace(/_/g, " ")}
                          </td>
                          <td className="p-3 max-w-[200px] truncate" title={corr.reasonNote}>
                            {corr.reasonNote}
                          </td>
                          <td className="p-3">
                            {corr.evidenceUrl ? (
                              <a href={corr.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 font-semibold">
                                <FileText className="w-3.5 h-3.5" /> Lihat Bukti
                              </a>
                            ) : "-"}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              corr.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-500/20"
                                : corr.status === "rejected"
                                ? "bg-red-500/10 text-red-700 dark:text-red-450 border-red-500/20"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-450 border-amber-500/20"
                            }`}>
                              {corr.status === "approved" ? "Disetujui" : corr.status === "rejected" ? "Ditolak" : "Menunggu"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Correction Submission Modal */}
        <AnimatePresence>
          {correctionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setCorrectionModalOpen(false)}
                className="absolute inset-0 bg-black"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 shadow-2xl rounded-xl w-full max-w-md relative z-10 overflow-hidden p-6 text-slate-900 dark:text-slate-100"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4 mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <History className="w-5 h-5 text-blue-500" /> Ajukan Koreksi Absen
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCorrectionModalOpen(false)}
                    className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-500 dark:text-slate-400 hover:text-slate-250 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCorrectionSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-350 font-semibold block mb-1">Tanggal Absensi yang Lupa / Salah</label>
                    <input
                      type="date"
                      required
                      value={corrDate}
                      onChange={(e) => setCorrDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 font-semibold block mb-1">Jam Masuk Seharusnya</label>
                      <input
                        type="time"
                        required
                        value={corrClockIn}
                        onChange={(e) => setCorrClockIn(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 font-semibold block mb-1">Jam Pulang Seharusnya</label>
                      <input
                        type="time"
                        required
                        value={corrClockOut}
                        onChange={(e) => setCorrClockOut(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-350 font-semibold block mb-1">Kategori Alasan</label>
                    <select
                      value={corrReasonType}
                      onChange={(e) => setCorrReasonType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    >
                      <option value="lupa_tap">Lupa Tap Masuk / Pulang</option>
                      <option value="kendala_aplikasi">Kendala Aplikasi / Handphone Error</option>
                      <option value="dinas_luar">Dinas Luar Tanpa Akses Internet</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-350 font-semibold block mb-1">Penjelasan Detail Alasan</label>
                    <textarea
                      required
                      value={corrReasonNote}
                      onChange={(e) => setCorrReasonNote(e.target.value)}
                      placeholder="Jelaskan alasan detail dilakukannya koreksi jam absensi..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-350 font-semibold block mb-1">Dokumen Bukti Pendukung (Gambar/PDF - Opsional)</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-slate-200 dark:border-white/8 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-white/3 transition-all">
                        <div className="flex flex-col items-center justify-center pt-3 pb-3 text-[10px] text-slate-400">
                          <UploadCloud className="w-5 h-5 mb-1" />
                          <p className="font-semibold">{corrEvidenceUrl ? "Berkas Bukti Terpilih" : "Unggah Bukti Pendukung"}</p>
                          <p className="text-[9px] opacity-70">PNG, JPG, PDF (Maks 2MB)</p>
                        </div>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/4 mt-6">
                    <button
                      type="button"
                      onClick={() => setCorrectionModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-250 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={corrSubmitting}
                      className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
                    >
                      {corrSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Kirim Pengajuan
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
