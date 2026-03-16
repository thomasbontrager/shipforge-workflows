import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/** Allow at most 5 contact form submissions per IP per hour. */
const RATE_LIMIT_OPTIONS = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

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

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  // TODO: Integrate with an email sending service (e.g. Resend, SendGrid).
  // For now we log the submission server-side and return a success response.
  console.log("Contact form submission received", {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    messageLength: message.trim().length,
  });

  return NextResponse.json(
    { message: "Your message has been received. We will be in touch soon." },
    { status: 200 }
  );
}
