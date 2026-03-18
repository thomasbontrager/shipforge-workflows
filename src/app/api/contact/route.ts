import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  getRequestId,
  jsonWithRequestTiming,
  logError,
  logInfo,
} from "@/lib/observability";

/** Allow at most 5 contact form submissions per IP per hour. */
const RATE_LIMIT_OPTIONS = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

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
    logInfo("contact.rate_limited", { requestId, ip, resetAt: rl.resetAt });
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

  let body: { name?: string; email?: string; message?: string };
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

  const { name, email, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return jsonWithRequestTiming(
      { error: "Name, email, and message are required." },
      400,
      requestId,
      responseTime()
    );
  }

  try {
    // Placeholder behavior: emit structured metadata only and avoid logging message content.
    logInfo("contact.received", {
      requestId,
      ip,
      nameLength: name.trim().length,
      email: email.trim().toLowerCase(),
      messageLength: message.trim().length,
    });

    return jsonWithRequestTiming(
      { message: "Your message has been received. We will be in touch soon." },
      200,
      requestId,
      responseTime()
    );
  } catch (error) {
    logError("contact.unhandled_error", {
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
