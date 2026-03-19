const mode = process.env.CHECK_ENV_MODE ?? "development";

const requiredByMode = {
  production: ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"],
  ci: ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"],
  development: [],
};

const required = requiredByMode[mode] ?? requiredByMode.development;

function isPlaceholder(value) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "replace-with-a-long-random-secret" ||
    normalized === "changeme" ||
    normalized === "your-secret"
  );
}

const missing = [];
for (const key of required) {
  const value = process.env[key];
  if (!value || !value.trim()) {
    missing.push(`${key} is missing`);
    continue;
  }

  if (key === "NEXTAUTH_SECRET" && isPlaceholder(value)) {
    missing.push(`${key} is using a placeholder value`);
  }
}

if (missing.length > 0) {
  console.error(`[env:check] mode=${mode}`);
  for (const problem of missing) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(`[env:check] mode=${mode} passed.`);
