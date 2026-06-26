import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import type { HistoryEntry } from '../../types/app';
import { formatDoseDateLabel, formatDoseTime } from '../../utils/schedules';
import { getTodayIsoDate } from '../../utils/inventory';

interface HistoryListItemProps {
  entry: HistoryEntry;
}

export default function HistoryListItem({ entry }: HistoryListItemProps) {
  const { t } = useTranslation();
  const today = getTodayIsoDate();
  const dateLabel = formatDoseDateLabel(entry.scheduledAt, today);
  const scheduledTime = formatDoseTime(entry.scheduledAt);
  const takenTime = entry.takenAt ? formatDoseTime(entry.takenAt) : null;
  const dosagePart = entry.medicationDosage ? ` · ${entry.medicationDosage}` : '';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>
          {entry.medicationName}
          {dosagePart}
        </Text>
        <Text style={[styles.status, statusStyles[entry.status]]}>
          {t(`doses.status.${entry.status}`)}
        </Text>
      </View>
      <Text style={styles.row}>
        {t('history.scheduled')}: {dateLabel} {scheduledTime}
      </Text>
      {takenTime ? (
        <Text style={styles.row}>
          {t('history.taken')}: {takenTime}
        </Text>
      ) : null}
      <Text style={styles.dose}>
        {entry.doseAmount} {entry.doseUnit}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    ...textStyles.sectionTitle,
    color: colors.textPrimary,
    flex: 1,
  },
  status: {
    ...textStyles.label,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  row: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  dose: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
});

const statusStyles = StyleSheet.create({
  taken: { color: colors.taken },
  missed: { color: colors.missed },
  skipped: { color: colors.skipped },
  pending: { color: colors.pending },
});
