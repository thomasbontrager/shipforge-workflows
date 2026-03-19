import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getRequestId,
  jsonWithRequestId,
  logError,
  logInfo,
} from "@/lib/observability";

export const runtime = "nodejs";

const DB_TIMEOUT_MS = 2000;
const FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 30000;

let consecutiveFailures = 0;
let circuitOpenedAt = 0;

function isCircuitOpen(now: number) {
  return circuitOpenedAt > 0 && now - circuitOpenedAt < CIRCUIT_OPEN_MS;
}

async function checkDatabaseWithTimeout() {
  await Promise.race([
    prisma.$queryRaw`SELECT 1`,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Database health check timed out"));
      }, DB_TIMEOUT_MS);
    }),
  ]);
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  const now = Date.now();

  if (isCircuitOpen(now)) {
    return jsonWithRequestId(
      {
        status: "degraded",
        checks: {
          database: "circuit-open",
        },
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      },
      503,
      requestId
    );
  }

  try {
    await checkDatabaseWithTimeout();
    consecutiveFailures = 0;
    circuitOpenedAt = 0;

    logInfo("health.ok", { requestId, responseTimeMs: Date.now() - startedAt });

    return jsonWithRequestId(
      {
        status: "ok",
        checks: {
          database: "ok",
        },
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      },
      200,
      requestId
    );
  } catch (error) {
    consecutiveFailures += 1;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      circuitOpenedAt = Date.now();
    }

    logError("health.db_error", {
      requestId,
      consecutiveFailures,
      circuitOpened: isCircuitOpen(Date.now()),
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonWithRequestId(
      {
        status: "degraded",
        checks: {
          database: "error",
        },
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      },
      503,
      requestId
    );
  }
}
