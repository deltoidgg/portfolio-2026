import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

loadLocalEnvironment();
const connectionString = requiredEnvironment("DATABASE_URL");

const db = drizzle({ client: neon(connectionString) });
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

await migrate(db, { migrationsFolder });
console.log("Market intelligence migrations applied.");
