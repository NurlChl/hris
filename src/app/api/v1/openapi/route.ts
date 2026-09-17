import { API_GROUPS, buildOpenApiSpec } from "@/lib/openapi";
import { auth } from "@/auth";

/**
 * Serves the OpenAPI document — to Superadmin only.
 *
 * It describes every endpoint, administration ones included, which is a map of
 * the system nobody outside needs. Integrators receive the file from the
 * Superadmin rather than from a public URL.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    return Response.json(
      { success: false, error: { code: "FORBIDDEN", message: "Referensi API hanya tersedia untuk Superadmin." } },
      { status: session?.user ? 403 : 401 }
    );
  }
  if (new URL(req.url).searchParams.get("format") === "groups") {
    return Response.json({ groups: API_GROUPS }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return Response.json(buildOpenApiSpec(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
