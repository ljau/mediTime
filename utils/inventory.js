/** @readonly */
export const STOCK_STATUS = {
  NORMAL: 'NORMAL',
  LOW_STOCK: 'LOW_STOCK',
};

/** @readonly */
export const EXPIRATION_STATUS = {
  NORMAL: 'NORMAL',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
};

/** Days before expiration when alerts are sent. */
export const EXPIRATION_ALERT_DAYS = [30, 7, 0];

/** Medications expiring within this window are shown as "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

/**
 * @typedef {Object} MedicationInventory
 * @property {number} quantity
 * @property {number} refillThreshold
 */

/**
 * @typedef {Object} MedicationExpiration
 * @property {string|null|undefined} expirationDate
 */

/**
 * @returns {string} Today's date as YYYY-MM-DD.
 */
export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Subtract days from an ISO date string.
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} days
 * @returns {string}
 */
export function subtractDaysFromIsoDate(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Add days to an ISO date string.
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} days
 * @returns {string}
 */
export function addDaysToIsoDate(isoDate, days) {
  return subtractDaysFromIsoDate(isoDate, -days);
}

/**
 * Days from today until expiration (negative if already expired).
 * @param {string|null|undefined} expirationDate YYYY-MM-DD
 * @returns {number|null}
 */
export function daysUntilExpiration(expirationDate) {
  if (!expirationDate) return null;

  const today = getTodayIsoDate();
  const exp = new Date(`${expirationDate}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  const diffMs = exp.getTime() - now.getTime();

  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Whether remaining quantity is at or below the refill threshold.
 * @param {MedicationInventory} medication
 * @returns {boolean}
 */
export function isLowStock(medication) {
  return medication.quantity <= medication.refillThreshold;
}

/**
 * @param {MedicationInventory} medication
 * @returns {typeof STOCK_STATUS[keyof typeof STOCK_STATUS]}
 */
export function getStockStatus(medication) {
  return isLowStock(medication) ? STOCK_STATUS.LOW_STOCK : STOCK_STATUS.NORMAL;
}

/**
 * @param {number} quantity
 * @param {number} refillThreshold
 * @returns {boolean}
 */
export function isQuantityLowStock(quantity, refillThreshold) {
  return quantity <= refillThreshold;
}

/**
 * @param {string|null|undefined} expirationDate YYYY-MM-DD
 * @returns {boolean}
 */
export function isExpired(expirationDate) {
  if (!expirationDate) return false;
  return expirationDate < getTodayIsoDate();
}

/**
 * @param {string|null|undefined} expirationDate YYYY-MM-DD
 * @param {number} [withinDays=EXPIRING_SOON_DAYS]
 * @returns {boolean}
 */
export function isExpiringSoon(expirationDate, withinDays = EXPIRING_SOON_DAYS) {
  if (!expirationDate || isExpired(expirationDate)) return false;

  const days = daysUntilExpiration(expirationDate);
  return days !== null && days <= withinDays;
}

/**
 * @param {MedicationExpiration} medication
 * @returns {typeof EXPIRATION_STATUS[keyof typeof EXPIRATION_STATUS]}
 */
export function getExpirationStatus(medication) {
  if (!medication.expirationDate) return EXPIRATION_STATUS.NORMAL;
  if (isExpired(medication.expirationDate)) return EXPIRATION_STATUS.EXPIRED;
  if (isExpiringSoon(medication.expirationDate)) return EXPIRATION_STATUS.EXPIRING_SOON;
  return EXPIRATION_STATUS.NORMAL;
}

/**
 * Build alert targets for expiration notifications.
 * @param {string} expirationDate YYYY-MM-DD
 * @returns {Array<{ daysBefore: number, alertDate: string }>}
 */
export function getExpirationAlertTargets(expirationDate) {
  const today = getTodayIsoDate();

  return EXPIRATION_ALERT_DAYS.map((daysBefore) => ({
    daysBefore,
    alertDate:
      daysBefore === 0
        ? expirationDate
        : subtractDaysFromIsoDate(expirationDate, daysBefore),
  })).filter((target) => target.alertDate >= today);
}

/**
 * Units remaining until the refill threshold is reached.
 * @param {MedicationInventory} medication
 * @returns {number}
 */
export function unitsUntilRefill(medication) {
  return Math.max(0, medication.quantity - medication.refillThreshold);
}
