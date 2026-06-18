/** @readonly */
export const INVENTORY_QUERIES = {
  GET_REMAINING_COUNT: `
    SELECT remaining_count
    FROM medications
    WHERE id = ? AND deleted_at IS NULL
  `,

  /**
   * Atomically reduce inventory; never drops below zero.
   * Binds: [deductAmount, updatedAt, medicationId]
   */
  REDUCE_REMAINING_COUNT: `
    UPDATE medications
    SET remaining_count = MAX(0, remaining_count - ?),
        updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `,

  /**
   * Add units after a refill.
   * Binds: [addAmount, updatedAt, medicationId]
   */
  ADD_REMAINING_COUNT: `
    UPDATE medications
    SET remaining_count = remaining_count + ?,
        updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `,

  IS_LOW_STOCK: `
    SELECT
      remaining_count,
      low_stock_threshold
    FROM medications
    WHERE id = ? AND deleted_at IS NULL
  `,

  /** Active medications at or below their low-stock threshold. */
  GET_LOW_STOCK_MEDICATIONS: `
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
      AND remaining_count <= low_stock_threshold
    ORDER BY remaining_count ASC, name COLLATE NOCASE ASC
  `,

  /**
   * Check whether a medication crossed into low stock after a quantity change.
   * Binds: [medicationId, previousCount]
   */
  CROSSED_INTO_LOW_STOCK: `
    SELECT id
    FROM medications
    WHERE id = ?
      AND deleted_at IS NULL
      AND ? > low_stock_threshold
      AND remaining_count <= low_stock_threshold
  `,
};
