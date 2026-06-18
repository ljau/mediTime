/**
 * SQLite schema bundled for offline initialization.
 * Keep in sync with database/schema.sql.
 */
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS medications (
  id                    TEXT PRIMARY KEY NOT NULL,
  user_id               TEXT,
  name                  TEXT NOT NULL,
  dosage                TEXT,
  form                  TEXT NOT NULL DEFAULT 'tablet',
  instructions          TEXT,
  notes                 TEXT,
  remaining_count       INTEGER NOT NULL DEFAULT 0 CHECK (remaining_count >= 0),
  initial_count         INTEGER CHECK (initial_count IS NULL OR initial_count >= 0),
  low_stock_threshold   INTEGER NOT NULL DEFAULT 7 CHECK (low_stock_threshold >= 0),
  expiration_date       TEXT,
  refill_reminder_enabled INTEGER NOT NULL DEFAULT 1 CHECK (refill_reminder_enabled IN (0, 1)),
  refill_reminder_days_before INTEGER NOT NULL DEFAULT 3 CHECK (refill_reminder_days_before >= 0),
  color                 TEXT,
  image_uri             TEXT,
  is_active             INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  deleted_at            TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  metadata              TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_medications_user_active
  ON medications (user_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_medications_expiration
  ON medications (expiration_date)
  WHERE expiration_date IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_medications_low_stock
  ON medications (remaining_count, low_stock_threshold)
  WHERE is_active = 1 AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS schedules (
  id                    TEXT PRIMARY KEY NOT NULL,
  medication_id         TEXT NOT NULL,
  user_id               TEXT,
  label                 TEXT,
  frequency_type        TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency_type IN ('daily', 'weekly', 'interval', 'as_needed')),
  dose_amount           REAL NOT NULL DEFAULT 1 CHECK (dose_amount > 0),
  dose_unit             TEXT NOT NULL DEFAULT 'pill',
  reminder_times        TEXT NOT NULL DEFAULT '[]',
  days_of_week          INTEGER NOT NULL DEFAULT 127 CHECK (days_of_week BETWEEN 0 AND 127),
  interval_days         INTEGER CHECK (interval_days IS NULL OR interval_days > 0),
  start_date            TEXT NOT NULL,
  end_date              TEXT,
  timezone              TEXT NOT NULL DEFAULT 'UTC',
  is_active             INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  metadata              TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedules_medication
  ON schedules (medication_id, is_active);

CREATE INDEX IF NOT EXISTS idx_schedules_user
  ON schedules (user_id)
  WHERE is_active = 1;

CREATE TABLE IF NOT EXISTS logs (
  id                    TEXT PRIMARY KEY NOT NULL,
  medication_id         TEXT NOT NULL,
  schedule_id           TEXT,
  user_id               TEXT,
  scheduled_at          TEXT NOT NULL,
  taken_at              TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('taken', 'missed', 'skipped', 'pending')),
  dose_amount           REAL NOT NULL DEFAULT 1 CHECK (dose_amount > 0),
  dose_unit             TEXT NOT NULL DEFAULT 'pill',
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  metadata              TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_medication_scheduled
  ON logs (medication_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_schedule
  ON logs (schedule_id, scheduled_at DESC)
  WHERE schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logs_status_day
  ON logs (status, scheduled_at)
  WHERE status IN ('pending', 'missed');

CREATE INDEX IF NOT EXISTS idx_logs_user_day
  ON logs (user_id, scheduled_at DESC);

CREATE TABLE IF NOT EXISTS refill_history (
  id                    TEXT PRIMARY KEY NOT NULL,
  medication_id         TEXT NOT NULL,
  user_id               TEXT,
  refilled_at           TEXT NOT NULL,
  quantity_added        INTEGER NOT NULL CHECK (quantity_added > 0),
  quantity_before       INTEGER NOT NULL CHECK (quantity_before >= 0),
  quantity_after        INTEGER NOT NULL CHECK (quantity_after >= 0),
  pharmacy              TEXT,
  prescription_number   TEXT,
  cost_cents            INTEGER CHECK (cost_cents IS NULL OR cost_cents >= 0),
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  metadata              TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refill_history_medication
  ON refill_history (medication_id, refilled_at DESC);

CREATE INDEX IF NOT EXISTS idx_refill_history_user
  ON refill_history (user_id, refilled_at DESC);

CREATE TABLE IF NOT EXISTS notification_reminders (
  id                    TEXT PRIMARY KEY NOT NULL,
  medication_id         TEXT NOT NULL,
  schedule_id           TEXT,
  expo_notification_id  TEXT NOT NULL UNIQUE,
  reminder_time         TEXT NOT NULL,
  weekday               INTEGER CHECK (weekday IS NULL OR weekday BETWEEN 1 AND 7),
  notification_type     TEXT NOT NULL DEFAULT 'medication'
    CHECK (notification_type IN ('medication', 'refill', 'expiration')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_reminders_schedule
  ON notification_reminders (schedule_id);

CREATE INDEX IF NOT EXISTS idx_notification_reminders_medication
  ON notification_reminders (medication_id);
`;
