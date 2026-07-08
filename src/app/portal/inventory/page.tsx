"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Package, Loader2, ClipboardCheck, X, FileText, CheckCircle2, ShieldAlert 
} from "lucide-react";

interface InventoryAsset {
  _id: string;
  code: string;
  name: string;
  category: "laptop" | "phone" | "vehicle" | "other";
  condition: "good" | "damaged" | "lost";
}

interface InventoryAssignment {
  _id: string;
  inventoryId: InventoryAsset;
  handoverDate: string;
  signatureUrl?: string;
  status: "pending_handover" | "active" | "returned";
}

export default function InventoryEmployeePage() {
  const [assignments, setAssignments] = useState<InventoryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAsg, setSelectedAsg] = useState<InventoryAssignment | null>(null);

  // Canvas ref for signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signMethod, setSignMethod] = useState<"draw" | "upload">("draw");
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const fetchMyInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/inventory/self");
      const data = await res.json();
      if (data.success) {
        setAssignments(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat inventaris pribadi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInventory();
  }, []);

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmitSignature = async () => {
    if (!selectedAsg) return;

    let signatureData = "";
    if (signMethod === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      signatureData = canvas.toDataURL("image/png");
    } else {
      if (!uploadedFileBase64) {
        alert("Silakan pilih dan unggah berkas BAST terlebih dahulu");
        return;
      }
      signatureData = uploadedFileBase64;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/inventory/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAsg._id,
          signatureData
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAsg(null);
        fetchMyInventory();
      } else {
        alert(data.message || "Gagal menandatangani BAST");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-200 p-6 md:p-12 font-sans relative overflow-hidden">
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Inventaris & Aset Saya
            </h1>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
              Daftar aset fasilitas kantor yang sedang Anda gunakan. Lakukan penandatanganan digital BAST untuk aset baru.
            </p>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500 bg-white dark:bg-white/2">
            <Package className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Tidak ada aset inventaris yang ditugaskan untuk Anda saat ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignments.map(asg => {
              const item = asg.inventoryId;
              const isPending = asg.status === "pending_handover";
              return (
                <div 
                  key={asg._id}
                  className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-white/12 transition-all shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        asg.status === "active"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                      }`}>
                        {asg.status === "active" ? "Aktif (Diterima)" : "Menunggu BAST"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">{item.code}</span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{item.name}</h3>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 capitalize">Kategori: {item.category}</p>
                    </div>

                    <div className="border-t border-slate-200 dark:border-white/4 pt-3 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Tanggal Penyerahan:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(asg.handoverDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {isPending ? (
                    <button
                      onClick={() => setSelectedAsg(asg)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer transition-all shadow-xs"
                    >
                      <FileText className="w-4 h-4" />
                      Tanda Tangan BAST Digital
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 justify-center py-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/15">
                      <CheckCircle2 className="w-4 h-4" />
                      Sudah Diserahterimakan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Signature Digital Canvas Modal */}
        {selectedAsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 rounded-xl shadow-2xl p-6 flex flex-col">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Tanda Tangan Elektronik (BAST)</h3>
                  <p className="text-[9px] text-slate-500 mt-0.5">Konfirmasi penerimaan barang: {selectedAsg.inventoryId.name}</p>
                </div>
                <button
                  onClick={() => setSelectedAsg(null)}
                  className="p-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => setSignMethod("draw")}
                    className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${ signMethod === "draw" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-250" }`}
                  >
                    Tulis Tanda Tangan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignMethod("upload")}
                    className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${ signMethod === "upload" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-250" }`}
                  >
                    Unggah Berkas BAST
                  </button>
                </div>

                <div className="text-[10px] text-slate-550 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-white/2 p-2.5 rounded border border-slate-200 dark:border-white/4">
                  {signMethod === "draw" 
                    ? "Dengan menandatangani di bawah ini, saya menyatakan telah menerima aset dengan baik dan bertanggung jawab atas pemeliharaannya."
                    : "Silakan unggah pindaian (scan) / foto berkas BAST fisik yang sudah ditandatangani secara basah."
                  }
                </div>

                {signMethod === "draw" ? (
                  <div className="border border-slate-200 dark:border-white/8 rounded-lg bg-white overflow-hidden relative">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={180}
                      className="w-full h-44 cursor-crosshair bg-white"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="absolute bottom-2 right-2 text-[9px] text-slate-400 select-none pointer-events-none">
                      Gunakan Mouse / Layar Sentuh
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 dark:border-white/8 rounded-lg p-6 bg-slate-50/50 dark:bg-white/2 flex flex-col items-center justify-center gap-3">
                    <input
                      type="file"
                      id="bast-file-upload"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="bast-file-upload"
                      className="px-4 py-2 bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 rounded-lg cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border border-slate-200"
                    >
                      Pilih Berkas PDF / Gambar
                    </label>
                    {fileName ? (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-xs">
                        Terpilih: {fileName}
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-400">Format yang diterima: PDF, PNG, JPG (Maks 5MB)</div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-white/4 pt-4 flex gap-3">
                <button
                  onClick={signMethod === "draw" ? clearCanvas : () => { setUploadedFileBase64(""); setFileName(""); }}
                  className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-100 transition-all cursor-pointer text-center"
                >
                  {signMethod === "draw" ? "Bersihkan" : "Hapus Berkas"}
                </button>
                <button
                  onClick={handleSubmitSignature}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Konfirmasi & Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
