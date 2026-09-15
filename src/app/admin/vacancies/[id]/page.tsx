"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleX,
  FileText,
  Link2,
  Mail,
  Phone,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Field,
  ICON_STROKE,
  Input,
  Modal,
  PageHeader,
  Select,
  SkeletonList,
  StatCard,
  StatusBadge,
  Textarea,
  cn,
} from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateTime, formatRelative } from "@/lib/time";

interface HistoryEntry {
  _id: string;
  stage: string;
  status: string;
  notes?: string;
  createdAt: string;
  interviewerId?: { name?: string } | null;
}

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  currentStage: string;
  status: string;
  cvUrl?: string;
  coverLetter?: string;
  portfolioUrl?: string;
  rejectionReason?: string;
  offeringSalary?: number;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntry[];
}

interface BoardData {
  vacancy: {
    _id: string;
    title: string;
    slug: string;
    status: string;
    stages: string[];
    openings: number;
    divisionId?: { name: string } | null;
    branchId?: { name: string } | null;
    positionId?: { _id: string; name: string } | null;
  };
  board: Record<string, Candidate[]>;
  orphaned: Candidate[];
  total: number;
  byStatus: Record<string, number>;
}

export default function VacancyBoardPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();

  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Candidate | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [hireTarget, setHireTarget] = useState<Candidate | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get<BoardData>(`/api/v1/vacancies/${params.id}`);
      setData(res.data ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64" />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { vacancy, board, orphaned } = data;

  return (
    <div>
      <Link
        href="/admin/vacancies"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-muted hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={ICON_STROKE} />
        Semua lowongan
      </Link>

      <PageHeader
        eyebrow="Papan pelamar"
        title={vacancy.title}
        description={
          [vacancy.divisionId?.name, vacancy.branchId?.name].filter(Boolean).join(" · ") ||
          "Penempatan belum diatur"
        }
        actions={
          <Button icon={UserPlus} onClick={() => setAddOpen(true)}>
            Tambah pelamar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-7">
        <StatCard label="Total pelamar" value={data.total} icon={Users} />
        <StatCard
          label="Sedang diproses"
          value={data.byStatus.in_progress ?? 0}
          hint="masuk tahap seleksi"
          icon={ArrowRight}
          tone="info"
        />
        <StatCard
          label="Lolos"
          value={data.byStatus.passed ?? 0}
          hint={`kebutuhan ${vacancy.openings} posisi`}
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="Tidak lolos"
          value={data.byStatus.rejected ?? 0}
          icon={CircleX}
          tone={data.byStatus.rejected ? "danger" : "neutral"}
        />
      </div>

      {orphaned.length > 0 && (
        <Alert tone="warning" title="Ada pelamar di tahap yang sudah dihapus" className="mb-6">
          {orphaned.length} pelamar masih tercatat pada tahap yang tidak lagi ada di lowongan ini.
          Buka kartunya dan pindahkan ke salah satu tahap aktif.
        </Alert>
      )}

      {data.total === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Belum ada pelamar"
            description={
              vacancy.status === "open"
                ? "Lowongan sudah tayang. Lamaran yang masuk lewat halaman karier akan muncul di sini."
                : "Lowongan ini belum tayang, jadi belum bisa menerima lamaran dari halaman karier."
            }
            action={
              <Button size="sm" icon={UserPlus} onClick={() => setAddOpen(true)}>
                Tambah pelamar manual
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          <div className="flex gap-4 min-w-max">
            {vacancy.stages.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                candidates={board[stage] ?? []}
                onOpen={setActive}
              />
            ))}
            {orphaned.length > 0 && (
              <StageColumn stage="Tahap tidak dikenal" candidates={orphaned} onOpen={setActive} orphan />
            )}
          </div>
        </div>
      )}

      <CandidateDrawer
        candidate={active}
        stages={vacancy.stages}
        onClose={() => setActive(null)}
        onChanged={() => {
          setActive(null);
          void load();
        }}
        onHire={(c) => {
          setActive(null);
          setHireTarget(c);
        }}
      />

      <AddCandidateModal
        open={addOpen}
        vacancyId={vacancy._id}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          void load();
        }}
      />

      <HireModal
        candidate={hireTarget}
        defaultPositionId={vacancy.positionId?._id ?? ""}
        onClose={() => setHireTarget(null)}
        onHired={() => {
          setHireTarget(null);
          void load();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StageColumn({
  stage,
  candidates,
  onOpen,
  orphan = false,
}: {
  stage: string;
  candidates: Candidate[];
  onOpen: (c: Candidate) => void;
  orphan?: boolean;
}) {
  return (
    <section className="w-[290px] shrink-0">
      <header
        className={cn(
          "flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-t-[var(--radius)] border border-b-0 border-line",
          orphan ? "bg-warning-soft" : "bg-surface-2"
        )}
      >
        <h2 className="text-[13px] font-semibold text-heading truncate">{stage}</h2>
        <span className="text-xs font-semibold text-subtle tabular-nums shrink-0">
          {candidates.length}
        </span>
      </header>

      <div className="border border-line rounded-b-[var(--radius)] bg-surface/50 p-2 space-y-2 min-h-32">
        {candidates.length === 0 ? (
          <p className="text-xs text-subtle text-center py-8 px-3 leading-relaxed">
            Belum ada pelamar di tahap ini.
          </p>
        ) : (
          candidates.map((c) => (
            <button
              key={c._id}
              onClick={() => onOpen(c)}
              className="w-full text-left card p-3.5 hover:border-primary transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-heading truncate">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-1.5 text-xs text-muted truncate">{c.email}</p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-subtle">{formatRelative(c.updatedAt)}</span>
                {c.cvUrl && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-subtle">
                    <FileText className="w-3 h-3" strokeWidth={ICON_STROKE} />
                    CV
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function CandidateDrawer({
  candidate,
  stages,
  onClose,
  onChanged,
  onHire,
}: {
  candidate: Candidate | null;
  stages: string[];
  onClose: () => void;
  onChanged: () => void;
  onHire: (c: Candidate) => void;
}) {
  const toast = useToast();
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("in_progress");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!candidate) return;
    setStage(candidate.currentStage);
    setStatus(candidate.status);
    setNotes("");
    setRejectionReason(candidate.rejectionReason ?? "");
  }, [candidate]);

  if (!candidate) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch("/api/v1/candidates", {
        id: candidate._id,
        stage,
        status,
        notes: notes.trim() || undefined,
        rejectionReason: status === "rejected" ? rejectionReason.trim() : undefined,
      });
      toast.success("Tersimpan", res.message);
      onChanged();
    } catch (err) {
      toast.error("Gagal memperbarui", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={candidate.name}
      description={`Melamar ${formatRelative(candidate.createdAt)} melalui ${
        candidate.source === "career_page"
          ? "halaman karier"
          : candidate.source === "api"
            ? "API eksternal"
            : "input manual"
      }`}
      size="lg"
      footer={
        <>
          {candidate.status !== "rejected" && (
            <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => onHire(candidate)}>
              Terima jadi karyawan
            </Button>
          )}
          <Button size="sm" type="submit" form="candidate-form" loading={saving}>
            Simpan perubahan
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <ContactLine icon={Mail} value={candidate.email} href={`mailto:${candidate.email}`} />
          <ContactLine icon={Phone} value={candidate.phone} href={`tel:${candidate.phone}`} />
          {candidate.cvUrl && (
            <ContactLine icon={FileText} value="Buka CV" href={candidate.cvUrl} external />
          )}
          {candidate.portfolioUrl && (
            <ContactLine icon={Link2} value="Portofolio" href={candidate.portfolioUrl} external />
          )}
        </div>

        {candidate.coverLetter && (
          <div>
            <p className="eyebrow mb-2">Surat lamaran</p>
            <p className="text-[13px] text-muted leading-relaxed whitespace-pre-wrap">
              {candidate.coverLetter}
            </p>
          </div>
        )}

        <form id="candidate-form" onSubmit={save} className="space-y-4 pt-5 border-t border-line">
          <p className="eyebrow">Perbarui tahap</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tahap" htmlFor="cd-stage">
              <Select id="cd-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {!stages.includes(candidate.currentStage) && (
                  <option value={candidate.currentStage}>
                    {candidate.currentStage} (tahap lama)
                  </option>
                )}
              </Select>
            </Field>
            <Field label="Hasil" htmlFor="cd-status">
              <Select id="cd-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Belum diproses</option>
                <option value="in_progress">Sedang diproses</option>
                <option value="passed">Lolos</option>
                <option value="on_hold">Ditahan</option>
                <option value="rejected">Tidak lolos</option>
              </Select>
            </Field>
          </div>

          {status === "rejected" && (
            <Field
              label="Alasan tidak lolos"
              required
              htmlFor="cd-reason"
              hint="Wajib diisi agar keputusan dapat ditelusuri bila pelamar melamar lagi di kemudian hari."
            >
              <Textarea
                id="cd-reason"
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Pengalaman belum sesuai kebutuhan tim untuk level ini."
              />
            </Field>
          )}

          <Field label="Catatan tahap" htmlFor="cd-notes" hint="Tersimpan di riwayat pelamar.">
            <Textarea
              id="cd-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Interview HRD 12 Juli, komunikasi baik, lanjut ke user."
            />
          </Field>
        </form>

        <div className="pt-5 border-t border-line">
          <p className="eyebrow mb-3">Riwayat seleksi</p>
          {candidate.history.length === 0 ? (
            <p className="text-[13px] text-muted">Belum ada riwayat.</p>
          ) : (
            <ol className="space-y-3">
              {candidate.history.map((h) => (
                <li key={h._id} className="flex gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-line-strong shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                      {h.stage}
                      <span className="ml-2 font-normal">
                        <StatusBadge status={h.status} />
                      </span>
                    </p>
                    {h.notes && (
                      <p className="text-xs text-muted mt-1 leading-relaxed">{h.notes}</p>
                    )}
                    <p className="text-[11px] text-subtle mt-1">
                      {formatDateTime(h.createdAt)}
                      {h.interviewerId?.name && ` · ${h.interviewerId.name}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ContactLine({
  icon: Icon,
  value,
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-primary transition-colors"
    >
      <Icon className="w-4 h-4 text-subtle" strokeWidth={ICON_STROKE} />
      {value}
    </a>
  );
}

/* ------------------------------------------------------------------ */

function AddCandidateModal({
  open,
  vacancyId,
  onClose,
  onSaved,
}: {
  open: boolean;
  vacancyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", coverLetter: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ name: "", email: "", phone: "", coverLetter: "" });
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post("/api/v1/candidates", { vacancyId, ...form });
      toast.success("Pelamar ditambahkan", res.message);
      onSaved();
    } catch (err) {
      toast.error("Gagal menambahkan", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah pelamar manual"
      description="Untuk lamaran yang masuk lewat jalur lain, misalnya referensi karyawan atau job fair."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button size="sm" type="submit" form="add-candidate" loading={saving}>
            Tambahkan
          </Button>
        </>
      }
    >
      <form id="add-candidate" onSubmit={submit} className="space-y-4">
        <Field label="Nama lengkap" required htmlFor="ac-name">
          <Input
            id="ac-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email" required htmlFor="ac-email">
            <Input
              id="ac-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Nomor telepon" required htmlFor="ac-phone">
            <Input
              id="ac-phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
            />
          </Field>
        </div>
        <Field label="Catatan" htmlFor="ac-note" hint="Opsional, misalnya sumber referensi.">
          <Textarea
            id="ac-note"
            value={form.coverLetter}
            onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
          />
        </Field>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function HireModal({
  candidate,
  defaultPositionId,
  onClose,
  onHired,
}: {
  candidate: Candidate | null;
  defaultPositionId: string;
  onClose: () => void;
  onHired: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    branchId: "",
    divisionId: "",
    positionId: "",
    joinDate: "",
    officeEmail: "",
    employmentStatus: "probation",
    roleId: "",
  });
  const [opts, setOpts] = useState<{
    branches: Array<{ _id: string; name: string }>;
    divisions: Array<{ _id: string; name: string }>;
    positions: Array<{ _id: string; name: string }>;
    roles: Array<{ _id: string; name: string }>;
  }>({ branches: [], divisions: [], positions: [], roles: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!candidate) return;
    setForm({
      branchId: "",
      divisionId: "",
      positionId: defaultPositionId,
      joinDate: "",
      officeEmail: "",
      employmentStatus: "probation",
      roleId: "",
    });
    void (async () => {
      try {
        const [b, d, p, r] = await Promise.all([
          api.get<Array<{ _id: string; name: string }>>("/api/v1/branches"),
          api.get<Array<{ _id: string; name: string }>>("/api/v1/divisions"),
          api.get<Array<{ _id: string; name: string }>>("/api/v1/positions"),
          api.get<{ roles: Array<{ _id: string; name: string }> }>("/api/v1/roles"),
        ]);
        setOpts({
          branches: b.data ?? [],
          divisions: d.data ?? [],
          positions: p.data ?? [],
          roles: r.data?.roles ?? [],
        });
      } catch {
        // Selects stay empty; the server validates the required ids anyway.
      }
    })();
  }, [candidate, defaultPositionId]);

  if (!candidate) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/api/v1/candidates", { id: candidate._id, ...form });
      toast.success("Karyawan dibuat", res.message);
      onHired();
    } catch (err) {
      toast.error("Gagal memproses", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Terima ${candidate.name} sebagai karyawan`}
      description="Data dari lamaran dipindahkan ke kartu karyawan baru berstatus onboarding."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button size="sm" type="submit" form="hire-form" loading={saving}>
            Buat karyawan
          </Button>
        </>
      }
    >
      <form id="hire-form" onSubmit={submit} className="space-y-4">
        <Alert tone="info">
          Hanya nama, email pribadi, dan nomor telepon yang terisi otomatis dari lamaran. NIK, NPWP,
          rekening, dan data pribadi lainnya sengaja dibiarkan kosong untuk dilengkapi HRD bersama
          karyawan, bukan diisi tebakan oleh sistem.
        </Alert>

        <Field
          label="Email kantor"
          required
          htmlFor="hr-email"
          hint="Dipakai sebagai email login. Harus berbeda dari email pribadi pelamar."
        >
          <Input
            id="hr-email"
            type="email"
            required
            value={form.officeEmail}
            onChange={(e) => setForm({ ...form, officeEmail: e.target.value })}
            placeholder="nama@perusahaan.com"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Cabang" required htmlFor="hr-branch">
            <Select
              id="hr-branch"
              required
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              <option value="">Pilih cabang…</option>
              {opts.branches.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Divisi" required htmlFor="hr-division">
            <Select
              id="hr-division"
              required
              value={form.divisionId}
              onChange={(e) => setForm({ ...form, divisionId: e.target.value })}
            >
              <option value="">Pilih divisi…</option>
              {opts.divisions.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Jabatan" required htmlFor="hr-position">
            <Select
              id="hr-position"
              required
              value={form.positionId}
              onChange={(e) => setForm({ ...form, positionId: e.target.value })}
            >
              <option value="">Pilih jabatan…</option>
              {opts.positions.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal mulai kerja" required htmlFor="hr-join">
            <Input
              id="hr-join"
              type="date"
              required
              value={form.joinDate}
              onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
            />
          </Field>
          <Field label="Status kepegawaian" htmlFor="hr-emp">
            <Select
              id="hr-emp"
              value={form.employmentStatus}
              onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}
            >
              <option value="probation">Masa percobaan</option>
              <option value="pkwt">PKWT (kontrak)</option>
              <option value="pkwtt">PKWTT (tetap)</option>
              <option value="outsource">Outsource</option>
            </Select>
          </Field>
          <Field
            label="Peran akun"
            htmlFor="hr-role"
            hint="Kosongkan bila akun login dibuat belakangan."
          >
            <Select
              id="hr-role"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            >
              <option value="">Belum dibuatkan akun</option>
              {opts.roles.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
