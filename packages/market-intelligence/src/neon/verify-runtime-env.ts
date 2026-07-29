import { requiredEnvironment } from "./load-env.ts";

const requiredRuntimeEnvironment = [
  "DATABASE_URL",
  "THE_ODDS_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_PRIVATE_BUCKET",
  "R2_PRIVATE_ACCESS_KEY_ID",
  "R2_PRIVATE_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BUCKET",
  "R2_PUBLIC_ACCESS_KEY_ID",
  "R2_PUBLIC_SECRET_ACCESS_KEY",
] as const;

for (const name of requiredRuntimeEnvironment) requiredEnvironment(name);

console.log(
  `Vite+ passed ${requiredRuntimeEnvironment.length} required collector variables to the task process.`,
);
