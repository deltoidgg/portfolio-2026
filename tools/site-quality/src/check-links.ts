export {};

const urls = [
  "https://wasimarif.com",
  "https://wasimarif.com/projects",
  "https://research.wasimarif.com",
  "https://research.wasimarif.com/papers/design-systems-accessibility",
  "https://openfgc.wasimarif.com",
  "https://rewriter.wasimarif.com",
  "https://mockpit.wasimarif.com",
  "https://github.com/deltoidgg/portfolio-2026",
  "https://github.com/deltoidgg/mockpit",
  "https://www.npmjs.com/org/mockpit",
] as const;

const failures: string[] = [];

await Promise.all(
  urls.map(async (url) => {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "portfolio-link-check/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 404 || response.status === 410 || response.status >= 500) {
        failures.push(`${url} returned ${response.status}`);
      }
    } catch (cause) {
      failures.push(`${url}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }),
);

if (failures.length > 0) {
  throw new Error(`Broken or unavailable portfolio links:\n${failures.join("\n")}`);
}

console.log(`Link check passed for ${urls.length} public URLs.`);
