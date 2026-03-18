import { NextRequest, NextResponse } from "next/server";

type LogLevel = "info" | "error";

type LogFields = Record<string, unknown>;

function emit(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}

export function getRequestId(req: NextRequest): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function jsonWithRequestId<T>(
  payload: T,
  status: number,
  requestId: string,
  headers?: HeadersInit
) {
  const responseHeaders: Record<string, string> = {
    "x-request-id": requestId,
  };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      responseHeaders[key] = value;
    }
  } else if (headers) {
    Object.assign(responseHeaders, headers);
  }

  return NextResponse.json(payload, {
    status,
    headers: responseHeaders,
  });
}

export function jsonWithRequestTiming<T>(
  payload: T,
  status: number,
  requestId: string,
  responseTimeMs: number,
  headers?: HeadersInit
) {
  const timingHeaders: Record<string, string> = {
    "x-response-time-ms": String(responseTimeMs),
  };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      timingHeaders[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      timingHeaders[key] = value;
    }
  } else if (headers) {
    Object.assign(timingHeaders, headers);
  }

  return jsonWithRequestId(payload, status, requestId, timingHeaders);
}

export function logInfo(event: string, fields: LogFields = {}) {
  emit("info", event, fields);
}

export function logError(event: string, fields: LogFields = {}) {
  emit("error", event, fields);
}
