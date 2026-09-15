import { auth } from "@/auth";
import { storageProvider, LocalProvider, toStorageKey } from "@/lib/storage";
import { logActivity } from "@/lib/audit/logger";
import { clientIp } from "@/lib/rate-limit";

/**
 * The single door to every stored file.
 *
 * Two independent checks must both pass:
 *  1. A valid session (or a valid HMAC signature for a short-lived share link).
 *  2. Ownership — a STAFF account may only read files that live under its own
 *     employee folder. Anything else requires an HR/admin role.
 *
 * Files no longer sit in `public/`, so this route is the *only* way to read
 * them; there is no static fallback that bypasses these checks.
 */

/** Folders whose second path segment is the owning employee id. */
const EMPLOYEE_SCOPED_PREFIXES = [
  "attendances/",
  "payrolls/",
  "employees/",
  "leaves/",
  "corrections/",
  "inventory-bast/",
  "complaints/",
];

const PRIVILEGED_ROLES = ["SUPERADMIN", "HRD", "AUDIT", "DIREKSI", "GA", "SPV"];

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: { code: "STORAGE", message } }, { status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawKey = url.searchParams.get("key") ?? url.searchParams.get("path");
  const expires = url.searchParams.get("expires");
  const sig = url.searchParams.get("sig");
  const download = url.searchParams.get("download") === "1";

  if (!rawKey) return jsonError("Parameter berkas tidak lengkap.", 400);

  const key = toStorageKey(rawKey);
  if (!key || key.includes("..")) return jsonError("Jalur berkas tidak valid.", 400);

  // --- Gate 1: signature or session -------------------------------------
  let signatureValid = false;
  if (expires && sig && storageProvider instanceof LocalProvider) {
    signatureValid = storageProvider.verifySignature(key, Number(expires), sig);
    if (!signatureValid) {
      return jsonError("Tautan berkas tidak sah atau sudah kedaluwarsa.", 403);
    }
  }

  const session = await auth();
  if (!signatureValid && !session?.user) {
    return jsonError("Anda harus login untuk membuka berkas ini.", 401);
  }

  // --- Gate 2: ownership -------------------------------------------------
  // A signature alone is enough for a deliberately shared link; otherwise the
  // session must own the file or hold a privileged role.
  if (!signatureValid && session?.user) {
    const role = session.user.role;
    const isPrivileged = PRIVILEGED_ROLES.includes(role);
    const scopedPrefix = EMPLOYEE_SCOPED_PREFIXES.find((p) => key.startsWith(p));

    if (!isPrivileged) {
      if (!scopedPrefix) {
        return jsonError("Anda tidak memiliki akses ke berkas ini.", 403);
      }
      const ownerId = key.slice(scopedPrefix.length).split("/")[0];
      if (!session.user.employeeId || ownerId !== session.user.employeeId) {
        return jsonError("Berkas ini bukan milik akun Anda.", 403);
      }
    }
  }

  // --- Serve -------------------------------------------------------------
  let file: { buffer: Buffer; contentType: string };
  try {
    file = await storageProvider.read(key);
  } catch {
    return jsonError("Berkas tidak ditemukan.", 404);
  }

  // Sensitive documents are audited on every read, as the spec requires.
  if (session?.user && (key.startsWith("payrolls/") || key.startsWith("employees/"))) {
    void logActivity({
      userId: session.user.id,
      action: "VIEW_SECURE_FILE",
      module: key.split("/")[0],
      after: { key },
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent") ?? "",
    });
  }

  const filename = key.split("/").pop() || "berkas";
  // HTML is served as a download rather than inline so a stored document can
  // never execute script against this origin.
  const isHtml = file.contentType.startsWith("text/html");
  const disposition = download || isHtml ? "attachment" : "inline";

  return new Response(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": isHtml ? "application/octet-stream" : file.contentType,
      "Content-Disposition": `${disposition}; filename="${filename.replace(/"/g, "")}"`,
      "Content-Length": String(file.buffer.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
