import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIdempotentCallback } from '../../hooks/useIdempotentCallback';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { fontSize, fontWeight, textStyles } from '../../constants/typography';
import { formatDoseDateLabel, formatDoseTime } from '../../utils/schedules';
import { getTodayIsoDate } from '../../utils/inventory';

import type { ScheduledDose } from '../../types/app';

interface NextDoseCardProps {
  dose: ScheduledDose | null;
  onPress?: () => void;
}

export default function NextDoseCard({ dose, onPress }: NextDoseCardProps) {
  const { t } = useTranslation();
  const handlePress = useIdempotentCallback(onPress ?? (() => {}));

  if (!dose) {
    return null;
  }

  const today = getTodayIsoDate();

  const dateLabel = formatDoseDateLabel(dose.scheduledAt, today);
  const timeLabel = formatDoseTime(dose.scheduledAt);
  const dosagePart = dose.medicationDosage ? ` · ${dose.medicationDosage}` : '';
  const dosePart = `${dose.doseAmount} ${dose.doseUnit}`;

  const content = (
    <>
      <Text style={styles.sectionLabel}>{t('home.nextScheduled')}</Text>
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
        onPress={handlePress}
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
});
