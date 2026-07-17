import { createPremierLeagueSeasonManifest } from "../season-schedule.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonSeasonCatalog } from "./operations.ts";
import { getCurrentSeasonConfig, getPremierLeagueFixturesUrl } from "./season-config.ts";

loadLocalEnvironment();
const currentSeasonConfig = getCurrentSeasonConfig();
const fixturesUrl = getPremierLeagueFixturesUrl();
const catalog = createNeonSeasonCatalog(requiredEnvironment("DATABASE_URL"));

try {
  const response = await fetch(fixturesUrl, {
    headers: { Accept: "text/html", "User-Agent": "fpl.wasimarif.com research collector" },
  });
  if (!response.ok) throw new Error(`Premier League fixture sync failed: ${response.status}`);
  const manifest = createPremierLeagueSeasonManifest({
    html: await response.text(),
    ...currentSeasonConfig,
  });
  if (manifest.teams.length !== 20 || manifest.fixtures.length !== 380) {
    throw new Error(
      `Fixture guard rejected ${manifest.teams.length} teams and ${manifest.fixtures.length} fixtures`,
    );
  }
  await catalog.importManifest(manifest);
  console.log(`Synced ${manifest.fixtures.length} fixtures for ${manifest.label}.`);
} finally {
  await catalog.close();
}
