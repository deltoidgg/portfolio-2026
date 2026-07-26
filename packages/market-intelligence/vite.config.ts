import { defineConfig } from "vite-plus";

const runtimeEnvironment = [
  "DATABASE_URL",
  "THE_ODDS_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_BUCKET",
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "MI_*",
  "GITHUB_SHA",
  "VERCEL_GIT_COMMIT_SHA",
];

function runtimeTask(command: string) {
  return {
    command,
    untrackedEnv: runtimeEnvironment,
  };
}

export default defineConfig({
  run: {
    tasks: {
      "env:verify": runtimeTask("node src/neon/verify-runtime-env.ts"),
      "capture:fpl": runtimeTask("node src/neon/capture.ts fpl"),
      "capture:fpl-history": runtimeTask("node src/neon/capture-fpl-history.ts"),
      "capture:odds": runtimeTask("node src/neon/capture.ts odds-api"),
      "capture:deadline": runtimeTask("node src/neon/capture.ts deadline"),
      "capture:results": runtimeTask("node src/neon/results.ts"),
      "collector:tick": runtimeTask("node src/neon/collect.ts"),
      "forecast:baseline": runtimeTask("node src/neon/forecast.ts"),
      "forecast:v2": runtimeTask("node src/neon/forecast-v2.ts"),
      "forecast:auto": runtimeTask("node src/neon/forecast-auto.ts"),
      "snapshot:verify": runtimeTask("node src/neon/verify-published-snapshot.ts"),
      evaluate: runtimeTask("node src/neon/evaluate.ts"),
      "db:migrate": runtimeTask("node src/neon/migrate.ts"),
      "db:backfill": runtimeTask("node src/neon/backfill.ts"),
      "db:seed": runtimeTask("node src/neon/seed.ts"),
      "season:sync": runtimeTask("node src/neon/sync-season.ts"),
    },
  },
});
