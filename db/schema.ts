export const CREATE_DAILY_VISITS_TABLE = `
  CREATE TABLE IF NOT EXISTS daily_visits (
    day TEXT NOT NULL,
    country_code TEXT NOT NULL,
    visit_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT daily_visits_day_country_pk PRIMARY KEY (day, country_code),
    CONSTRAINT daily_visits_country_code_check CHECK (length(country_code) = 2),
    CONSTRAINT daily_visits_count_check CHECK (visit_count >= 0)
  )
`;
