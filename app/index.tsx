import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import NextDoseCard from '../components/dashboard/NextDoseCard';
import StatCard from '../components/dashboard/StatCard';
import DoseActionCard from '../components/doses/DoseActionCard';
import LanguageToggle from '../components/ui/LanguageToggle';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/spacing';
import { fontSize, textStyles } from '../constants/typography';
import { useDashboard } from '../hooks/useDashboard';
import { useDoseActions } from '../hooks/useDoseActions';
import { useIdempotentCallback } from '../hooks/useIdempotentCallback';
import { useIdempotentRouter } from '../hooks/useIdempotentRouter';
import { withReturnTo } from '../types/navigation';
import { getAppLocale } from '../i18n';

function getGreetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return 'greeting.morning';
  if (hour < 17) return 'greeting.afternoon';
  return 'greeting.evening';
}

function formatTodayDate(locale: string) {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const { push } = useIdempotentRouter();
  const { t } = useTranslation();
  const { stats, isLoading, error, refresh } = useDashboard();
  const { markTaken, markSkipped, markSnoozed, isProcessing } = useDoseActions(refresh);
  const locale = getAppLocale();
  const handleRetry = useIdempotentCallback(refresh);
  const goToNewMedication = useIdempotentCallback(() =>
    push(withReturnTo('/medications/new', '/'))
  );
  const goToAllMedications = useIdempotentCallback(() => push('/medications'));

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const todayLabel = formatTodayDate(locale);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>MediTime</Text>
            <View style={styles.headerRight}>
              <LanguageToggle />
              <Text style={styles.greeting}>{t(getGreetingKey())}</Text>
              <Text style={styles.date}>{todayLabel}</Text>
            </View>
          </View>

          {isLoading && !stats ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>{t('home.couldNotLoadDashboard')}</Text>
              <Text style={styles.errorBody}>{error.message}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
                onPress={handleRetry}
              >
                <Text style={styles.retryText}>{t('common.tryAgain')}</Text>
              </Pressable>
            </View>
          ) : stats ? (
            <>
              <NextDoseCard
                dose={stats.nextDose}
                onPress={
                  stats.nextDose
                    ? () =>
                        push(
                          withReturnTo(
                            `/medications/${stats.nextDose!.medicationId}`,
                            '/'
                          )
                        )
                    : undefined
                }
              />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('doses.todayTitle')}</Text>
                {stats.todayDoses.length === 0 ? (
                  <Text style={styles.emptyHint}>{t('doses.noneToday')}</Text>
                ) : (
                  stats.todayDoses.map((dose) => (
                    <DoseActionCard
                      key={`${dose.scheduleId}:${dose.scheduledAt}`}
                      dose={dose}
                      isProcessing={isProcessing}
                      onPress={() =>
                        push(withReturnTo(`/medications/${dose.medicationId}`, '/'))
                      }
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
                <Text style={styles.sectionTitle}>{t('home.todaysOverview')}</Text>
                <View style={styles.statGrid}>
                  <StatCard
                    label={t('home.totalMeds')}
                    value={stats.totalMedications}
                    caption={t('home.medicationTracked', { count: stats.totalMedications })}
                    icon="💊"
                    tone="primary"
                    onPress={() => push('/medications')}
                  />
                  <StatCard
                    label={t('home.dueToday')}
                    value={stats.medicationsDueToday}
                    caption={t('home.doseScheduled', { count: stats.dosesDueToday })}
                    icon="📅"
                    tone="info"
                  />
                  <StatCard
                    label={t('home.missed')}
                    value={stats.missedDosesToday}
                    caption={
                      stats.missedDosesToday === 0
                        ? t('home.onTrackToday')
                        : t('home.doseMissedToday', { count: stats.missedDosesToday })
                    }
                    icon="⚠️"
                    tone={stats.missedDosesToday > 0 ? 'error' : 'success'}
                  />
                  <StatCard
                    label={t('home.lowStock')}
                    value={stats.lowStockCount}
                    caption={
                      stats.lowStockCount === 0
                        ? t('home.allStockedUp')
                        : t('home.needsRefill', { count: stats.lowStockCount })
                    }
                    icon="📦"
                    tone={stats.lowStockCount > 0 ? 'warning' : 'default'}
                    onPress={() => push('/medications')}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('home.alerts')}</Text>
                <StatCard
                  label={t('home.expiringSoon')}
                  value={stats.expiringCount}
                  caption={
                    stats.expiringCount === 0
                      ? t('home.nothingExpiring')
                      : t('home.medicationWithin30Days', { count: stats.expiringCount })
                  }
                  icon="⏳"
                  tone={stats.expiringCount > 0 ? 'warning' : 'default'}
                  onPress={() => push('/medications')}
                  style={styles.fullWidthCard}
                />
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryAction,
                    pressed && styles.primaryActionPressed,
                  ]}
                  onPress={goToNewMedication}
                >
                  <Text style={styles.primaryActionText}>{t('home.addMedication')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.secondaryActionPressed,
                  ]}
                  onPress={goToAllMedications}
                >
                  <Text style={styles.secondaryActionText}>{t('home.viewAllMedications')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.secondaryActionPressed,
                  ]}
                  onPress={() => push('/history')}
                >
                  <Text style={styles.secondaryActionText}>{t('history.viewAll')}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
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
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  greeting: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    ...textStyles.screenTitle,
    color: colors.primary,
    fontSize: fontSize.xxxl,
  },
  date: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.sm,
  },
  errorTitle: {
    ...textStyles.sectionTitle,
    color: colors.error,
  },
  errorBody: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryPressed: {
    opacity: 0.85,
  },
  retryText: {
    ...textStyles.label,
    color: colors.textInverse,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...textStyles.sectionTitle,
    color: colors.textPrimary,
  },
  emptyHint: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fullWidthCard: {
    minWidth: '100%',
    flex: undefined,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  primaryActionPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryActionText: {
    ...textStyles.label,
    color: colors.textInverse,
    fontSize: fontSize.lg,
  },
  secondaryAction: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionPressed: {
    backgroundColor: colors.borderLight,
  },
  secondaryActionText: {
    ...textStyles.label,
    color: colors.primary,
    fontSize: fontSize.lg,
  },
});
