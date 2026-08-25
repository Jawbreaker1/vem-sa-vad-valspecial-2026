import { env } from 'cloudflare:workers';
import { CREATE_DAILY_VISITS_TABLE } from './schema';

const INCREMENT_DAILY_VISIT = `
  INSERT INTO daily_visits (day, country_code, visit_count, updated_at)
  VALUES (?1, ?2, 1, CURRENT_TIMESTAMP)
  ON CONFLICT(day, country_code) DO UPDATE SET
    visit_count = daily_visits.visit_count + 1,
    updated_at = CURRENT_TIMESTAMP
`;

let schemaReady: Promise<void> | null = null;

function ensureAnalyticsSchema(database: D1Database) {
  if (!schemaReady) {
    schemaReady = database
      .prepare(CREATE_DAILY_VISITS_TABLE)
      .run()
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }

  return schemaReady;
}

export async function recordDailyVisit(day: string, countryCode: string) {
  const database = env.DB;

  await ensureAnalyticsSchema(database);
  await database
    .prepare(INCREMENT_DAILY_VISIT)
    .bind(day, countryCode)
    .run();
}
