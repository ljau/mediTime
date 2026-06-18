import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { fontSize, fontWeight, textStyles } from '../../constants/typography';
import { formatDoseDateLabel, formatDoseTime } from '../../utils/schedules';
import { getTodayIsoDate } from '../../utils/inventory';

/**
 * @param {{
 *   dose: import('../../utils/schedules').ScheduledDose|null,
 *   onPress?: () => void,
 * }} props
 */
export default function NextDoseCard({ dose, onPress }) {
  const today = getTodayIsoDate();

  if (!dose) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptySectionLabel}>Next scheduled</Text>
        <Text style={styles.emptyTitle}>All clear for now</Text>
        <Text style={styles.emptyBody}>
          No upcoming doses on your schedule. Add medications with reminder times to
          see them here.
        </Text>
      </View>
    );
  }

  const dateLabel = formatDoseDateLabel(dose.scheduledAt, today);
  const timeLabel = formatDoseTime(dose.scheduledAt);
  const dosagePart = dose.medicationDosage ? ` · ${dose.medicationDosage}` : '';
  const dosePart = `${dose.doseAmount} ${dose.doseUnit}`;

  const content = (
    <>
      <Text style={styles.sectionLabel}>Next scheduled</Text>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{timeLabel}</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{dateLabel}</Text>
        </View>
      </View>
      <Text style={styles.medicationName}>
        {dose.medicationName}
        {dosagePart}
      </Text>
      <Text style={styles.doseDetail}>{dosePart}</Text>
      {dose.label ? <Text style={styles.scheduleLabel}>{dose.label}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  sectionLabel: {
    ...textStyles.label,
    color: colors.textInverse,
    opacity: 0.85,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  time: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
    lineHeight: 38,
  },
  dateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  dateBadgeText: {
    ...textStyles.label,
    color: colors.textInverse,
  },
  medicationName: {
    ...textStyles.sectionTitle,
    color: colors.textInverse,
    fontSize: fontSize.xl,
  },
  doseDetail: {
    ...textStyles.body,
    color: colors.textInverse,
    opacity: 0.9,
  },
  scheduleLabel: {
    ...textStyles.bodySmall,
    color: colors.textInverse,
    opacity: 0.75,
  },
  emptySectionLabel: {
    ...textStyles.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyTitle: {
    ...textStyles.sectionTitle,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
});
