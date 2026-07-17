import { existsSync } from "node:fs";

export function loadLocalEnvironment() {
  for (const candidate of [".env.local", ".env", "../../.env.local", "../../.env"]) {
    if (existsSync(candidate)) process.loadEnvFile(candidate);
  }
}

export function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
