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
};
