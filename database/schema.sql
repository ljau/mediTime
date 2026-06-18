-- MediTime SQLite Schema
-- Designed for expo-sqlite. Enable foreign keys on every connection:
--   PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- medications
-- Core inventory record for each medication the user tracks.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications (
  id                    TEXT PRIMARY KEY NOT NULL,
  -- Reserved for future multi-profile / family / cloud-sync support.
  user_id               TEXT,

  name                  TEXT NOT NULL,
  -- Human-readable strength, e.g. "10 mg", "500 IU".
  dosage                TEXT,
  -- tablet | capsule | liquid | injection | topical | other
  form                  TEXT NOT NULL DEFAULT 'tablet',
  instructions          TEXT,
  notes                 TEXT,

  -- Inventory & alerts
  remaining_count       INTEGER NOT NULL DEFAULT 0 CHECK (remaining_count >= 0),
  -- Snapshot at last full refill; useful for progress bars and analytics.
  initial_count         INTEGER CHECK (initial_count IS NULL OR initial_count >= 0),
  -- Alert when remaining_count <= low_stock_threshold.
  low_stock_threshold   INTEGER NOT NULL DEFAULT 7 CHECK (low_stock_threshold >= 0),
  -- ISO 8601 date (YYYY-MM-DD). NULL = no expiration tracked.
  expiration_date       TEXT,

  -- Refill reminders (days-before-empty is derived from schedule + dose rate).
  refill_reminder_enabled INTEGER NOT NULL DEFAULT 1 CHECK (refill_reminder_enabled IN (0, 1)),
  -- Notify this many days before estimated run-out.
  refill_reminder_days_before INTEGER NOT NULL DEFAULT 3 CHECK (refill_reminder_days_before >= 0),

  -- UI helpers
  color                 TEXT,
  image_uri             TEXT,

  is_active             INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  -- Soft delete; keeps history rows intact while hiding from active lists.
  deleted_at            TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  -- Escape hatch for future fields without migrations, e.g. {"rx_number":"..."}.
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


-- ---------------------------------------------------------------------------
-- schedules
-- When and how often a medication should be taken.
-- One medication may have multiple schedules (e.g. morning + evening).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
  id                    TEXT PRIMARY KEY NOT NULL,
  medication_id         TEXT NOT NULL,
  user_id               TEXT,

  label                 TEXT,
  -- daily | weekly | interval | as_needed
  frequency_type        TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency_type IN ('daily', 'weekly', 'interval', 'as_needed')),

  -- Pills/units consumed per scheduled dose event.
  dose_amount           REAL NOT NULL DEFAULT 1 CHECK (dose_amount > 0),
  dose_unit             TEXT NOT NULL DEFAULT 'pill',

  -- JSON array of local times, e.g. ["08:00", "20:00"].
  reminder_times        TEXT NOT NULL DEFAULT '[]',
  -- Bitmask for weekly schedules: 1=Sun, 2=Mon, 4=Tue, 8=Wed, 16=Thu, 32=Fri, 64=Sat.
  -- 127 = every day. Ignored for daily schedules.
  days_of_week          INTEGER NOT NULL DEFAULT 127 CHECK (days_of_week BETWEEN 0 AND 127),
  -- For frequency_type = 'interval': take every N days.
  interval_days         INTEGER CHECK (interval_days IS NULL OR interval_days > 0),

  -- ISO 8601 dates (YYYY-MM-DD).
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


-- ---------------------------------------------------------------------------
-- logs
-- Daily adherence record: taken, missed, skipped, or pending doses.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
  id                    TEXT PRIMARY KEY NOT NULL,
  medication_id         TEXT NOT NULL,
  -- Nullable for as-needed doses not tied to a recurring schedule.
  schedule_id           TEXT,
  user_id               TEXT,

  -- When the dose was planned (local calendar day + time as ISO 8601).
  scheduled_at          TEXT NOT NULL,
  -- When the user marked it taken. NULL if missed/skipped/pending.
  taken_at              TEXT,

  -- taken | missed | skipped | pending
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('taken', 'missed', 'skipped', 'pending')),

  -- Actual units consumed (may differ from schedule.dose_amount).
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


-- ---------------------------------------------------------------------------
-- refill_history
-- Audit trail every time inventory is replenished.
-- ---------------------------------------------------------------------------
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
  -- Store as integer cents to avoid floating-point rounding, e.g. 1299 = $12.99.
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


-- ---------------------------------------------------------------------------
-- notification_reminders
-- Maps Expo local notification identifiers to medications/schedules for
-- cancellation and rescheduling when schedules change.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_reminders (
  id                    TEXT PRIMARY KEY NOT NULL,
  medication_id         TEXT NOT NULL,
  schedule_id           TEXT,
  -- Identifier passed to expo-notifications scheduleNotificationAsync.
  expo_notification_id  TEXT NOT NULL UNIQUE,
  -- Local time slot, e.g. "08:00".
  reminder_time         TEXT NOT NULL,
  -- Expo weekday (1=Sun … 7=Sat). NULL for daily-every-day triggers.
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
