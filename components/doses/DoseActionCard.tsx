import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { fontSize, textStyles } from '../../constants/typography';
import type { TodayDose } from '../../types/app';
import { formatDoseTime } from '../../utils/schedules';

interface DoseActionCardProps {
  dose: TodayDose;
  onTaken: () => void;
  onSkipped: () => void;
  onSnoozed: () => void;
  onPress?: () => void;
  isProcessing?: boolean;
}

const STATUS_COLORS: Record<TodayDose['status'], string> = {
  taken: colors.taken,
  missed: colors.missed,
  skipped: colors.skipped,
  pending: colors.pending,
  snoozed: colors.info,
};

export default function DoseActionCard({
  dose,
  onTaken,
  onSkipped,
  onSnoozed,
  onPress,
  isProcessing = false,
}: DoseActionCardProps) {
  const { t } = useTranslation();
  const isActionable = dose.status === 'pending' || dose.status === 'snoozed';
  const statusColor = STATUS_COLORS[dose.status];
  const dosagePart = dose.medicationDosage ? ` · ${dose.medicationDosage}` : '';

  const content = (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.time}>{formatDoseTime(dose.scheduledAt)}</Text>
          <Text style={styles.name}>
            {dose.medicationName}
            {dosagePart}
          </Text>
          <Text style={styles.doseDetail}>
            {dose.doseAmount} {dose.doseUnit}
            {dose.label ? ` · ${dose.label}` : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{t(`doses.status.${dose.status}`)}</Text>
        </View>
      </View>

      {dose.status === 'snoozed' && dose.snoozedUntil ? (
        <Text style={styles.snoozeHint}>
          {t('doses.snoozedUntil', {
            time: formatDoseTime(dose.snoozedUntil),
          })}
        </Text>
      ) : null}

      {isActionable ? (
        <View style={styles.actions}>
          <Button
            title={t('doses.taken')}
            onPress={onTaken}
            loading={isProcessing}
            style={styles.actionButton}
          />
          <Button
            title={t('doses.skipped')}
            variant="secondary"
            onPress={onSkipped}
            disabled={isProcessing}
            style={styles.actionButton}
          />
          <Button
            title={t('doses.snooze')}
            variant="secondary"
            onPress={onSnoozed}
            disabled={isProcessing}
            style={styles.actionButton}
          />
        </View>
      ) : null}
    </Card>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  time: {
    ...textStyles.label,
    color: colors.primary,
    fontSize: fontSize.lg,
  },
  name: {
    ...textStyles.sectionTitle,
    color: colors.textPrimary,
  },
  doseDetail: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  statusText: {
    ...textStyles.label,
    color: colors.textInverse,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  snoozeHint: {
    ...textStyles.bodySmall,
    color: colors.info,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 90,
  },
});
