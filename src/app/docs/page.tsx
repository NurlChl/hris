"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Filter,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Alert, Badge, Input, Select, cn } from "@/components/ui";
import { ALL_SECTIONS, CHAPTERS, ROLE_LABELS, type DocBlock, type DocSection } from "./content";

/**
 * Full system documentation.
 *
 * Public on purpose: a new employee needs to read "how do I clock in" before
 * they have working credentials, and support staff need to link to a specific
 * section. Nothing here exposes data — only how the system behaves.
 */
export default function DocsPage() {
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const sessionRole = session?.user?.role;

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [navOpen, setNavOpen] = useState(false);
  const [activeId, setActiveId] = useState("");

  // Default the filter to the reader's own role so a new employee is not shown
  // administrator procedures they cannot act on.
  useEffect(() => {
    if (sessionRole) setRoleFilter(sessionRole);
  }, [sessionRole]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_SECTIONS.filter((s) => {
      const roleOk =
        roleFilter === "all" || s.audience.length === 0 || s.audience.includes(roleFilter);
      if (!roleOk) return false;
      if (!q) return true;
      const haystack = [
        s.title,
        s.summary,
        ...s.blocks.flatMap(blockText),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, roleFilter]);

  const visibleIds = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);

  const chapters = useMemo(
    () =>
      CHAPTERS.map((c) => ({
        ...c,
        sections: c.sections.filter((s) => visibleIds.has(s.id)),
      })).filter((c) => c.sections.length > 0),
    [visibleIds]
  );

  // Highlights the section currently in view in the sidebar.
  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>("[data-doc-section]"));
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [chapters]);

  const nav = (
    <nav className="space-y-5">
      {chapters.map((c) => (
        <div key={c.id}>
          <p className="eyebrow px-2 mb-1.5">
            {c.title}
          </p>
          <ul className="space-y-0.5">
            {c.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setNavOpen(false)}
                  className={cn(
                    "block px-2 py-1.5 rounded-lg text-label leading-snug transition-colors",
                    activeId === s.id
                      ? "bg-primary-soft text-primary font-semibold"
                      : "text-muted hover:text-foreground hover:bg-surface-2"
                  )}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-16 border-b border-line bg-surface sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Buka daftar isi"
              className="lg:hidden p-2 rounded-lg text-muted hover:bg-surface-2 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-semibold text-label shrink-0">
                HR
              </span>
              <span className="min-w-0">
                <span className="block text-body font-semibold truncate">Dokumentasi HRIS</span>
                <span className="hidden sm:block text-caption text-subtle">
                  Panduan penggunaan &amp; acuan teknis
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Mode terang" : "Mode gelap"}
              className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href={sessionRole ? "/portal/attendance" : "/auth/login"}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-label font-semibold text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {sessionRole ? "Kembali ke aplikasi" : "Masuk"}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <DocFilters
              query={query}
              setQuery={setQuery}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
            />
            {nav}
          </div>
        </aside>

        {/* Mobile nav drawer */}
        {navOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            style={{ background: "var(--overlay)" }}
            onClick={() => setNavOpen(false)}
          >
            <div
              className="w-80 max-w-[85vw] h-full bg-surface border-r border-line p-4 overflow-y-auto animate-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-body font-semibold">Daftar isi</span>
                <button
                  onClick={() => setNavOpen(false)}
                  aria-label="Tutup"
                  className="p-1.5 rounded-lg text-muted hover:bg-surface-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <DocFilters
                  query={query}
                  setQuery={setQuery}
                  roleFilter={roleFilter}
                  setRoleFilter={setRoleFilter}
                />
                {nav}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="min-w-0">
          <div className="mb-8">
            <h1 className="text-display-sm md:text-display text-heading">Panduan Penggunaan HRIS</h1>
            <p className="mt-2 text-body text-muted leading-relaxed max-w-2xl">
              Semua yang perlu Anda ketahui untuk memakai sistem ini, dari absen harian sampai
              mengatur aturan perusahaan. Gunakan penyaring peran di samping untuk menyembunyikan
              bagian yang tidak relevan dengan pekerjaan Anda.
            </p>
            {roleFilter !== "all" && (
              <p className="mt-3 text-label text-subtle">
                Menampilkan bagian untuk peran{" "}
                <strong className="text-foreground">{ROLE_LABELS[roleFilter] ?? roleFilter}</strong>{" "}
                dan bagian yang berlaku untuk semua orang.
              </p>
            )}
          </div>

          <div className="lg:hidden mb-6">
            <DocFilters
              query={query}
              setQuery={setQuery}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
            />
          </div>

          {chapters.length === 0 ? (
            <Alert tone="info" title="Tidak ada bagian yang cocok">
              Tidak ditemukan bagian dokumentasi untuk kata kunci &ldquo;{query}&rdquo;. Coba kata
              lain, atau ubah penyaring peran ke &ldquo;Semua peran&rdquo;.
            </Alert>
          ) : (
            <div className="space-y-14">
              {chapters.map((chapter) => (
                <section key={chapter.id}>
                  <h2 className="text-label font-semibold uppercase tracking-wider text-primary mb-5 pb-2 border-b border-line">
                    {chapter.title}
                  </h2>
                  <div className="space-y-10">
                    {chapter.sections.map((section) => (
                      <SectionView key={section.id} section={section} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <footer className="mt-16 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-3 text-caption text-subtle">
            <p>Dokumentasi ini menjelaskan perilaku sistem versi yang sedang berjalan.</p>
            <Link href="/api-docs" className="hover:text-foreground transition-colors">
              Referensi API →
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

function DocFilters({
  query,
  setQuery,
  roleFilter,
  setRoleFilter,
}: {
  query: string;
  setQuery: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari di dokumentasi…"
          aria-label="Cari di dokumentasi"
          className="pl-9 h-9 text-label"
        />
      </div>
      <div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Saring menurut peran"
          size="sm"
          icon={Filter}
        >
          <option value="all">Semua peran</option>
          {Object.entries(ROLE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function SectionView({ section }: { section: DocSection }) {
  return (
    <article>
      <h3
        id={section.id}
        data-doc-section
        className="scroll-mt-24 text-title-sm font-semibold tracking-tight flex flex-wrap items-center gap-2"
      >
        {section.title}
        {section.audience.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {section.audience.map((a) => (
              <Badge key={a} tone="neutral">
                {ROLE_LABELS[a] ?? a}
              </Badge>
            ))}
          </span>
        )}
      </h3>
      <p className="mt-1 text-label text-subtle">{section.summary}</p>

      <div className="mt-4 space-y-4">
        {section.blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>
    </article>
  );
}

function BlockView({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-body text-foreground/85 leading-relaxed max-w-3xl">{block.text}</p>;

    case "steps":
      return (
        <ol className="space-y-2.5 max-w-3xl">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid place-items-center w-5 h-5 rounded-full bg-primary-soft text-primary text-caption font-semibold shrink-0 mt-0.5 tabular-nums">
                {i + 1}
              </span>
              <span className="text-body text-foreground/85 leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      );

    case "list":
      return (
        <ul className="space-y-2 max-w-3xl">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-line-strong shrink-0" aria-hidden />
              <span className="text-body text-foreground/85 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );

    case "note":
      return (
        <Alert tone={block.tone} title={block.title} className="max-w-3xl">
          {block.text}
        </Alert>
      );

    case "table":
      return (
        <div className="overflow-x-auto max-w-3xl">
          <table className="w-full text-body border-collapse min-w-[520px] card">
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th
                    key={h}
                    className="text-left text-caption font-semibold uppercase tracking-wide text-subtle px-4 py-2.5 border-b border-line"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        "px-4 py-2.5 border-b border-line text-label leading-relaxed align-top",
                        j === 0 ? "font-semibold text-foreground" : "text-muted"
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "code":
      return (
        <pre className="max-w-3xl overflow-x-auto rounded-lg border border-line bg-surface-2 p-4 text-label leading-relaxed">
          <code className="font-mono">{block.text}</code>
        </pre>
      );

    default:
      return null;
  }
}

/** Flattens a block into searchable text. */
function blockText(block: DocBlock): string[] {
  switch (block.type) {
    case "p":
    case "code":
      return [block.text];
    case "note":
      return [block.title ?? "", block.text];
    case "steps":
    case "list":
      return block.items;
    case "table":
      return [...block.head, ...block.rows.flat()];
    default:
      return [];
  }
}
