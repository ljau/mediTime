/** @readonly */
export const EXPIRATION_QUERIES = {
  /** Active medications that have already expired. Binds: [today] */
  GET_EXPIRED_MEDICATIONS: `
    SELECT
      id,
      name,
      dosage,
      remaining_count,
      low_stock_threshold,
      expiration_date,
      notes,
      created_at,
      updated_at
    FROM medications
    WHERE deleted_at IS NULL
      AND is_active = 1
      AND expiration_date IS NOT NULL
      AND expiration_date < ?
    ORDER BY expiration_date ASC, name COLLATE NOCASE ASC
  `,

  /**
   * Active medications expiring on or before the given date (inclusive).
   * Binds: [today, expiringByDate]
   */
  GET_EXPIRING_MEDICATIONS: `
    SELECT
      id,
      name,
      dosage,
      remaining_count,
      low_stock_threshold,
      expiration_date,
      notes,
      created_at,
      updated_at
    FROM medications
    WHERE deleted_at IS NULL
      AND is_active = 1
      AND expiration_date IS NOT NULL
      AND expiration_date >= ?
      AND expiration_date <= ?
    ORDER BY expiration_date ASC, name COLLATE NOCASE ASC
  `,

  /**
   * Active medications with an expiration date set (for notification sync).
   */
  GET_MEDICATIONS_WITH_EXPIRATION: `
    SELECT
      id,
      name,
      dosage,
      remaining_count,
      low_stock_threshold,
      expiration_date,
      notes,
      created_at,
      updated_at
    FROM medications
    WHERE deleted_at IS NULL
      AND is_active = 1
      AND expiration_date IS NOT NULL
    ORDER BY expiration_date ASC, name COLLATE NOCASE ASC
  `,

  /** Summary counts. Binds: [today, expiringByDate, today] */
  GET_EXPIRATION_SUMMARY: `
    SELECT
      SUM(CASE
        WHEN expiration_date IS NOT NULL AND expiration_date < ?
        THEN 1 ELSE 0
      END) AS expired_count,
      SUM(CASE
        WHEN expiration_date IS NOT NULL
          AND expiration_date >= ?
          AND expiration_date <= ?
        THEN 1 ELSE 0
      END) AS expiring_soon_count
    FROM medications
    WHERE deleted_at IS NULL AND is_active = 1
  `,
};
