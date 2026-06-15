# Analytics queries

Useful SQL for the `analytics_sessions` table (one row per anonymous
`visitorId:sessionId`). Run these in the **Neon SQL Editor**.

The table stores only anonymous IDs, counts, the selected level/mode, and
whether the feedback prompt was shown — no card text, translations, names,
emails, or conversation content.

## Setup

Apply the schema once (idempotent):

```bash
npm run db:migrate
```

…or paste [`db/migrations/001_analytics_sessions.sql`](../db/migrations/001_analytics_sessions.sql)
into the Neon SQL Editor.

## Metric 1 — cards seen

### Average cards viewed per session

```sql
SELECT AVG(cards_viewed) AS avg_cards_viewed
FROM analytics_sessions;
```

### Average cards viewed per *visitor* (collapsing multiple sessions)

```sql
SELECT AVG(per_visitor) AS avg_cards_per_visitor
FROM (
  SELECT visitor_id, SUM(cards_viewed) AS per_visitor
  FROM analytics_sessions
  GROUP BY visitor_id
) v;
```

### Distribution of cards viewed

```sql
SELECT
  CASE
    WHEN cards_viewed < 5  THEN '0-4'
    WHEN cards_viewed < 10 THEN '5-9'
    WHEN cards_viewed < 20 THEN '10-19'
    WHEN cards_viewed < 50 THEN '20-49'
    ELSE '50+'
  END AS bucket,
  COUNT(*) AS sessions
FROM analytics_sessions
GROUP BY bucket
ORDER BY bucket;
```

## Metric 2 — feedback prompt reach

### Percentage of sessions where the feedback prompt was shown

```sql
SELECT
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE feedback_prompt_shown) / NULLIF(COUNT(*), 0),
    2
  ) AS feedback_prompt_shown_percentage
FROM analytics_sessions;
```

### Same, but per unique visitor

```sql
SELECT
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE seen) / NULLIF(COUNT(*), 0),
    2
  ) AS feedback_prompt_visitor_percentage
FROM (
  SELECT visitor_id, bool_or(feedback_prompt_shown) AS seen
  FROM analytics_sessions
  GROUP BY visitor_id
) v;
```

## Breakdowns

### Cards viewed by mode

```sql
SELECT last_mode, AVG(cards_viewed) AS avg_cards_viewed, COUNT(*) AS sessions
FROM analytics_sessions
GROUP BY last_mode
ORDER BY avg_cards_viewed DESC;
```

### Cards viewed by level

```sql
SELECT last_level, AVG(cards_viewed) AS avg_cards_viewed, COUNT(*) AS sessions
FROM analytics_sessions
GROUP BY last_level
ORDER BY avg_cards_viewed DESC;
```

### Totals at a glance

```sql
SELECT
  COUNT(*)                                   AS sessions,
  COUNT(DISTINCT visitor_id)                 AS visitors,
  SUM(cards_viewed)                          AS total_cards,
  COUNT(*) FILTER (WHERE feedback_prompt_shown) AS prompts_shown
FROM analytics_sessions;
```
