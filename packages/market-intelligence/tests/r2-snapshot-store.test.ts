import { gunzipSync } from "node:zlib";
import { describe, expect, test } from "vite-plus/test";
import { createR2SnapshotStore } from "market-intelligence/neon";

describe("R2 snapshot store", () => {
  test("writes deterministic gzip objects without credentials in the key or body", async () => {
    const commands: Array<{ input?: Record<string, unknown> }> = [];
    const store = createR2SnapshotStore({
      bucket: "fpl-raw",
      client: {
        async send(command) {
          commands.push(command as { input?: Record<string, unknown> });
          return {};
        },
      },
    });

    const stored = await store.put({
      sourceKey: "odds-api",
      endpoint: "https://api.example.test/odds?apiKey=secret-value",
      observedAt: "2026-08-21T12:15:00.000Z",
      payload: { prices: [1.9, 3.5, 4.2] },
      statusCode: 200,
    });

    expect(stored.objectKey).toMatch(/^raw\/odds-api\/2026\/08\/21\/[a-f0-9]{64}\.json\.gz$/);
    expect(stored.encoding).toBe("gzip");
    expect(commands).toHaveLength(1);
    const input = commands[0]?.input;
    expect(input?.Bucket).toBe("fpl-raw");
    expect(String(input?.Key)).not.toContain("secret-value");
    expect(gunzipSync(input?.Body as Uint8Array).toString("utf8")).toBe(
      JSON.stringify({ prices: [1.9, 3.5, 4.2] }),
    );
  });

  test("treats an existing content-addressed object as a successful deduplicated write", async () => {
    const store = createR2SnapshotStore({
      bucket: "fpl-raw",
      client: {
        async send() {
          throw Object.assign(new Error("already exists"), {
            name: "PreconditionFailed",
            $metadata: { httpStatusCode: 412 },
          });
        },
      },
    });

    await expect(
      store.put({
        sourceKey: "fpl",
        endpoint: "https://fantasy.premierleague.com/api/fixtures/",
        observedAt: "2026-08-21T12:15:00.000Z",
        payload: { fixtures: [] },
      }),
    ).resolves.toEqual(expect.objectContaining({ encoding: "gzip" }));
  });
});
