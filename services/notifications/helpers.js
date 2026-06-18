import { generateId } from '../../database/utils/ids';

/** Every day of the week in the schema bitmask (1=Sun … 64=Sat). */
export const ALL_DAYS_BITMASK = 127;

/**
 * Parse reminder_times JSON from a schedule row.
 * @param {string} reminderTimesJson
 * @returns {string[]}
 */
export function parseReminderTimes(reminderTimesJson) {
  try {
    const parsed = JSON.parse(reminderTimesJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((time) => typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time));
  } catch {
    return [];
  }
}

/**
 * Parse "HH:MM" into hour/minute components.
 * @param {string} timeString
 * @returns {{ hour: number, minute: number }|null}
 */
export function parseTimeString(timeString) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeString);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

/**
 * Convert schema days_of_week bitmask to Expo weekday numbers (1=Sun … 7=Sat).
 * @param {number} bitmask
 * @returns {number[]}
 */
export function bitmaskToExpoWeekdays(bitmask) {
  const weekdays = [];

  for (let bit = 0; bit < 7; bit += 1) {
    if (bitmask & (1 << bit)) {
      weekdays.push(bit + 1);
    }
  }

  return weekdays;
}

/**
 * Whether a schedule should use a single daily trigger (fires every day).
 * @param {{ frequencyType: string, daysOfWeek: number }} schedule
 * @returns {boolean}
 */
export function shouldUseDailyTrigger(schedule) {
  return schedule.frequencyType === 'daily' && schedule.daysOfWeek === ALL_DAYS_BITMASK;
}

/**
 * @param {{ frequencyType: string, isActive: number, reminderTimes: string, startDate: string, endDate: string|null }} schedule
 * @returns {boolean}
 */
export function isScheduleEligibleForReminders(schedule) {
  if (!schedule.isActive) return false;
  if (schedule.frequencyType === 'as_needed' || schedule.frequencyType === 'interval') {
    return false;
  }

  const times = parseReminderTimes(schedule.reminderTimes);
  if (times.length === 0) return false;

  const today = new Date().toISOString().slice(0, 10);
  if (schedule.endDate && schedule.endDate < today) return false;
  if (schedule.startDate > today) return false;

  return true;
}

/**
 * Build notification title/body and deep-link payload.
 * @param {{ name: string, dosage?: string|null }} medication
 * @param {{ id: string, label?: string|null, doseAmount?: number, doseUnit?: string }} schedule
 * @param {string} reminderTime
 */
export function buildNotificationContent(medication, schedule, reminderTime) {
  const dosagePart = medication.dosage ? ` (${medication.dosage})` : '';
  const labelPart = schedule.label ? `${schedule.label}: ` : '';
  const dosePart =
    schedule.doseAmount && schedule.doseUnit
      ? ` — ${schedule.doseAmount} ${schedule.doseUnit}`
      : '';

  return {
    title: 'Medication reminder',
    body: `${labelPart}Time to take ${medication.name}${dosagePart}${dosePart}`,
    data: {
      type: 'medication_reminder',
      medicationId: medication.id ?? schedule.medicationId,
      scheduleId: schedule.id,
      reminderTime,
    },
  };
}

/**
 * Build expiration reminder notification content.
 * @param {{ id: string, name: string, dosage?: string|null, expirationDate?: string|null }} medication
 * @param {{ daysBefore: number, alertDate: string }} target
 */
export function buildExpirationNotificationContent(medication, target) {
  const dosagePart = medication.dosage ? ` (${medication.dosage})` : '';
  const { daysBefore, alertDate } = target;

  let body;
  if (daysBefore === 0) {
    body = `${medication.name}${dosagePart} expires today (${alertDate}). Discard or replace it safely.`;
  } else if (daysBefore === 1) {
    body = `${medication.name}${dosagePart} expires tomorrow (${alertDate}).`;
  } else {
    body = `${medication.name}${dosagePart} expires in ${daysBefore} days (${alertDate}).`;
  }

  return {
    title: daysBefore === 0 ? 'Medication expired' : 'Expiration reminder',
    body,
    data: {
      type: 'expiration_reminder',
      medicationId: medication.id,
      expirationDate: medication.expirationDate ?? alertDate,
      daysBefore,
      alertDate,
    },
  };
}

/**
 * Build refill reminder notification content.
 * @param {{ id: string, name: string, dosage?: string|null, quantity: number, refillThreshold: number }} medication
 */
export function buildRefillNotificationContent(medication) {
  const dosagePart = medication.dosage ? ` (${medication.dosage})` : '';
  const remaining = medication.quantity;
  const threshold = medication.refillThreshold;

  return {
    title: 'Refill reminder',
    body: `${medication.name}${dosagePart} is running low — ${remaining} remaining (refill at ${threshold}).`,
    data: {
      type: 'refill_reminder',
      medicationId: medication.id,
      stockStatus: 'LOW_STOCK',
      quantity: remaining,
      refillThreshold: threshold,
    },
  };
}

/**
 * @returns {string}
 */
export function createNotificationIdentifier() {
  return generateId();
}

/**
 * @param {{ frequencyType: string, daysOfWeek: number }} schedule
 * @returns {Array<{ weekday: number|null }>}
 */
export function getTriggerWeekdayTargets(schedule) {
  if (shouldUseDailyTrigger(schedule)) {
    return [{ weekday: null }];
  }

  const weekdays = bitmaskToExpoWeekdays(schedule.daysOfWeek);
  if (weekdays.length === 0) {
    return [];
  }

  return weekdays.map((weekday) => ({ weekday }));
}
