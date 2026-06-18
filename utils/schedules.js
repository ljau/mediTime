import { parseReminderTimes, parseTimeString } from '../services/notifications/helpers';

/**
 * @typedef {Object} ScheduledDose
 * @property {string} scheduleId
 * @property {string} medicationId
 * @property {string} medicationName
 * @property {string|null} medicationDosage
 * @property {string} scheduledAt ISO 8601 local timestamp (YYYY-MM-DDTHH:MM:00)
 * @property {string} reminderTime HH:MM
 * @property {number} doseAmount
 * @property {string} doseUnit
 * @property {string|null} label
 */

/**
 * @param {string} isoDate YYYY-MM-DD
 * @returns {number} 0=Sun … 6=Sat
 */
export function getWeekdayIndex(isoDate) {
  return new Date(`${isoDate}T12:00:00`).getDay();
}

/**
 * @param {number} daysOfWeek Bitmask (1=Sun … 64=Sat)
 * @param {number} weekdayIndex 0=Sun … 6=Sat
 * @returns {boolean}
 */
export function isWeekdayIncluded(daysOfWeek, weekdayIndex) {
  return (daysOfWeek & (1 << weekdayIndex)) !== 0;
}

/**
 * @param {string} startDate YYYY-MM-DD
 * @param {string} targetDate YYYY-MM-DD
 * @returns {number}
 */
export function daysBetweenIsoDates(startDate, targetDate) {
  const start = new Date(`${startDate}T12:00:00`);
  const target = new Date(`${targetDate}T12:00:00`);
  return Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * @param {{ frequencyType: string, daysOfWeek: number, intervalDays: number|null, startDate: string, endDate: string|null, isActive: number, reminderTimes: string }} schedule
 * @param {string} date YYYY-MM-DD
 * @returns {boolean}
 */
export function isScheduleActiveOnDate(schedule, date) {
  if (!schedule.isActive) return false;

  if (schedule.startDate > date) return false;
  if (schedule.endDate && schedule.endDate < date) return false;

  const times = parseReminderTimes(schedule.reminderTimes);
  if (times.length === 0) return false;

  if (schedule.frequencyType === 'as_needed') return false;

  if (schedule.frequencyType === 'interval') {
    const intervalDays = schedule.intervalDays ?? 1;
    const daysSinceStart = daysBetweenIsoDates(schedule.startDate, date);
    return daysSinceStart >= 0 && daysSinceStart % intervalDays === 0;
  }

  const weekdayIndex = getWeekdayIndex(date);
  return isWeekdayIncluded(schedule.daysOfWeek, weekdayIndex);
}

/**
 * @param {string} date YYYY-MM-DD
 * @param {string} time HH:MM
 * @returns {string}
 */
export function buildScheduledAt(date, time) {
  const parsed = parseTimeString(time);
  if (!parsed) return `${date}T00:00:00`;

  const hour = String(parsed.hour).padStart(2, '0');
  const minute = String(parsed.minute).padStart(2, '0');
  return `${date}T${hour}:${minute}:00`;
}

/**
 * Expand active schedules into dose slots for a calendar day.
 * @param {Array<{
 *   id: string,
 *   medicationId: string,
 *   medicationName: string,
 *   medicationDosage: string|null,
 *   label: string|null,
 *   frequencyType: string,
 *   doseAmount: number,
 *   doseUnit: string,
 *   reminderTimes: string,
 *   daysOfWeek: number,
 *   intervalDays: number|null,
 *   startDate: string,
 *   endDate: string|null,
 *   isActive: number,
 * }>} schedules
 * @param {string} date YYYY-MM-DD
 * @returns {ScheduledDose[]}
 */
export function getScheduledDosesForDate(schedules, date) {
  const doses = [];

  for (const schedule of schedules) {
    if (!isScheduleActiveOnDate(schedule, date)) continue;

    const times = parseReminderTimes(schedule.reminderTimes);
    for (const time of times) {
      doses.push({
        scheduleId: schedule.id,
        medicationId: schedule.medicationId,
        medicationName: schedule.medicationName,
        medicationDosage: schedule.medicationDosage,
        scheduledAt: buildScheduledAt(date, time),
        reminderTime: time,
        doseAmount: schedule.doseAmount,
        doseUnit: schedule.doseUnit,
        label: schedule.label,
      });
    }
  }

  return doses.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/**
 * Find the next upcoming dose from now across upcoming days.
 * @param {Parameters<typeof getScheduledDosesForDate>[0]} schedules
 * @param {string} fromDate YYYY-MM-DD
 * @param {number} [lookaheadDays=14]
 * @returns {ScheduledDose|null}
 */
export function findNextScheduledDose(schedules, fromDate, lookaheadDays = 14) {
  const now = new Date();
  let nextDose = null;

  for (let offset = 0; offset <= lookaheadDays; offset += 1) {
    const date = addDaysToIsoDate(fromDate, offset);
    const doses = getScheduledDosesForDate(schedules, date);

    for (const dose of doses) {
      const doseTime = new Date(dose.scheduledAt);
      if (doseTime <= now) continue;

      if (!nextDose || dose.scheduledAt < nextDose.scheduledAt) {
        nextDose = dose;
      }
    }

    if (nextDose) break;
  }

  return nextDose;
}

/**
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} days
 * @returns {string}
 */
function addDaysToIsoDate(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * @param {string} scheduledAt ISO timestamp
 * @returns {string} e.g. "8:00 AM"
 */
export function formatDoseTime(scheduledAt) {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return scheduledAt;

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * @param {string} scheduledAt ISO timestamp
 * @returns {string} e.g. "Today", "Tomorrow", "Mon, Jun 23"
 */
export function formatDoseDateLabel(scheduledAt, todayIsoDate) {
  const datePart = scheduledAt.slice(0, 10);

  if (datePart === todayIsoDate) return 'Today';

  const tomorrow = addDaysToIsoDate(todayIsoDate, 1);
  if (datePart === tomorrow) return 'Tomorrow';

  const date = new Date(`${datePart}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
