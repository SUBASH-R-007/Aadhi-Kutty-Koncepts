import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";
import path from "path";

/**
 * No-Docker development database: runs real PostgreSQL binaries locally.
 * Usage: npm run db:local   (keeps running; Ctrl+C to stop)
 * Matches the docker-compose defaults: aadhi:aadhi@localhost:5433/aadhi_studio
 */
const dataDir = path.resolve(".pgdata");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "aadhi",
    password: "aadhi",
    port: 5433,
    persistent: true,
  });

  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log("Initializing PostgreSQL data directory…");
    await pg.initialise();
  }
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = 'aadhi_studio'");
  if (exists.rowCount === 0) {
    await client.query('CREATE DATABASE "aadhi_studio"');
    console.log("Created database aadhi_studio");
  }
  await client.end();
  console.log("PostgreSQL ready: postgresql://aadhi:aadhi@localhost:5433/aadhi_studio");
  console.log("Press Ctrl+C to stop.");

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
