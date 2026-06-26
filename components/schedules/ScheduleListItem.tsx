import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Card from '../ui/Card';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import type { ScheduleRecord } from '../../types/app';
import { ALL_DAYS_BITMASK, bitmaskToExpoWeekdays, parseReminderTimes } from '../../services/notifications/helpers';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

interface ScheduleListItemProps {
  schedule: ScheduleRecord;
  onPress?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDelete?: () => void;
}

function formatFrequency(schedule: ScheduleRecord, t: TFunction): string {
  const times = parseReminderTimes(schedule.reminderTimes);

  switch (schedule.frequencyType) {
    case 'daily':
      return t('schedules.frequencyDaily', { count: times.length });
    case 'weekly': {
      const days = bitmaskToExpoWeekdays(schedule.daysOfWeek);
      const dayLabels = days.map((d) => t(`schedules.days.${WEEKDAY_KEYS[d - 1]}`)).join(', ');
      return t('schedules.frequencyWeekly', { days: dayLabels, count: times.length });
    }
    case 'interval':
      return t('schedules.frequencyInterval', {
        days: schedule.intervalDays ?? 1,
        count: times.length,
      });
    case 'as_needed':
      return t('schedules.frequencyAsNeeded');
    default:
      return schedule.frequencyType;
  }
}

function formatTimes(schedule: ScheduleRecord): string {
  return parseReminderTimes(schedule.reminderTimes).join(', ');
}

export default function ScheduleListItem({
  schedule,
  onPress,
  onPause,
  onResume,
  onDelete,
}: ScheduleListItemProps) {
  const { t } = useTranslation();
  const isPaused = !schedule.isActive;

  return (
    <Card style={styles.card}>
      <Pressable onPress={onPress} disabled={!onPress}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {schedule.label || t('schedules.defaultLabel')}
          </Text>
          {isPaused ? (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedText}>{t('schedules.paused')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.frequency}>{formatFrequency(schedule, t)}</Text>
        <Text style={styles.times}>{formatTimes(schedule)}</Text>
        <Text style={styles.dose}>
          {schedule.doseAmount} {schedule.doseUnit}
        </Text>
      </Pressable>

      <View style={styles.actions}>
        {isPaused && onResume ? (
          <Pressable onPress={onResume} style={styles.actionLink}>
            <Text style={styles.actionLinkText}>{t('schedules.resume')}</Text>
          </Pressable>
        ) : null}
        {!isPaused && onPause ? (
          <Pressable onPress={onPause} style={styles.actionLink}>
            <Text style={styles.actionLinkText}>{t('schedules.pause')}</Text>
          </Pressable>
        ) : null}
        {onPress ? (
          <Pressable onPress={onPress} style={styles.actionLink}>
            <Text style={styles.actionLinkText}>{t('schedules.edit')}</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable onPress={onDelete} style={styles.actionLink}>
            <Text style={[styles.actionLinkText, styles.deleteText]}>{t('common.delete')}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

export { ALL_DAYS_BITMASK, WEEKDAY_KEYS };

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.textPrimary,
    flex: 1,
  },
  pausedBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.full,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  pausedText: {
    ...textStyles.label,
    color: colors.warning,
    fontSize: 11,
  },
  frequency: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
  times: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  dose: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionLink: {
    paddingVertical: spacing.xxs,
  },
  actionLinkText: {
    ...textStyles.label,
    color: colors.primary,
  },
  deleteText: {
    color: colors.error,
  },
});
