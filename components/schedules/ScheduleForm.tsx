import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateInput from '../ui/DateInput';
import NumericInput from '../ui/NumericInput';
import TextInput from '../ui/TextInput';
import TimeInput from '../ui/TimeInput';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import type { ScheduleFrequencyType, ScheduleInput, ScheduleRecord } from '../../types/app';
import { ALL_DAYS_BITMASK, parseReminderTimes } from '../../services/notifications/helpers';
import { isValidTimeValue, parseTimeValue, toTimeString } from '../../utils/dates';
import { WEEKDAY_KEYS } from './ScheduleListItem';

export interface ScheduleFormValues {
  label: string;
  frequencyType: ScheduleFrequencyType;
  doseAmount: string;
  doseUnit: string;
  reminderTimes: string[];
  daysOfWeek: number;
  intervalDays: string;
  startDate: string;
  endDate: string;
}

export type ScheduleFormErrors = Partial<Record<string, string>>;

const FREQUENCY_TYPES: ScheduleFrequencyType[] = [
  'daily',
  'weekly',
  'interval',
  'as_needed',
];

const EMPTY_FORM: ScheduleFormValues = {
  label: '',
  frequencyType: 'daily',
  doseAmount: '1',
  doseUnit: 'pill',
  reminderTimes: ['08:00'],
  daysOfWeek: ALL_DAYS_BITMASK,
  intervalDays: '2',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
};

function toFormValues(schedule?: ScheduleRecord | null): ScheduleFormValues {
  if (!schedule) return EMPTY_FORM;

  return {
    label: schedule.label ?? '',
    frequencyType: schedule.frequencyType,
    doseAmount: String(schedule.doseAmount),
    doseUnit: schedule.doseUnit,
    reminderTimes: parseReminderTimes(schedule.reminderTimes),
    daysOfWeek: schedule.daysOfWeek,
    intervalDays: String(schedule.intervalDays ?? 2),
    startDate: schedule.startDate,
    endDate: schedule.endDate ?? '',
  };
}

function validate(values: ScheduleFormValues, t: (key: string) => string): ScheduleFormErrors {
  const errors: ScheduleFormErrors = {};

  if (!values.doseAmount.trim() || Number(values.doseAmount) <= 0) {
    errors.doseAmount = t('schedules.doseRequired');
  }

  if (values.frequencyType === 'interval') {
    if (!values.intervalDays.trim() || Number(values.intervalDays) <= 0) {
      errors.intervalDays = t('schedules.intervalRequired');
    }
  }

  if (values.frequencyType !== 'as_needed' && values.reminderTimes.length === 0) {
    errors.reminderTimes = t('schedules.timesRequired');
  }

  if (values.frequencyType === 'weekly' && values.daysOfWeek === 0) {
    errors.daysOfWeek = t('schedules.daysRequired');
  }

  return errors;
}

export function formValuesToScheduleInput(
  medicationId: string,
  values: ScheduleFormValues
): ScheduleInput {
  return {
    medicationId,
    label: values.label.trim() || null,
    frequencyType: values.frequencyType,
    doseAmount: Number(values.doseAmount),
    doseUnit: values.doseUnit.trim() || 'pill',
    reminderTimes: values.frequencyType === 'as_needed' ? [] : values.reminderTimes,
    daysOfWeek: values.frequencyType === 'daily' ? ALL_DAYS_BITMASK : values.daysOfWeek,
    intervalDays:
      values.frequencyType === 'interval' ? Number(values.intervalDays) : null,
    startDate: values.startDate,
    endDate: values.endDate.trim() || null,
  };
}

export function isScheduleFormValid(values: ScheduleFormValues, t: (key: string) => string): boolean {
  return Object.keys(validate(values, t)).length === 0;
}

interface ScheduleFormProps {
  medicationId: string;
  initialSchedule?: ScheduleRecord | null;
  onChange?: (values: ScheduleFormValues, isValid: boolean) => void;
}

export default function ScheduleForm({
  medicationId,
  initialSchedule,
  onChange,
}: ScheduleFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<ScheduleFormValues>(() => toFormValues(initialSchedule));
  const [errors, setErrors] = useState<ScheduleFormErrors>({});
  const [newTime, setNewTime] = useState('12:00');

  function update(next: Partial<ScheduleFormValues>) {
    const merged = { ...values, ...next };
    const nextErrors = validate(merged, t);
    setValues(merged);
    setErrors(nextErrors);
    onChange?.(merged, Object.keys(nextErrors).length === 0);
  }

  function toggleDay(dayIndex: number) {
    const bit = 1 << dayIndex;
    const nextDays = values.daysOfWeek & bit ? values.daysOfWeek & ~bit : values.daysOfWeek | bit;
    update({ daysOfWeek: nextDays });
  }

  function addReminderTime() {
    if (!isValidTimeValue(newTime)) return;
    const normalized = toTimeString(parseTimeValue(newTime));
    if (values.reminderTimes.includes(normalized)) return;
    update({ reminderTimes: [...values.reminderTimes, normalized].sort() });
  }

  function removeReminderTime(time: string) {
    update({ reminderTimes: values.reminderTimes.filter((t) => t !== time) });
  }

  return (
    <View style={styles.form}>
      <TextInput
        label={t('schedules.label')}
        value={values.label}
        onChangeText={(label) => update({ label })}
        placeholder={t('schedules.labelPlaceholder')}
      />

      <Text style={styles.fieldLabel}>{t('schedules.frequency')}</Text>
      <View style={styles.chipRow}>
        {FREQUENCY_TYPES.map((type) => (
          <Pressable
            key={type}
            onPress={() => update({ frequencyType: type })}
            style={[
              styles.chip,
              values.frequencyType === type && styles.chipSelected,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                values.frequencyType === type && styles.chipTextSelected,
              ]}
            >
              {t(`schedules.types.${type}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <NumericInput
            label={t('schedules.doseAmount')}
            value={values.doseAmount}
            onChange={(doseAmount) => update({ doseAmount })}
            error={errors.doseAmount}
          />
        </View>
        <View style={styles.half}>
          <TextInput
            label={t('schedules.doseUnit')}
            value={values.doseUnit}
            onChangeText={(doseUnit) => update({ doseUnit })}
          />
        </View>
      </View>

      {values.frequencyType === 'weekly' ? (
        <View>
          <Text style={styles.fieldLabel}>{t('schedules.daysOfWeek')}</Text>
          <View style={styles.chipRow}>
            {WEEKDAY_KEYS.map((key, index) => {
              const selected = (values.daysOfWeek & (1 << index)) !== 0;
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleDay(index)}
                  style={[styles.dayChip, selected && styles.chipSelected]}
                >
                  <Text
                    style={[styles.dayChipText, selected && styles.chipTextSelected]}
                  >
                    {t(`schedules.days.${key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.daysOfWeek ? (
            <Text style={styles.error}>{errors.daysOfWeek}</Text>
          ) : null}
        </View>
      ) : null}

      {values.frequencyType === 'interval' ? (
        <NumericInput
          label={t('schedules.intervalDays')}
          value={values.intervalDays}
          onChange={(intervalDays) => update({ intervalDays })}
          error={errors.intervalDays}
        />
      ) : null}

      {values.frequencyType !== 'as_needed' ? (
        <View>
          <Text style={styles.fieldLabel}>{t('schedules.reminderTimes')}</Text>
          <View style={styles.chipRow}>
            {values.reminderTimes.map((time) => (
              <Pressable
                key={time}
                onPress={() => removeReminderTime(time)}
                style={styles.timeChip}
              >
                <Text style={styles.timeChipText}>{time} ×</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <TimeInput
                label={t('schedules.addTime')}
                value={newTime}
                onChange={setNewTime}
              />
            </View>
            <Pressable onPress={addReminderTime} style={styles.addTimeButton}>
              <Text style={styles.addTimeText}>{t('schedules.add')}</Text>
            </Pressable>
          </View>
          {errors.reminderTimes ? (
            <Text style={styles.error}>{errors.reminderTimes}</Text>
          ) : null}
        </View>
      ) : null}

      <DateInput
        label={t('schedules.startDate')}
        value={values.startDate}
        onChange={(startDate) => update({ startDate })}
      />

      <DateInput
        label={t('schedules.endDate')}
        value={values.endDate}
        onChange={(endDate) => update({ endDate })}
        placeholder={t('schedules.optional')}
      />
    </View>
  );
}

export function getScheduleFormInput(
  medicationId: string,
  values: ScheduleFormValues
): ScheduleInput {
  return formValuesToScheduleInput(medicationId, values);
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  fieldLabel: {
    ...textStyles.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...textStyles.label,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.textInverse,
  },
  dayChip: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    minWidth: 40,
    alignItems: 'center',
  },
  dayChipText: {
    ...textStyles.label,
    color: colors.textPrimary,
    fontSize: 12,
  },
  timeChip: {
    borderRadius: radius.md,
    backgroundColor: colors.infoLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  timeChipText: {
    ...textStyles.label,
    color: colors.info,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  half: {
    flex: 1,
  },
  addTimeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  addTimeText: {
    ...textStyles.label,
    color: colors.textInverse,
  },
  error: {
    ...textStyles.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
