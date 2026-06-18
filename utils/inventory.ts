export const STOCK_STATUS = {
  NORMAL: 'NORMAL',
  LOW_STOCK: 'LOW_STOCK',
} as const;

export const EXPIRATION_STATUS = {
  NORMAL: 'NORMAL',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
} as const;

export type StockStatus = (typeof STOCK_STATUS)[keyof typeof STOCK_STATUS];
export type ExpirationStatus = (typeof EXPIRATION_STATUS)[keyof typeof EXPIRATION_STATUS];

/** Days before expiration when alerts are sent. */
export const EXPIRATION_ALERT_DAYS = [30, 7, 0] as const;

/** Medications expiring within this window are shown as "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

export interface MedicationInventory {
  quantity: number;
  refillThreshold: number;
}

export interface MedicationExpiration {
  expirationDate?: string | null;
}

/**
 * @returns Today's date as YYYY-MM-DD.
 */
export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Subtract days from an ISO date string.
 */
export function subtractDaysFromIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Add days to an ISO date string.
 */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  return subtractDaysFromIsoDate(isoDate, -days);
}

/**
 * Days from today until expiration (negative if already expired).
 */
export function daysUntilExpiration(expirationDate: string | null | undefined): number | null {
  if (!expirationDate) return null;

  const today = getTodayIsoDate();
  const exp = new Date(`${expirationDate}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  const diffMs = exp.getTime() - now.getTime();

  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Whether remaining quantity is at or below the refill threshold.
 */
export function isLowStock(medication: MedicationInventory): boolean {
  return medication.quantity <= medication.refillThreshold;
}

export function getStockStatus(medication: MedicationInventory): StockStatus {
  return isLowStock(medication) ? STOCK_STATUS.LOW_STOCK : STOCK_STATUS.NORMAL;
}

export function isQuantityLowStock(quantity: number, refillThreshold: number): boolean {
  return quantity <= refillThreshold;
}

export function isExpired(expirationDate: string | null | undefined): boolean {
  if (!expirationDate) return false;
  return expirationDate < getTodayIsoDate();
}

export function isExpiringSoon(
  expirationDate: string | null | undefined,
  withinDays: number = EXPIRING_SOON_DAYS
): boolean {
  if (!expirationDate || isExpired(expirationDate)) return false;

  const days = daysUntilExpiration(expirationDate);
  return days !== null && days <= withinDays;
}

export function getExpirationStatus(medication: MedicationExpiration): ExpirationStatus {
  if (!medication.expirationDate) return EXPIRATION_STATUS.NORMAL;
  if (isExpired(medication.expirationDate)) return EXPIRATION_STATUS.EXPIRED;
  if (isExpiringSoon(medication.expirationDate)) return EXPIRATION_STATUS.EXPIRING_SOON;
  return EXPIRATION_STATUS.NORMAL;
}

export interface ExpirationAlertTarget {
  daysBefore: number;
  alertDate: string;
}

/**
 * Build alert targets for expiration notifications.
 */
export function getExpirationAlertTargets(expirationDate: string): ExpirationAlertTarget[] {
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
 */
export function unitsUntilRefill(medication: MedicationInventory): number {
  return Math.max(0, medication.quantity - medication.refillThreshold);
}
