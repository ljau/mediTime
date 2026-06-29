/**
 * Parse YYYY-MM-DD without timezone shifts.
 */
export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Format a Date as YYYY-MM-DD in local time.
 */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = parseIsoDate(value);
  return toIsoDate(parsed) === value;
}

export function formatDisplayDate(isoDate: string, locale: string): string {
  return parseIsoDate(isoDate).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Parse HH:mm (or H:mm) into a Date anchored on today in local time.
 */
export function parseTimeValue(time: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  const date = new Date();
  date.setSeconds(0, 0);

  if (!match) return date;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return date;
  }

  date.setHours(hour, minute);
  return date;
}

/**
 * Format a Date as HH:mm in local time.
 */
export function toTimeString(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

export function isValidTimeValue(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return false;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function formatDisplayTime(time: string, locale: string): string {
  if (!isValidTimeValue(time)) return time;

  return parseTimeValue(time).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
