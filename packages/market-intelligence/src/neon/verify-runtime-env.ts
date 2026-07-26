import { requiredEnvironment } from "./load-env.ts";

const requiredRuntimeEnvironment = [
  "DATABASE_URL",
  "THE_ODDS_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

for (const name of requiredRuntimeEnvironment) requiredEnvironment(name);

console.log(
  `Vite+ passed ${requiredRuntimeEnvironment.length} required collector variables to the task process.`,
);
