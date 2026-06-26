import type { LogRecord } from '../types/app';

export const REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;
export const SNOOZE_DURATION_MS = 15 * 60 * 1000;

export function parseLogMetadata(metadata: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(metadata) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function getSnoozedUntil(log: LogRecord): string | null {
  const meta = parseLogMetadata(log.metadata);
  return typeof meta.snoozedUntil === 'string' ? meta.snoozedUntil : null;
}

export function isSnoozeActive(log: LogRecord): boolean {
  const snoozedUntil = getSnoozedUntil(log);
  if (!snoozedUntil) return false;
  return new Date(snoozedUntil) > new Date();
}

export function isReminderWindowExpired(scheduledAt: string, now = new Date()): boolean {
  const scheduledTime = new Date(scheduledAt);
  if (Number.isNaN(scheduledTime.getTime())) return false;
  return now.getTime() - scheduledTime.getTime() >= REMINDER_WINDOW_MS;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
