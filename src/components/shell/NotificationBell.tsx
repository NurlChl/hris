"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatRelative } from "@/lib/time";
import { cn, EmptyState, ICON_STROKE } from "@/components/ui";

interface NotificationItem {
  _id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * In-app notification feed.
 *
 * Polls rather than holding an SSE stream: a 60-second interval is well within
 * what approval turnaround needs, and it survives serverless hosting where a
 * long-lived connection would be dropped.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: NotificationItem[]; unreadCount: number }>(
        "/api/v1/notifications?limit=15"
      );
      setItems(res.data?.items ?? []);
      setUnread(res.data?.unreadCount ?? 0);
    } catch {
      // A failed poll is not worth interrupting the user for.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAll = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnread(0);
    await api.post("/api/v1/notifications", { all: true }).catch(() => void load());
  };

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((i) => (i._id === id ? { ...i, isRead: true } : i)));
    setUnread((u) => Math.max(0, u - 1));
    await api.post("/api/v1/notifications", { ids: [id] }).catch(() => {});
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `${unread} notifikasi belum dibaca` : "Notifikasi"}
        aria-expanded={open}
        className="relative p-2 rounded-[var(--radius-control)] text-subtle hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
      >
        <Bell className="w-[18px] h-[18px]" strokeWidth={ICON_STROKE} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 grid place-items-center rounded-full bg-danger text-white text-[11px] font-semibold tabular-nums ring-2 ring-surface">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card absolute right-0 mt-2 w-[min(23rem,calc(100vw-2rem))] z-50 animate-fade-up overflow-hidden"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-line">
            <p className="text-sm font-semibold text-heading">
              Notifikasi
              {unread > 0 && <span className="text-subtle font-normal ml-1.5">({unread} baru)</span>}
            </p>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer shrink-0"
              >
                <CheckCheck className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
                Tandai dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted">
                <LoaderCircle className="w-5 h-5 animate-spin" strokeWidth={ICON_STROKE} />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Belum ada notifikasi"
                description="Pemberitahuan persetujuan, slip gaji, dan pengingat kontrak akan muncul di sini."
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {items.map((n) => {
                  const content = (
                    <div className="flex gap-3 px-4 py-3.5 hover:bg-surface-2/60 transition-colors">
                      <span
                        className={cn(
                          "mt-[7px] w-2 h-2 rounded-full shrink-0",
                          n.isRead ? "bg-transparent" : "bg-primary"
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[13px] leading-snug",
                            n.isRead ? "text-muted" : "text-foreground font-medium"
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-subtle mt-1 leading-relaxed line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-subtle mt-1.5">{formatRelative(n.createdAt)}</p>
                      </div>
                    </div>
                  );

                  return (
                    <li key={n._id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => {
                            void markOne(n._id);
                            setOpen(false);
                          }}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button onClick={() => void markOne(n._id)} className="block w-full text-left cursor-pointer">
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
