import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  getRequestId,
  jsonWithRequestTiming,
  logError,
  logInfo,
} from "@/lib/observability";

export const runtime = "nodejs";

/** Allow at most 10 signup attempts per IP per 15-minute window. */
const RATE_LIMIT_OPTIONS = { maxRequests: 10, windowMs: 15 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  const responseTime = () => Date.now() - startedAt;

  // Rate limiting — use the forwarded IP or fall back to a placeholder.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = rateLimit(ip, RATE_LIMIT_OPTIONS);
  if (!rl.success) {
    logInfo("signup.rate_limited", { requestId, ip, resetAt: rl.resetAt });
    return jsonWithRequestTiming(
      { error: "Too many requests. Please try again later." },
      429,
      requestId,
      responseTime(),
      {
        "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
      }
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonWithRequestTiming(
      { error: "Invalid request body." },
      400,
      requestId,
      responseTime()
    );
  }

  const { name, email: rawEmail, password } = body;

  if (!rawEmail || !password) {
    return jsonWithRequestTiming(
      { error: "Email and password are required." },
      400,
      requestId,
      responseTime()
    );
  }

  // Normalize the email address to prevent duplicate accounts caused by
  // differences in case or leading/trailing whitespace (e.g. "User@Example.com"
  // vs "user@example.com").
  const email = rawEmail.trim().toLowerCase();

  // Basic email format validation.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonWithRequestTiming(
      { error: "Please provide a valid email address." },
      400,
      requestId,
      responseTime()
    );
  }

  if (password.length < 8) {
    return jsonWithRequestTiming(
      { error: "Password must be at least 8 characters." },
      400,
      requestId,
      responseTime()
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      logInfo("signup.duplicate_email", { requestId, email, ip });
      return jsonWithRequestTiming(
        { error: "An account with this email already exists." },
        409,
        requestId,
        responseTime()
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name: name?.trim() ?? null, email, password: hashedPassword },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    logInfo("signup.created", { requestId, userId: user.id, email, ip });
    return jsonWithRequestTiming({ user }, 201, requestId, responseTime());
  } catch (error) {
    logError("signup.unhandled_error", {
      requestId,
      ip,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonWithRequestTiming(
      { error: "Internal server error." },
      500,
      requestId,
      responseTime()
    );
  }
}
