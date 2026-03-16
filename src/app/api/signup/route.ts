import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

/** Allow at most 10 signup attempts per IP per 15-minute window. */
const RATE_LIMIT_OPTIONS = { maxRequests: 10, windowMs: 15 * 60 * 1000 };

export async function POST(req: NextRequest) {
  // Rate limiting — use the forwarded IP or fall back to a placeholder.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = rateLimit(ip, RATE_LIMIT_OPTIONS);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email: rawEmail, password } = body;

  if (!rawEmail || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  // Normalize the email address to prevent duplicate accounts caused by
  // differences in case or leading/trailing whitespace (e.g. "User@Example.com"
  // vs "user@example.com").
  const email = rawEmail.trim().toLowerCase();

  // Basic email format validation.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name: name?.trim() ?? null, email, password: hashedPassword },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
