"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileText, Printer, ReceiptText, Trash2, Users, Wallet } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  SkeletonList,
  StatCard,
  StatusBadge,
  TableWrap,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client-api";
import { formatPeriod, formatRupiah, wibPeriodKey } from "@/lib/time";

import { MonthPicker } from "@/components/ui/DatePicker";
interface Employee {
  _id: string;
  name: string;
  employeeId: string;
}

interface PayrollRecord {
  _id: string;
  employeeId: { _id: string; name: string; employeeId: string } | null;
  period: string;
  basicSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
}

/** Per-employee failure returned alongside the successes by POST /payroll. */
interface RunFailure {
  id: string;
  name?: string;
  message: string;
}

export default function PayrollPage() {
  const toast = useToast();

  const [period, setPeriod] = useState(wibPeriodKey());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [failures, setFailures] = useState<RunFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<PayrollRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [emp, pay] = await Promise.all([
        api.get<Employee[]>("/api/v1/employees?status=active&limit=500"),
        api.get<PayrollRecord[]>("/api/v1/payroll?period=" + period),
      ]);
      setEmployees(emp.data ?? []);
      setPayrolls(pay.data ?? []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Employees who already have a slip this period are listed apart from the
     rest rather than silently skipped, so the queue always says who is left. */
  const doneIds = useMemo(
    () => new Set(payrolls.map((p) => p.employeeId?._id).filter(Boolean) as string[]),
    [payrolls]
  );
  const pending = employees.filter((e) => !doneIds.has(e._id));

  const totals = useMemo(
    () => ({
      count: payrolls.length,
      net: payrolls.reduce((n, p) => n + (p.netSalary || 0), 0),
      deductions: payrolls.reduce((n, p) => n + (p.totalDeductions || 0), 0),
    }),
    [payrolls]
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allSelected = pending.length > 0 && selected.length === pending.length;

  const run = async () => {
    if (!selected.length) return;
    setSubmitting(true);
    setFailures([]);
    try {
      const res = await api.post<{ results: unknown[]; errors: RunFailure[] }>("/api/v1/payroll", {
        period,
        employeeIds: selected,
      });
      const made = res.data?.results?.length ?? 0;
      const failed = res.data?.errors ?? [];
      setFailures(failed);
      setSelected([]);

      // A run that creates some slips and rejects others is neither a success
      // nor an error, and the reason for each rejection has to outlive the
      // reload that follows — hence the list below the form.
      if (made && failed.length) {
        toast.warning(
          made + " slip dibuat, " + failed.length + " gagal",
          "Alasan setiap kegagalan tercantum di bawah formulir."
        );
      } else if (made) {
        toast.success(made + " slip gaji dibuat", "Periode " + formatPeriod(period) + ".");
      } else {
        toast.error(
          "Tidak ada slip gaji yang dibuat",
          "Alasan kegagalan tercantum di bawah formulir."
        );
      }
      await load();
    } catch (err) {
      toast.error("Gagal memproses slip gaji", errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.delete("/api/v1/payroll?id=" + deleting._id);
      toast.success(
        "Draf dihapus",
        (deleting.employeeId?.name ?? "Karyawan") + " dikeluarkan dari periode ini."
      );
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error("Gagal menghapus draf", errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title="Slip Gaji"
        description="Terbitkan slip gaji bulanan. Lembur, potongan keterlambatan, alpha, BPJS, dan PPh 21 dihitung dari data presensi memakai tarif yang diatur di Pengaturan."
        actions={
          <Link href="/admin/payroll/templates">
            <Button variant="secondary" icon={FileText}>
              Template slip gaji
            </Button>
          </Link>
        }
      />

      {payrolls.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <StatCard
            label="Slip terbit"
            value={totals.count}
            hint={"Periode " + formatPeriod(period)}
            icon={ReceiptText}
          />
          <StatCard
            label="Total dibayarkan"
            value={formatRupiah(totals.net)}
            hint="Jumlah gaji bersih seluruh slip periode ini"
            icon={Wallet}
            tone="success"
          />
          <StatCard
            label="Total potongan"
            value={formatRupiah(totals.deductions)}
            hint="Keterlambatan, alpha, BPJS, dan PPh 21"
            icon={CalendarDays}
            tone="warning"
          />
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-start">
        {/* ---------------- run a period ---------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Periode & karyawan" icon={CalendarDays} />
            <CardBody className="space-y-5">
              <Field label="Periode gaji" required htmlFor="pr-period">
                <MonthPicker
                  id="pr-period"
                  value={period}
                  onChange={(value) => {
                    setPeriod(value);
                    setSelected([]);
                    setFailures([]);
                  }}
                />
              </Field>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body-sm font-medium text-foreground">
                    Belum punya slip ({pending.length})
                  </span>
                  {pending.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelected(allSelected ? [] : pending.map((e) => e._id))}
                      className="text-body-sm text-primary hover:underline"
                    >
                      {allSelected ? "Kosongkan pilihan" : "Pilih semua"}
                    </button>
                  )}
                </div>

                {pending.length === 0 ? (
                  <p className="text-body-sm text-muted leading-relaxed rounded-[var(--radius-control)] bg-surface-2 p-3.5">
                    {employees.length === 0
                      ? "Belum ada karyawan aktif yang bisa diproses."
                      : "Seluruh " +
                        employees.length +
                        " karyawan aktif sudah memiliki slip gaji untuk " +
                        formatPeriod(period) +
                        "."}
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-[var(--radius-control)] border border-line divide-y divide-[var(--border)]">
                    {pending.map((emp) => (
                      <label
                        key={emp._id}
                        className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-surface-2 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(emp._id)}
                          onChange={() => toggle(emp._id)}
                          className="w-4 h-4 rounded border-line accent-[var(--primary)] cursor-pointer"
                        />
                        <span className="min-w-0">
                          <span className="block text-body-sm text-foreground truncate">
                            {emp.name}
                          </span>
                          <span className="block text-label text-subtle">{emp.employeeId}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                icon={ReceiptText}
                loading={submitting}
                disabled={selected.length === 0}
                onClick={run}
              >
                Proses {selected.length || ""} slip gaji
              </Button>
            </CardBody>
          </Card>

          {failures.length > 0 && (
            <Card>
              <CardHeader
                title={"Gagal diproses (" + failures.length + ")"}
                description="Perbaiki penyebabnya, lalu jalankan ulang untuk karyawan tersebut."
              />
              <CardBody className="space-y-3">
                {failures.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-[var(--radius-control)] bg-danger-soft border border-danger/20 p-3.5"
                  >
                    <p className="text-body-sm font-medium text-foreground">
                      {f.name ?? employees.find((e) => e._id === f.id)?.name ?? "Karyawan"}
                    </p>
                    <p className="text-body-sm text-muted leading-relaxed mt-1">{f.message}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        {/* ---------------- what has been issued ---------------- */}
        <Card>
          <CardHeader title="Slip gaji terbit" description={formatPeriod(period)} icon={Users} />
          <CardBody>
            {loading ? (
              <SkeletonList rows={4} />
            ) : payrolls.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Belum ada slip gaji periode ini"
                description="Pilih karyawan di sebelah kiri, lalu proses untuk menerbitkan slip gaji beserta perhitungan lembur, potongan, dan pajaknya."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Karyawan</Th>
                    <Th className="text-right">Penghasilan</Th>
                    <Th className="text-right">Potongan</Th>
                    <Th className="text-right">Gaji bersih</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((pr) => (
                    <Tr key={pr._id}>
                      <Td>
                        <span className="block text-foreground font-medium">
                          {pr.employeeId?.name ?? "Karyawan terhapus"}
                        </span>
                        <span className="block text-label text-subtle">
                          {pr.employeeId?.employeeId ?? "—"}
                        </span>
                      </Td>
                      <Td className="text-right tabular-nums">{formatRupiah(pr.totalEarnings)}</Td>
                      <Td className="text-right tabular-nums text-warning">
                        {formatRupiah(pr.totalDeductions)}
                      </Td>
                      <Td className="text-right tabular-nums font-semibold text-foreground">
                        {formatRupiah(pr.netSalary)}
                      </Td>
                      <Td>
                        <StatusBadge status={pr.status} />
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={"/print/payslip/" + pr._id} target="_blank">
                            <Button variant="ghost" size="sm" icon={Printer}>
                              Cetak
                            </Button>
                          </Link>
                          {pr.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              aria-label={"Hapus draf slip " + (pr.employeeId?.name ?? "")}
                              onClick={() => setDeleting(pr)}
                            />
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        tone="danger"
        title="Hapus draf slip gaji?"
        message={
          "Draf slip " +
          (deleting?.employeeId?.name ?? "karyawan ini") +
          " untuk " +
          formatPeriod(period) +
          " akan dihapus. Anda dapat memprosesnya kembali kapan saja."
        }
        confirmLabel="Hapus draf"
      />
    </div>
  );
}
