import { NextResponse } from "next/server";

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: ApiMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function apiSuccess<T>(
  data: T,
  message?: string,
  meta?: ApiMeta,
  status: number = 200
) {
  const body: ApiResponse<T> = { success: true, data, message };
  if (meta) {
    body.meta = {
      ...meta,
      totalPages:
        meta.total !== undefined && meta.limit
          ? Math.max(1, Math.ceil(meta.total / meta.limit))
          : meta.totalPages,
    };
  }
  return NextResponse.json(body, { status });
}

export function apiError(
  code: string,
  message: string,
  details?: unknown,
  status: number = 400
) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: { code, message, details } },
    { status }
  );
}

/** Anything carrying an HTTP status we are willing to surface to the client. */
interface StatusCarrier {
  status?: number;
  /** Mongo driver errors use a numeric `code` (11000 = duplicate key). */
  code?: string | number;
  message?: string;
  details?: unknown;
  name?: string;
  keyValue?: Record<string, unknown>;
}

/**
 * Route context shape. Next.js passes `{ params: Promise<…> }` for dynamic
 * segments and nothing at all for static ones.
 */
export type RouteContext<P = Record<string, string>> = { params: Promise<P> };

/**
 * Wraps a route handler so every route shares one error contract.
 *
 * Errors raised deliberately (`HttpError` from `lib/guard`, Mongo duplicate
 * keys, validation) keep their status and message. Anything unexpected is
 * logged server-side and returned as a generic 500 — internal stack traces and
 * driver messages must never reach the browser.
 */
export function wrapRouteHandler<C = RouteContext>(
  handler: (req: Request, context: C) => Promise<NextResponse | Response>
) {
  return async (req: Request, context: C) => {
    try {
      return await handler(req, context);
    } catch (raw) {
      const err = raw as StatusCarrier;

      // Deliberate HttpError from the guard helpers.
      if (err?.name === "HttpError" && typeof err.status === "number") {
        return apiError(err.code as string, err.message as string, err.details, err.status);
      }

      // Mongo duplicate key -> a real user-facing conflict, not a server fault.
      if (err?.code === 11000) {
        const field = Object.keys(err.keyValue ?? {})[0] ?? "data";
        return apiError(
          "DUPLICATE",
          `Nilai untuk "${field}" sudah digunakan. Gunakan nilai lain.`,
          null,
          409
        );
      }

      // Mongoose validation.
      if (err?.name === "ValidationError") {
        return apiError("VALIDATION_ERROR", "Data tidak lolos validasi skema.", null, 400);
      }

      // Mongoose cast (bad ObjectId in a param).
      if (err?.name === "CastError") {
        return apiError("BAD_REQUEST", "Identitas data yang diminta tidak valid.", null, 400);
      }

      // Database unreachable. Mongoose surfaces this in several shapes: a named
      // selection/network error, or — when the Atlas SRV record cannot be
      // resolved at all — a bare DNS error whose only marker is the syscall.
      const dbUnreachable =
        err?.name === "MongooseServerSelectionError" ||
        err?.name === "MongoNetworkError" ||
        err?.name === "MongoServerSelectionError" ||
        (err as { syscall?: string }).syscall === "querySrv" ||
        (typeof err?.code === "string" &&
          ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT"].includes(err.code));

      if (dbUnreachable) {
        console.error("[API ERROR] database unreachable:", err.message);
        return apiError(
          "DB_UNAVAILABLE",
          "Server basis data sedang tidak dapat dihubungi, sehingga data tidak dapat dimuat. " +
            "Coba lagi beberapa saat lagi, atau hubungi administrator bila terus berulang.",
          null,
          503
        );
      }

      console.error("[API ERROR]", err?.message, raw);
      return apiError(
        "INTERNAL_SERVER_ERROR",
        "Terjadi kesalahan internal pada server. Tim teknis telah dicatat kejadiannya.",
        null,
        500
      );
    }
  };
}
