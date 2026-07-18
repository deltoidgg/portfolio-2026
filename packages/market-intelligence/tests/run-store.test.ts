import { describe, expect, test } from "vite-plus/test";
import {
  createMarketXpForecastRunner,
  createMemoryForecastRunStore,
  type ForecastRunRequest,
} from "market-intelligence";

const request: ForecastRunRequest = {
  runId: "run:test",
  datasetKey: "live",
  season: {
    key: "epl:2026-27",
    label: "2026/27",
    lifecycle: "prelaunch",
    priceState: "unpublished",
    rulesetKey: "fpl:2026-27:provisional-v1",
    rulesetStatus: "provisional",
  },
  fromGameweek: 1,
  horizon: 1,
  cutoffAt: "2026-08-20T12:00:00.000Z",
  modelKey: "market-xp",
  modelVersion: "2.0.0",
  codeVersion: "test-sha",
  inputBatches: [{ id: "fpl:1", role: "priors", capturedAt: "2026-08-20T10:00:00.000Z" }],
  fixtures: [],
  players: [
    {
      registrationKey: "registration:saka",
      playerKey: "person:saka",
      name: "Bukayo Saka",
      team: "ARS",
      position: "MID",
      registrationStatus: "active",
      price: { status: "unpublished" },
      ownership: { status: "unavailable" },
      playProbability: 0.95,
      sixtyMinuteProbability: 0.9,
      goalsPer90: 0.4,
      assistsPer90: 0.3,
      sourceAgreement: 0.8,
    },
  ],
};

describe("forecast run store", () => {
  test("is idempotent for the same immutable run and rejects run-id reuse", async () => {
    const store = createMemoryForecastRunStore();
    const runner = createMarketXpForecastRunner();
    const artifact = runner.runArtifact(request);

    await expect(store.save(artifact)).resolves.toEqual({ inserted: true, runId: "run:test" });
    await expect(store.save(artifact)).resolves.toEqual({ inserted: false, runId: "run:test" });
    await expect(
      store.save(runner.runArtifact({ ...request, codeVersion: "different-sha" })),
    ).rejects.toThrow(/immutable/);
    expect((await store.read("run:test"))?.snapshot.key).toBe("run:test");
  });
});
