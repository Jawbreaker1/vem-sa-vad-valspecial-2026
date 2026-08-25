CREATE TABLE `daily_visits` (
	`day` text NOT NULL,
	`country_code` text NOT NULL,
	`visit_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`day`, `country_code`),
	CONSTRAINT "daily_visits_country_code_check" CHECK(length("daily_visits"."country_code") = 2),
	CONSTRAINT "daily_visits_count_check" CHECK("daily_visits"."visit_count" >= 0)
);
