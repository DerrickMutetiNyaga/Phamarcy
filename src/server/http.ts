import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type z } from "zod";
import { connectDB } from "@/lib/db";
import type { Role } from "@/lib/auth/roles";
import { getSessionUser, type SessionUser } from "./auth";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(status: number, message: string): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}

function describeZodError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const [first, second] = issue.path;
  if (first === "items" && typeof second === "number") return `Line ${second + 1}: ${issue.message}`;
  return issue.message;
}

function duplicateKeyMessage(error: { keyValue?: Record<string, unknown> }): string {
  const field = Object.keys(error.keyValue ?? {})[0];
  const labels: Record<string, string> = {
    email: "email",
    phone: "phone number",
    barcode: "barcode",
    name: "name",
    batchNo: "batch number",
    invoiceNo: "invoice number",
  };
  return `A record with this ${labels[field ?? ""] ?? field ?? "value"} already exists.`;
}

export function toErrorResponse(error: unknown): NextResponse<{ error: string }> {
  if (error instanceof ApiError) return errorResponse(error.status, error.message);
  if (error instanceof ZodError) return errorResponse(400, describeZodError(error));
  if (error instanceof mongoose.Error.CastError) return errorResponse(400, "Invalid identifier.");
  if (error instanceof mongoose.Error.ValidationError) {
    const first = Object.values(error.errors)[0];
    return errorResponse(400, first?.message ?? "Invalid data.");
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    return errorResponse(409, duplicateKeyMessage(error as { keyValue?: Record<string, unknown> }));
  }
  console.error("[api] Unhandled error", error);
  return errorResponse(500, "Something went wrong. Please try again.");
}

export async function readJson<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

interface HandlerArgs<P> {
  req: NextRequest;
  params: P;
  user: SessionUser;
}

/** Wraps a route handler with DB connection, session + role enforcement and consistent error responses. */
export function apiRoute<P extends Record<string, string> = Record<string, string>>(
  roles: readonly Role[],
  handler: (args: HandlerArgs<P>) => Promise<Response>
) {
  return async (req: NextRequest, context: { params: Promise<P> }): Promise<Response> => {
    try {
      await connectDB();
      const user = await getSessionUser();
      if (!user) return errorResponse(401, "Your session has expired. Please sign in again.");
      if (!roles.includes(user.role)) return errorResponse(403, "You do not have permission to perform this action.");
      const params = await context.params;
      return await handler({ req, params, user });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function ok<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}
