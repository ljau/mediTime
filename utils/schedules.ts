import type { ScheduleFrequencyType } from '../database/types';
import type { ScheduleWithMedication } from '../types/app';
import { parseReminderTimes, parseTimeString } from '../services/notifications/helpers';
import i18n, { getAppLocale } from '../i18n';

export type { ScheduledDose } from '../types/app';
import type { ScheduledDose } from '../types/app';

export interface ScheduleForDoseExpansion {
  id: string;
  medicationId: string;
  medicationName: string;
  medicationDosage: string | null;
  label: string | null;
  frequencyType: ScheduleFrequencyType;
  doseAmount: number;
  doseUnit: string;
  reminderTimes: string;
  daysOfWeek: number;
  intervalDays: number | null;
  startDate: string;
  endDate: string | null;
  isActive: 0 | 1;
}

/**
 * @returns 0=Sun … 6=Sat
 */
export function getWeekdayIndex(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00`).getDay();
}

/**
 * @param daysOfWeek Bitmask (1=Sun … 64=Sat)
 * @param weekdayIndex 0=Sun … 6=Sat
 */
export function isWeekdayIncluded(daysOfWeek: number, weekdayIndex: number): boolean {
  return (daysOfWeek & (1 << weekdayIndex)) !== 0;
}

export function daysBetweenIsoDates(startDate: string, targetDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const target = new Date(`${targetDate}T12:00:00`);
  return Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function isScheduleActiveOnDate(
  schedule: Pick<
    ScheduleWithMedication,
    | 'frequencyType'
    | 'daysOfWeek'
    | 'intervalDays'
    | 'startDate'
    | 'endDate'
    | 'isActive'
    | 'reminderTimes'
  >,
  date: string
): boolean {
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

export function buildScheduledAt(date: string, time: string): string {
  const parsed = parseTimeString(time);
  if (!parsed) return `${date}T00:00:00`;

  const hour = String(parsed.hour).padStart(2, '0');
  const minute = String(parsed.minute).padStart(2, '0');
  return `${date}T${hour}:${minute}:00`;
}

/**
 * Expand active schedules into dose slots for a calendar day.
 */
export function getScheduledDosesForDate(
  schedules: ScheduleForDoseExpansion[],
  date: string
): ScheduledDose[] {
  const doses: ScheduledDose[] = [];

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
 */
export function findNextScheduledDose(
  schedules: ScheduleForDoseExpansion[],
  fromDate: string,
  lookaheadDays: number = 14
): ScheduledDose | null {
  const now = new Date();
  let nextDose: ScheduledDose | null = null;

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

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * @returns e.g. "8:00 AM"
 */
export function formatDoseTime(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return scheduledAt;

  return date.toLocaleTimeString(getAppLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * @returns e.g. "Today", "Tomorrow", "Mon, Jun 23"
 */
export function formatDoseDateLabel(scheduledAt: string, todayIsoDate: string): string {
  const datePart = scheduledAt.slice(0, 10);

  if (datePart === todayIsoDate) return i18n.t('dates.today');

  const tomorrow = addDaysToIsoDate(todayIsoDate, 1);
  if (datePart === tomorrow) return i18n.t('dates.tomorrow');

  const date = new Date(`${datePart}T12:00:00`);
  return date.toLocaleDateString(getAppLocale(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
