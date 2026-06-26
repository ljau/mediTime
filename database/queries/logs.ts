const LOG_COLUMNS = `
  id,
  medication_id,
  schedule_id,
  user_id,
  scheduled_at,
  taken_at,
  status,
  dose_amount,
  dose_unit,
  notes,
  created_at,
  updated_at,
  metadata
`;

/** @readonly */
export const LOG_QUERIES = {
  COLUMNS: LOG_COLUMNS,

  SELECT_BY_ID: `
    SELECT ${LOG_COLUMNS}
    FROM logs
    WHERE id = ?
  `,

  SELECT_BY_SCHEDULE_AND_TIME: `
    SELECT ${LOG_COLUMNS}
    FROM logs
    WHERE schedule_id = ?
      AND scheduled_at = ?
    LIMIT 1
  `,

  SELECT_BY_MEDICATION: `
    SELECT ${LOG_COLUMNS}
    FROM logs
    WHERE medication_id = ?
    ORDER BY scheduled_at DESC
  `,

  /**
   * All dose events for a medication on a calendar day (supports multiple doses/day).
   * Matches the YYYY-MM-DD prefix of scheduled_at (local ISO timestamps).
   * Binds: [medicationId, date]
   */
  SELECT_BY_MEDICATION_DAY: `
    SELECT ${LOG_COLUMNS}
    FROM logs
    WHERE medication_id = ?
      AND substr(scheduled_at, 1, 10) = ?
    ORDER BY scheduled_at ASC
  `,

  SELECT_TAKEN_BY_MEDICATION_DAY: `
    SELECT ${LOG_COLUMNS}
    FROM logs
    WHERE medication_id = ?
      AND status = 'taken'
      AND substr(scheduled_at, 1, 10) = ?
    ORDER BY scheduled_at ASC
  `,

  INSERT: `
    INSERT INTO logs (
      id,
      medication_id,
      schedule_id,
      user_id,
      scheduled_at,
      taken_at,
      status,
      dose_amount,
      dose_unit,
      notes,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  UPDATE_STATUS: `
    UPDATE logs
    SET status = ?,
        taken_at = ?,
        dose_amount = ?,
        dose_unit = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `,

  UPDATE_METADATA: `
    UPDATE logs
    SET metadata = ?,
        updated_at = ?
    WHERE id = ?
  `,

  /**
   * History entries within a date range, optionally filtered by medication.
   * Binds: [startDate, endDate] or [startDate, endDate, medicationId]
   */
  SELECT_IN_DATE_RANGE: `
    SELECT l.id,
           l.medication_id,
           l.schedule_id,
           l.scheduled_at,
           l.taken_at,
           l.status,
           l.dose_amount,
           l.dose_unit,
           m.name AS medication_name,
           m.dosage AS medication_dosage
    FROM logs l
    JOIN medications m ON m.id = l.medication_id
    WHERE m.deleted_at IS NULL
      AND substr(l.scheduled_at, 1, 10) >= ?
      AND substr(l.scheduled_at, 1, 10) <= ?
    ORDER BY l.scheduled_at DESC
  `,

  SELECT_IN_DATE_RANGE_BY_MEDICATION: `
    SELECT l.id,
           l.medication_id,
           l.schedule_id,
           l.scheduled_at,
           l.taken_at,
           l.status,
           l.dose_amount,
           l.dose_unit,
           m.name AS medication_name,
           m.dosage AS medication_dosage
    FROM logs l
    JOIN medications m ON m.id = l.medication_id
    WHERE m.deleted_at IS NULL
      AND substr(l.scheduled_at, 1, 10) >= ?
      AND substr(l.scheduled_at, 1, 10) <= ?
      AND l.medication_id = ?
    ORDER BY l.scheduled_at DESC
  `,

  SELECT_TODAY_LOGS: `
    SELECT ${LOG_COLUMNS}
    FROM logs
    WHERE substr(scheduled_at, 1, 10) = ?
    ORDER BY scheduled_at ASC
  `,
};
