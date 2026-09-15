"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CircleCheck,
  Clock3,
  MapPin,
  Moon,
  Paperclip,
  Send,
  Sun,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Alert,
  Badge,
  Button,
  Field,
  ICON_STROKE,
  Input,
  SkeletonList,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client-api";
import { formatDate, formatRupiah } from "@/lib/time";

interface VacancyDetail {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  employmentTypeLabel: string;
  workArrangementLabel: string;
  location: string;
  division: string;
  publishedAt?: string;
  closesAt?: string | null;
  salary: { min: number; max: number } | null;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
}

export default function VacancyDetailPage() {
  const params = useParams<{ slug: string }>();
  const { theme, toggleTheme } = useTheme();

  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get<VacancyDetail>(
        `/api/v1/public/vacancies?slug=${encodeURIComponent(params.slug)}`
      );
      setVacancy(res.data ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-16 border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto w-full h-full px-5 flex items-center justify-between gap-4">
          <Link
            href="/career"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={ICON_STROKE} />
            Semua lowongan
          </Link>
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Gunakan tampilan terang" : "Gunakan tampilan gelap"}
            className="p-2 rounded-[var(--radius-control)] text-subtle hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="w-[18px] h-[18px]" strokeWidth={ICON_STROKE} />
            ) : (
              <Moon className="w-[18px] h-[18px]" strokeWidth={ICON_STROKE} />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-5 py-12">
        {loading ? (
          <SkeletonList rows={3} />
        ) : error || !vacancy ? (
          <div className="card p-10 text-center">
            <h1 className="text-[22px] text-heading">Lowongan tidak tersedia</h1>
            <p className="mt-3 text-sm text-muted leading-relaxed max-w-md mx-auto">
              {error || "Lowongan ini sudah ditutup atau tautannya tidak berlaku lagi."}
            </p>
            <Link href="/career">
              <Button variant="secondary" className="mt-6">
                Lihat lowongan lain
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-[30px] md:text-[38px] text-heading leading-[1.12]">
                {vacancy.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted">
                {vacancy.division && (
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-subtle" strokeWidth={ICON_STROKE} />
                    {vacancy.division}
                  </span>
                )}
                {vacancy.location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-subtle" strokeWidth={ICON_STROKE} />
                    {vacancy.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-subtle" strokeWidth={ICON_STROKE} />
                  {vacancy.employmentTypeLabel}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{vacancy.workArrangementLabel}</Badge>
                {vacancy.salary && vacancy.salary.max > 0 && (
                  <Badge tone="success">
                    {formatRupiah(vacancy.salary.min)} – {formatRupiah(vacancy.salary.max)}
                  </Badge>
                )}
                {vacancy.closesAt && (
                  <Badge tone="warning">Lamaran ditutup {formatDate(vacancy.closesAt)}</Badge>
                )}
              </div>
            </div>

            {vacancy.summary && (
              <p className="mt-8 text-[15px] text-foreground/85 leading-[1.7]">{vacancy.summary}</p>
            )}

            <div className="mt-10 space-y-9">
              <BulletSection title="Tanggung jawab" items={vacancy.responsibilities} />
              <BulletSection title="Kualifikasi" items={vacancy.requirements} />
              <BulletSection title="Nilai tambah" items={vacancy.niceToHave} />
              <BulletSection title="Yang kami sediakan" items={vacancy.benefits} />
            </div>

            <div id="lamar" className="mt-12 pt-10 border-t border-line scroll-mt-24">
              {submitted ? (
                <div className="card p-8 text-center">
                  <span className="inline-grid place-items-center w-12 h-12 rounded-[14px] bg-success-soft text-success mb-4">
                    <CircleCheck className="w-6 h-6" strokeWidth={ICON_STROKE} />
                  </span>
                  <h2 className="text-[20px] text-heading">Lamaran terkirim</h2>
                  <p className="mt-3 text-sm text-muted leading-relaxed max-w-md mx-auto">
                    Nomor referensi Anda <strong className="text-foreground">{submitted}</strong>.
                    Simpan nomor ini bila suatu saat perlu menanyakan status lamaran. Tim rekrutmen
                    akan menghubungi pelamar yang profilnya sesuai.
                  </p>
                  <Link href="/career">
                    <Button variant="secondary" className="mt-6">
                      Lihat lowongan lain
                    </Button>
                  </Link>
                </div>
              ) : (
                <ApplyForm slug={vacancy.slug} title={vacancy.title} onDone={setSubmitted} />
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="max-w-4xl mx-auto w-full px-5 py-7 text-[13px] text-subtle">
          &copy; {new Date().getFullYear()} HRIS. Seluruh waktu dalam WIB.
        </div>
      </footer>
    </div>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <section>
      <h2 className="text-[17px] font-semibold text-heading">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden />
            <span className="text-[14px] text-foreground/85 leading-[1.65]">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ApplyForm({
  slug,
  title,
  onDone,
}: {
  slug: string;
  title: string;
  onDone: (reference: string) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    coverLetter: "",
    portfolioUrl: "",
  });
  const [cv, setCv] = useState<string | null>(null);
  const [cvName, setCvName] = useState("");
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError("");
    if (!file) {
      setCv(null);
      setCvName("");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFileError("Ukuran berkas melebihi 8 MB. Kompres dulu sebelum mengunggah.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCv(String(reader.result));
      setCvName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<{ reference: string } | null>("/api/v1/public/candidates", {
        vacancySlug: slug,
        ...form,
        cv: cv ?? undefined,
      });
      // A repeat application returns the same neutral message with no payload,
      // so the reference falls back to a dash rather than rendering "undefined".
      onDone(res.data?.reference ?? "—");
    } catch (err) {
      toast.error("Lamaran gagal terkirim", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-[22px] text-heading">Lamar posisi ini</h2>
      <p className="mt-2.5 text-sm text-muted leading-relaxed">
        Isi data di bawah dan lampirkan CV Anda. Kami hanya memakai data ini untuk proses seleksi
        {title ? ` posisi ${title}` : ""}.
      </p>

      <form onSubmit={submit} className="mt-7 card p-6 space-y-5">
        <Field label="Nama lengkap" required htmlFor="ap-name">
          <Input
            id="ap-name"
            required
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email" required htmlFor="ap-email">
            <Input
              id="ap-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nama@email.com"
            />
          </Field>
          <Field label="Nomor WhatsApp" required htmlFor="ap-phone">
            <Input
              id="ap-phone"
              required
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
            />
          </Field>
        </div>

        <Field
          label="CV"
          htmlFor="ap-cv"
          error={fileError}
          hint="Format PDF, JPG, atau PNG. Maksimal 8 MB."
        >
          <input
            id="ap-cv"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={onFile}
            className="w-full text-[13px] text-muted file:mr-3 file:rounded-[var(--radius-control)] file:border-0 file:bg-surface-2 file:px-4 file:py-2.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-surface-hover file:cursor-pointer cursor-pointer"
          />
          {cvName && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
              <Paperclip className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
              {cvName}
            </p>
          )}
        </Field>

        <Field
          label="Tautan portofolio"
          htmlFor="ap-portfolio"
          hint="Opsional. LinkedIn, GitHub, Behance, atau situs pribadi."
        >
          <Input
            id="ap-portfolio"
            type="url"
            value={form.portfolioUrl}
            onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
            placeholder="https://"
          />
        </Field>

        <Field
          label="Surat lamaran"
          htmlFor="ap-cover"
          hint="Opsional. Ceritakan singkat kenapa posisi ini cocok dengan pengalaman Anda."
        >
          <Textarea
            id="ap-cover"
            maxLength={3000}
            value={form.coverLetter}
            onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
          />
        </Field>

        <Alert tone="info">
          Dengan mengirim lamaran, Anda menyetujui data di atas disimpan dan diproses untuk keperluan
          rekrutmen. Data pelamar yang tidak lolos tetap kami simpan sebagai riwayat agar Anda tidak
          perlu mengisi ulang bila melamar lagi.
        </Alert>

        <Button type="submit" size="lg" icon={Send} loading={saving} className="w-full justify-center">
          Kirim lamaran
        </Button>
      </form>
    </div>
  );
}
