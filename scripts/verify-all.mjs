import { spawn } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...(options.env ?? {}) },
      shell: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
      }
    });
  });
}

async function waitForServer(url, timeoutMs = 120000, intervalMs = 2000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore connection errors until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

async function main() {
  console.log("[verify:all] Running lint...");
  await runCommand(npmCmd, ["run", "lint"]);

  console.log("[verify:all] Running build...");
  await runCommand(npmCmd, ["run", "build"]);

  console.log("[verify:all] Starting app for smoke tests...");
  const devServer = spawn(npmCmd, ["run", "dev", "--", "--port", "3100"], {
    stdio: "inherit",
    env: { ...process.env },
    shell: true,
  });

  try {
    await waitForServer(`${baseUrl}/login`);

    console.log("[verify:all] Running smoke tests...");
    await runCommand(npmCmd, ["run", "smoke:test"], {
      env: { SMOKE_BASE_URL: baseUrl },
    });
  } finally {
    if (!devServer.killed) {
      devServer.kill("SIGTERM");
    }
  }

  if (process.env.VERIFY_SKIP_BRANCH_PROTECTION === "true") {
    console.log("[verify:all] Skipping branch protection check (VERIFY_SKIP_BRANCH_PROTECTION=true).");
    return;
  }

  console.log("[verify:all] Running branch protection check...");
  await runCommand(npmCmd, ["run", "branch-protection:check"]);

  console.log("[verify:all] All checks passed.");
}

main().catch((error) => {
  console.error(`[verify:all] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
