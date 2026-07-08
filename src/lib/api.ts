import { NextResponse } from "next/server";
import { logActivity } from "./audit/logger";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export function apiSuccess<T>(
  data: T,
  message?: string,
  meta?: ApiResponse["meta"],
  status: number = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta,
    },
    { status }
  );
}

export function apiError(
  code: string,
  message: string,
  details?: any,
  status: number = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

/**
 * High-order API route wrapper that provides:
 * 1. Database connection verification
 * 2. Error handling fallback
 * 3. Consistent response types
 */
export function wrapRouteHandler(
  handler: (req: Request, context?: any) => Promise<NextResponse>
) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (err: any) {
      console.error(`[API ERROR] in handler:`, err);
      
      const status = err.status || 500;
      const code = err.code || "INTERNAL_SERVER_ERROR";
      const message = err.message || "Terjadi kesalahan internal pada server";
      
      return apiError(code, message, err.details || null, status);
    }
  };
}
