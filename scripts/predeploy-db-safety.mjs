import { spawn } from "node:child_process";

const backupConfirmed = process.env.BACKUP_CONFIRMED === "true";
const allowBypass = process.env.ALLOW_NO_BACKUP_CONFIRMATION === "true";

if (!backupConfirmed && !allowBypass) {
  console.error("[db:safety-check] BACKUP_CONFIRMED=true is required before deploy.");
  console.error("[db:safety-check] Set ALLOW_NO_BACKUP_CONFIRMATION=true only for non-production scenarios.");
  process.exit(1);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
      }
    });
  });
}

try {
  await run("npx", ["prisma", "migrate", "status", "--schema", "prisma/schema.prisma"]);
  console.log("[db:safety-check] Prisma migration status check passed.");
} catch (error) {
  console.error(`[db:safety-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
