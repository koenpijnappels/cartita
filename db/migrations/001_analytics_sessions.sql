-- Aggregate, privacy-conscious product metrics, one row per (visitor, session).
-- No accounts, no PII, no card/translation text — only anonymous IDs, counts,
-- and the selected level/mode. Upserted by id = "visitorId:sessionId".

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id                         TEXT PRIMARY KEY,
  visitor_id                 TEXT NOT NULL,
  session_id                 TEXT NOT NULL,
  first_seen_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cards_viewed               INTEGER NOT NULL DEFAULT 0,
  feedback_prompt_shown      BOOLEAN NOT NULL DEFAULT FALSE,
  feedback_prompt_shown_at   TIMESTAMPTZ,
  feedback_prompt_card_count INTEGER,
  last_level                 TEXT,
  last_mode                  TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id
  ON analytics_sessions (visitor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_first_seen_at
  ON analytics_sessions (first_seen_at);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_feedback_prompt_shown
  ON analytics_sessions (feedback_prompt_shown);
