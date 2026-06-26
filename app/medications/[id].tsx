import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import DoseActionCard from '../../components/doses/DoseActionCard';
import LowStockBadge from '../../components/medications/LowStockBadge';
import ExpirationStatusIndicator from '../../components/medications/ExpirationStatusIndicator';
import ExpiredBadge from '../../components/medications/ExpiredBadge';
import ExpiringSoonBadge from '../../components/medications/ExpiringSoonBadge';
import StockStatusIndicator from '../../components/medications/StockStatusIndicator';
import ScheduleListItem from '../../components/schedules/ScheduleListItem';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { useDatabase } from '../../context/DatabaseContext';
import { deleteMedication } from '../../database/repositories/medications';
import { useDoseActions } from '../../hooks/useDoseActions';
import { useIdempotentRouter } from '../../hooks/useIdempotentRouter';
import { useMedicationDetail } from '../../hooks/useMedicationDetail';
import { cancelMedicationNotifications } from '../../services/notifications';
import {
  pauseSchedule,
  removeSchedule,
  resumeScheduleById,
} from '../../services/schedules';
import {
  parseReturnTo,
  RETURN_TO_PARAM,
  withReturnTo,
} from '../../types/navigation';
import { EXPIRATION_STATUS, getExpirationStatus, getStockStatus, getTodayIsoDate } from '../../utils/inventory';
import { formatDoseDateLabel, formatDoseTime } from '../../utils/schedules';

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function MedicationDetailsScreen() {
  const { push, replace } = useIdempotentRouter();
  const { t } = useTranslation();
  const { id, [RETURN_TO_PARAM]: returnToParam } = useLocalSearchParams();
  const medicationId = Array.isArray(id) ? id[0] : id;
  const returnTo = parseReturnTo(returnToParam);
  const backHref = returnTo ?? '/medications';
  const { db } = useDatabase();
  const { data, isLoading, error, refresh } = useMedicationDetail(medicationId);
  const { markTaken, markSkipped, markSnoozed, isProcessing } = useDoseActions(refresh);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function confirmDelete() {
    Alert.alert(
      t('medications.deleteConfirmTitle'),
      t('medications.deleteConfirmMessage', { name: data?.medication.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    if (!db || !medicationId) return;

    setIsDeleting(true);

    try {
      await cancelMedicationNotifications(db, medicationId);
      await deleteMedication(db, medicationId);
      replace(backHref);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('medications.couldNotDelete');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsDeleting(false);
    }
  }

  function confirmScheduleDelete(scheduleId: string) {
    Alert.alert(t('schedules.deleteConfirmTitle'), t('schedules.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!db) return;
          await removeSchedule(db, scheduleId);
          refresh();
        },
      },
    ]);
  }

  async function handlePauseSchedule(scheduleId: string) {
    if (!db) return;
    await pauseSchedule(db, scheduleId);
    refresh();
  }

  async function handleResumeSchedule(scheduleId: string) {
    if (!db) return;
    await resumeScheduleById(db, scheduleId);
    refresh();
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('medications.notFound')}</Text>
        <Button
          title={t('medications.backToList')}
          variant="secondary"
          onPress={() => replace(backHref)}
        />
      </View>
    );
  }

  const { medication, schedules, todayDoses, recentLogs } = data;
  const stockStatus = getStockStatus(medication);
  const expirationStatus = getExpirationStatus(medication);
  const lowStock = stockStatus === 'LOW_STOCK';
  const expired = expirationStatus === EXPIRATION_STATUS.EXPIRED;
  const expiringSoon = expirationStatus === EXPIRATION_STATUS.EXPIRING_SOON;
  const today = getTodayIsoDate();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card>
          <Text style={styles.title}>{medication.name}</Text>

          {(lowStock || expired || expiringSoon) && (
            <View style={styles.statusRow}>
              {lowStock ? <LowStockBadge /> : null}
              {expired ? <ExpiredBadge /> : null}
              {expiringSoon ? <ExpiringSoonBadge /> : null}
            </View>
          )}

          <StockStatusIndicator
            stockStatus={stockStatus}
            quantity={medication.quantity}
            refillThreshold={medication.refillThreshold}
          />

          <ExpirationStatusIndicator
            expirationStatus={expirationStatus}
            expirationDate={medication.expirationDate}
          />

          <DetailRow label={t('medications.dosage')} value={medication.dosage} />
          <DetailRow label={t('medications.quantity')} value={String(medication.quantity)} />
          <DetailRow
            label={t('medications.refillThreshold')}
            value={String(medication.refillThreshold)}
          />
          <DetailRow label={t('medications.notes')} value={medication.notes} />
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('doses.todayTitle')}</Text>
          {todayDoses.length === 0 ? (
            <Text style={styles.emptyHint}>{t('doses.noneToday')}</Text>
          ) : (
            todayDoses.map((dose) => (
              <DoseActionCard
                key={`${dose.scheduleId}:${dose.scheduledAt}`}
                dose={dose}
                isProcessing={isProcessing}
                onTaken={() =>
                  markTaken({
                    medicationId: dose.medicationId,
                    scheduleId: dose.scheduleId,
                    scheduledAt: dose.scheduledAt,
                    logId: dose.logId ?? undefined,
                    doseAmount: dose.doseAmount,
                    doseUnit: dose.doseUnit,
                  })
                }
                onSkipped={() =>
                  markSkipped({
                    medicationId: dose.medicationId,
                    scheduleId: dose.scheduleId,
                    scheduledAt: dose.scheduledAt,
                    logId: dose.logId ?? undefined,
                    doseAmount: dose.doseAmount,
                    doseUnit: dose.doseUnit,
                  })
                }
                onSnoozed={() =>
                  markSnoozed({
                    medicationId: dose.medicationId,
                    scheduleId: dose.scheduleId,
                    scheduledAt: dose.scheduledAt,
                    logId: dose.logId ?? undefined,
                    doseAmount: dose.doseAmount,
                    doseUnit: dose.doseUnit,
                  })
                }
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('schedules.title')}</Text>
            <Button
              title={t('schedules.add')}
              variant="secondary"
              onPress={() =>
                push(
                  returnTo
                    ? withReturnTo(
                        `/medications/${medication.id}/schedules/new`,
                        returnTo
                      )
                    : `/medications/${medication.id}/schedules/new`
                )
              }
              style={styles.addButton}
            />
          </View>
          {schedules.length === 0 ? (
            <Text style={styles.emptyHint}>{t('schedules.empty')}</Text>
          ) : (
            schedules.map((schedule) => (
              <ScheduleListItem
                key={schedule.id}
                schedule={schedule}
                onPress={() =>
                  push(
                    returnTo
                      ? withReturnTo(
                          `/medications/${medication.id}/schedules/${schedule.id}/edit`,
                          returnTo
                        )
                      : `/medications/${medication.id}/schedules/${schedule.id}/edit`
                  )
                }
                onPause={() => handlePauseSchedule(schedule.id)}
                onResume={() => handleResumeSchedule(schedule.id)}
                onDelete={() => confirmScheduleDelete(schedule.id)}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('history.recentTitle')}</Text>
          {recentLogs.length === 0 ? (
            <Text style={styles.emptyHint}>{t('history.empty')}</Text>
          ) : (
            recentLogs.map((log) => (
              <Card key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>
                    {formatDoseDateLabel(log.scheduledAt, today)}{' '}
                    {formatDoseTime(log.scheduledAt)}
                  </Text>
                  <Text style={styles.logStatus}>{t(`doses.status.${log.status}`)}</Text>
                </View>
                <Text style={styles.logDose}>
                  {log.doseAmount} {log.doseUnit}
                </Text>
                {log.takenAt ? (
                  <Text style={styles.logTaken}>
                    {t('history.taken')}: {formatDoseTime(log.takenAt)}
                  </Text>
                ) : null}
              </Card>
            ))
          )}
          <Button
            title={t('history.viewAll')}
            variant="secondary"
            onPress={() => push('/history')}
          />
        </View>

        <View style={styles.actions}>
          <Button
            title={t('medications.editMedication')}
            onPress={() =>
              push(
                returnTo
                  ? withReturnTo(`/medications/${medication.id}/edit`, returnTo)
                  : `/medications/${medication.id}/edit`
              )
            }
          />
          <Button
            title={t('medications.deleteMedication')}
            variant="danger"
            onPress={confirmDelete}
            loading={isDeleting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
    textAlign: 'center',
  },
  title: {
    ...textStyles.screenTitle,
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailRow: {
    gap: spacing.xxs,
  },
  detailLabel: {
    ...textStyles.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    ...textStyles.sectionTitle,
    color: colors.textPrimary,
  },
  addButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  emptyHint: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  logCard: {
    gap: spacing.xxs,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDate: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
  logStatus: {
    ...textStyles.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  logDose: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  logTaken: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.md,
  },
});
