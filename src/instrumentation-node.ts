import { getMissingServerEnv, missingEnvMessage } from "./lib/env";

export function assertServerEnv(): void {
  const missing = getMissingServerEnv();
  if (missing.length === 0) return;
  console.error(`\n[pharmacy] ${missingEnvMessage(missing)}\n`);
  process.exit(1);
}
