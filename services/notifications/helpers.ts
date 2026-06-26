import type { MedicationRecord } from '../../types/app';
import type { ExpirationAlertTarget } from '../../utils/inventory';
import { generateId } from '../../database/utils/ids';
import i18n from '../../i18n';

/** Every day of the week in the schema bitmask (1=Sun … 64=Sat). */
export const ALL_DAYS_BITMASK = 127;

export function parseReminderTimes(reminderTimesJson: string): string[] {
  try {
    const parsed = JSON.parse(reminderTimesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (time): time is string => typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time)
    );
  } catch {
    return [];
  }
}

export function parseTimeString(timeString: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeString);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

export function bitmaskToExpoWeekdays(bitmask: number): number[] {
  const weekdays: number[] = [];

  for (let bit = 0; bit < 7; bit += 1) {
    if (bitmask & (1 << bit)) {
      weekdays.push(bit + 1);
    }
  }

  return weekdays;
}

export function shouldUseDailyTrigger(schedule: {
  frequencyType: string;
  daysOfWeek: number;
}): boolean {
  return schedule.frequencyType === 'daily' && schedule.daysOfWeek === ALL_DAYS_BITMASK;
}

export function isScheduleEligibleForReminders(schedule: {
  frequencyType: string;
  isActive: number;
  reminderTimes: string;
  startDate: string;
  endDate: string | null;
}): boolean {
  if (!schedule.isActive) return false;
  if (schedule.frequencyType === 'as_needed') {
    return false;
  }

  const times = parseReminderTimes(schedule.reminderTimes);
  if (times.length === 0) return false;

  const today = new Date().toISOString().slice(0, 10);
  if (schedule.endDate && schedule.endDate < today) return false;

  return true;
}

export function buildNotificationContent(
  medication: Pick<MedicationRecord, 'name' | 'dosage'> & { id?: string },
  schedule: {
    id: string;
    medicationId?: string;
    label?: string | null;
    doseAmount?: number;
    doseUnit?: string;
  },
  reminderTime: string
) {
  const dosagePart = medication.dosage ? ` (${medication.dosage})` : '';
  const labelPart = schedule.label ? `${schedule.label}: ` : '';
  const dosePart =
    schedule.doseAmount && schedule.doseUnit
      ? ` — ${schedule.doseAmount} ${schedule.doseUnit}`
      : '';

  return {
    title: i18n.t('notifications.medicationReminder'),
    body: i18n.t('notifications.timeToTake', {
      label: labelPart,
      name: medication.name,
      dosage: dosagePart,
      dose: dosePart,
    }),
    data: {
      type: 'medication_reminder',
      medicationId: medication.id ?? schedule.medicationId,
      scheduleId: schedule.id,
      reminderTime,
    },
  };
}

export function buildExpirationNotificationContent(
  medication: Pick<MedicationRecord, 'id' | 'name' | 'dosage' | 'expirationDate'>,
  target: ExpirationAlertTarget
) {
  const dosagePart = medication.dosage ? ` (${medication.dosage})` : '';
  const { daysBefore, alertDate } = target;

  let body: string;
  if (daysBefore === 0) {
    body = i18n.t('notifications.expiresTodayBody', {
      name: medication.name,
      dosage: dosagePart,
      date: alertDate,
    });
  } else if (daysBefore === 1) {
    body = i18n.t('notifications.expiresTomorrowBody', {
      name: medication.name,
      dosage: dosagePart,
      date: alertDate,
    });
  } else {
    body = i18n.t('notifications.expiresInDaysBody', {
      name: medication.name,
      dosage: dosagePart,
      days: daysBefore,
      date: alertDate,
    });
  }

  return {
    title:
      daysBefore === 0
        ? i18n.t('notifications.medicationExpired')
        : i18n.t('notifications.expirationReminder'),
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

export function buildRefillNotificationContent(medication: MedicationRecord) {
  const dosagePart = medication.dosage ? ` (${medication.dosage})` : '';
  const remaining = medication.quantity;
  const threshold = medication.refillThreshold;

  return {
    title: i18n.t('notifications.refillReminder'),
    body: i18n.t('notifications.refillBody', {
      name: medication.name,
      dosage: dosagePart,
      remaining,
      threshold,
    }),
    data: {
      type: 'refill_reminder',
      medicationId: medication.id,
      stockStatus: 'LOW_STOCK',
      quantity: remaining,
      refillThreshold: threshold,
    },
  };
}

export function createNotificationIdentifier(): string {
  return generateId();
}

export function getTriggerWeekdayTargets(schedule: {
  frequencyType: string;
  daysOfWeek: number;
}): Array<{ weekday: number | null }> {
  if (shouldUseDailyTrigger(schedule)) {
    return [{ weekday: null }];
  }

  const weekdays = bitmaskToExpoWeekdays(schedule.daysOfWeek);
  if (weekdays.length === 0) {
    return [];
  }

  return weekdays.map((weekday) => ({ weekday }));
}
