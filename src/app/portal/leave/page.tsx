"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, History, Info, Paperclip, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Select,
  SkeletonCards,
  StatusBadge,
  Tabs,
  TableWrap,
  Td,
  Textarea,
  Th,
  type BadgeTone,
} from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client-api";
import { formatDate, formatDateTime, wibDateKey } from "@/lib/time";

interface LeaveType {
  _id: string;
  name: string;
  description: string;
  quotaDays: number;
  requiresEvidence: boolean;
  minLeadDays: number;
  maxConsecutiveDays: number;
  deductsBalance: boolean;
  colorTone: BadgeTone;
}

interface Balance {
  _id: string;
  leaveTypeId: LeaveType | null;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

interface LeaveRequest {
  _id: string;
  leaveTypeId: { name: string; colorTone?: BadgeTone } | null;
  startDate: string;
  endDate: string;
  chargedDays: number;
  calendarDays: number;
  reason: string;
  status: string;
  createdAt: string;
  evidenceUrl?: string;
}

export default function LeavePage() {
  const toast = useToast();

  const [tab, setTab] = useState<"balance" | "history">("balance");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const [data, typeRes] = await Promise.all([
        api.get<{ balances: Balance[]; history: LeaveRequest[]; year: number }>("/api/v1/leave"),
        api.get<LeaveType[]>("/api/v1/leave?type=types"),
      ]);
      setBalances(data.data?.balances ?? []);
      setHistory(data.data?.history ?? []);
      setYear(data.data?.year ?? new Date().getFullYear());
      setTypes(typeRes.data ?? []);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => history.filter((h) => h.status === "pending").length, [history]);

  const cancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await api.delete(`/api/v1/leave?id=${cancelTarget._id}`);
      toast.success("Pengajuan dibatalkan", res.message);
      setCancelTarget(null);
      await load();
    } catch (err) {
      toast.error("Gagal membatalkan", errorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <SkeletonCards count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] md:text-[30px] text-heading">Izin &amp; Cuti</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Saldo tahun {year}. Akhir pekan dan hari libur nasional tidak memotong kuota.
          </p>
        </div>
        <Button icon={CalendarPlus} onClick={() => setFormOpen(true)}>
          Ajukan izin / cuti
        </Button>
      </header>

      {loadError && <ErrorState message={loadError} onRetry={load} />}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "balance", label: "Saldo Saya", icon: CalendarDays },
          { id: "history", label: "Riwayat Pengajuan", count: pendingCount, icon: History },
        ]}
      />

      {tab === "balance" && (
        <>
          {balances.length === 0 ? (
            <Card>
              <EmptyState
                icon={CalendarDays}
                title="Saldo belum tersedia"
                description="Hubungi HRD bila jenis cuti belum muncul untuk akun Anda."
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {balances.map((b) => {
                const type = b.leaveTypeId;
                if (!type) return null;
                const pct = b.allocatedDays
                  ? Math.round((b.remainingDays / b.allocatedDays) * 100)
                  : 0;
                return (
                  <div key={b._id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{type.name}</p>
                        <p className="text-[11px] text-subtle mt-0.5 line-clamp-2 leading-relaxed">
                          {type.description || "—"}
                        </p>
                      </div>
                      {!type.deductsBalance && (
                        <Badge tone="neutral">Tidak potong saldo</Badge>
                      )}
                    </div>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-3xl font-semibold tabular-nums">{b.remainingDays}</span>
                      <span className="text-xs text-muted">dari {b.allocatedDays} hari</span>
                    </div>

                    <div
                      className="mt-3 h-1.5 rounded-full bg-surface-2 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Sisa saldo ${type.name}`}
                    >
                      <div
                        className={`h-full rounded-full ${pct > 40 ? "bg-success" : pct > 15 ? "bg-warning" : "bg-danger"}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>

                    <dl className="mt-3.5 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <dt className="text-subtle">Terpakai</dt>
                        <dd className="font-semibold tabular-nums">{b.usedDays} hari</dd>
                      </div>
                      <div>
                        <dt className="text-subtle">Menunggu approval</dt>
                        <dd className="font-semibold tabular-nums">{b.pendingDays} hari</dd>
                      </div>
                    </dl>

                    {type.minLeadDays > 0 && (
                      <p className="mt-3 pt-3 border-t border-line text-[11px] text-subtle flex items-start gap-1.5">
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                        Wajib diajukan minimal H-{type.minLeadDays}.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader title="Riwayat pengajuan" description={`${history.length} pengajuan tercatat.`} />
          <CardBody className="p-0">
            {history.length === 0 ? (
              <EmptyState
                icon={History}
                title="Belum ada pengajuan"
                description="Pengajuan izin dan cuti Anda akan tercatat di sini beserta statusnya."
                action={
                  <Button size="sm" icon={CalendarPlus} onClick={() => setFormOpen(true)}>
                    Ajukan izin / cuti
                  </Button>
                }
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Jenis</Th>
                    <Th>Periode</Th>
                    <Th>Durasi</Th>
                    <Th>Alasan</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h._id} className="hover:bg-surface-2 transition-colors">
                      <Td className="whitespace-nowrap font-medium">
                        {h.leaveTypeId?.name ?? "—"}
                      </Td>
                      <Td className="whitespace-nowrap text-xs">
                        {formatDate(h.startDate)} – {formatDate(h.endDate)}
                      </Td>
                      <Td className="whitespace-nowrap text-xs">
                        <span className="font-semibold tabular-nums">{h.chargedDays} hari kerja</span>
                        {h.calendarDays !== h.chargedDays && (
                          <span className="block text-[11px] text-subtle">
                            {h.calendarDays} hari kalender
                          </span>
                        )}
                      </Td>
                      <Td className="max-w-72">
                        <span className="text-xs text-muted line-clamp-2">{h.reason}</span>
                        {h.evidenceUrl && (
                          <a
                            href={h.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary hover:underline"
                          >
                            <Paperclip className="w-3 h-3" />
                            Lihat lampiran
                          </a>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={h.status} />
                        <span className="block text-[11px] text-subtle mt-1">
                          {formatDateTime(h.createdAt)}
                        </span>
                      </Td>
                      <Td>
                        {h.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setCancelTarget(h)}
                            className="text-danger"
                          >
                            Batalkan
                          </Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </CardBody>
        </Card>
      )}

      <LeaveFormModal
        open={formOpen}
        types={types}
        balances={balances}
        onClose={() => setFormOpen(false)}
        onDone={() => {
          setFormOpen(false);
          setTab("history");
          void load();
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancel}
        loading={cancelling}
        title="Batalkan pengajuan?"
        confirmLabel="Ya, batalkan"
        message={`Pengajuan ${cancelTarget?.leaveTypeId?.name ?? ""} ${cancelTarget ? `${formatDate(cancelTarget.startDate)} – ${formatDate(cancelTarget.endDate)}` : ""} akan dibatalkan dan saldo cuti dikembalikan. Tindakan ini tidak dapat diurungkan.`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LeaveFormModal({
  open,
  types,
  balances,
  onClose,
  onDone,
}: {
  open: boolean;
  types: LeaveType[];
  balances: Balance[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<string | null>(null);
  const [evidenceName, setEvidenceName] = useState("");
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLeaveTypeId(types[0]?._id ?? "");
    setStartDate("");
    setEndDate("");
    setReason("");
    setEvidence(null);
    setEvidenceName("");
    setFileError("");
  }, [open, types]);

  const selected = types.find((t) => t._id === leaveTypeId);
  const balance = balances.find((b) => b.leaveTypeId?._id === leaveTypeId);

  // Earliest date the chosen type permits, so the picker cannot offer a date
  // the server will reject for lead time.
  const minDate = useMemo(() => {
    const lead = selected?.minLeadDays ?? 0;
    const d = new Date();
    d.setDate(d.getDate() + lead);
    return wibDateKey(d);
  }, [selected]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError("");
    if (!file) {
      setEvidence(null);
      setEvidenceName("");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFileError("Ukuran berkas melebihi 8 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEvidence(String(reader.result));
      setEvidenceName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post("/api/v1/leave", {
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim(),
        evidence: evidence ?? undefined,
      });
      toast.success("Pengajuan terkirim", res.message);
      onDone();
    } catch (err) {
      toast.error("Pengajuan gagal", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajukan izin / cuti"
      description="Pengajuan akan diteruskan ke atasan dan HRD sesuai alur yang berlaku."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button size="sm" type="submit" form="leave-form" loading={saving}>
            Kirim pengajuan
          </Button>
        </>
      }
    >
      <form id="leave-form" onSubmit={submit} className="space-y-4">
        <Field label="Jenis izin / cuti" required htmlFor="lv-type">
          <Select
            id="lv-type"
            required
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
          >
            <option value="" disabled>
              Pilih jenis…
            </option>
            {types.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>

        {selected && (
          <Alert tone="info">
            {selected.description && <span className="block mb-1">{selected.description}</span>}
            <span className="block">
              {balance && selected.deductsBalance
                ? `Sisa saldo Anda ${balance.remainingDays} dari ${balance.allocatedDays} hari.`
                : "Jenis ini tidak memotong saldo cuti tahunan."}
              {selected.minLeadDays > 0 && ` Minimal diajukan H-${selected.minLeadDays}.`}
              {selected.maxConsecutiveDays > 0 &&
                ` Maksimal ${selected.maxConsecutiveDays} hari per pengajuan.`}
              {selected.requiresEvidence && " Wajib melampirkan bukti."}
            </span>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal mulai" required htmlFor="lv-start">
            <Input
              id="lv-start"
              type="date"
              required
              min={minDate}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
              }}
            />
          </Field>
          <Field label="Tanggal selesai" required htmlFor="lv-end">
            <Input
              id="lv-end"
              type="date"
              required
              min={startDate || minDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Alasan"
          required
          htmlFor="lv-reason"
          hint="Minimal 10 karakter. Alasan yang jelas mempercepat persetujuan."
        >
          <Textarea
            id="lv-reason"
            required
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Menghadiri pernikahan saudara kandung di Yogyakarta."
          />
        </Field>

        <Field
          label={`Lampiran bukti${selected?.requiresEvidence ? "" : " (opsional)"}`}
          htmlFor="lv-file"
          error={fileError}
          hint="Format JPG, PNG, WEBP, atau PDF. Maksimal 8 MB."
        >
          <input
            id="lv-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onFile}
            className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-surface-hover file:cursor-pointer cursor-pointer"
          />
          {evidenceName && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-success">
              <Paperclip className="w-3 h-3" />
              {evidenceName}
            </p>
          )}
        </Field>
      </form>
    </Modal>
  );
}
