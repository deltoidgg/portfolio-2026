import { loadLocalEnvironment } from "./load-env.ts";
import { runScheduledPipeline } from "./pipeline-runtime.ts";

loadLocalEnvironment();

const allowedModes = new Set(["auto", "force-collect", "finalise", "retention", "verify"]);
const requestedMode = process.argv[2] ?? process.env.MI_PIPELINE_MODE ?? "auto";
if (!allowedModes.has(requestedMode)) {
  throw new Error(`Unsupported pipeline mode ${requestedMode}`);
}
const channel = process.env.MI_ARTIFACT_CHANNEL ?? "next";
if (channel !== "next" && channel !== "production") {
  throw new Error("MI_ARTIFACT_CHANNEL must be next or production");
}
const now = process.env.MI_PIPELINE_AT ?? process.env.MI_COLLECT_AT ?? new Date().toISOString();
if (!Number.isFinite(Date.parse(now))) throw new Error("MI_PIPELINE_AT must be an ISO date-time");

const receipt = await runScheduledPipeline({
  mode: requestedMode as "auto" | "force-collect" | "finalise" | "retention" | "verify",
  now: new Date(now).toISOString(),
  channel,
  codeVersion: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
});
console.log(JSON.stringify(receipt));
