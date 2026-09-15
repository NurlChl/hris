import { buildOpenApiSpec } from "@/lib/openapi";

/**
 * Serves the OpenAPI document.
 *
 * Public: the specification describes the shape of the API, not its data, and
 * keeping it reachable lets integrators generate a client without credentials.
 */
export function GET() {
  return Response.json(buildOpenApiSpec(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
