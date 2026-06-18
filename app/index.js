import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import NextDoseCard from '../components/dashboard/NextDoseCard';
import StatCard from '../components/dashboard/StatCard';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/spacing';
import { fontSize, textStyles } from '../constants/typography';
import { useDashboard } from '../hooks/useDashboard';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { stats, isLoading, error, refresh } = useDashboard();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const todayLabel = formatTodayDate();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>MediTime</Text>
            <View style={styles.headerRight}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.date}>{todayLabel}</Text>
            </View>
          </View>

          {isLoading && !stats ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Could not load dashboard</Text>
              <Text style={styles.errorBody}>{error.message}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
                onPress={refresh}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : stats ? (
            <>
              <NextDoseCard
                dose={stats.nextDose}
                onPress={
                  stats.nextDose
                    ? () => router.push(`/medications/${stats.nextDose.medicationId}`)
                    : undefined
                }
              />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today&apos;s overview</Text>
                <View style={styles.statGrid}>
                  <StatCard
                    label="Total meds"
                    value={stats.totalMedications}
                    caption={
                      stats.totalMedications === 1 ? 'medication tracked' : 'medications tracked'
                    }
                    icon="💊"
                    tone="primary"
                    onPress={() => router.push('/medications')}
                  />
                  <StatCard
                    label="Due today"
                    value={stats.medicationsDueToday}
                    caption={
                      stats.dosesDueToday === 1
                        ? '1 dose scheduled'
                        : `${stats.dosesDueToday} doses scheduled`
                    }
                    icon="📅"
                    tone="info"
                  />
                  <StatCard
                    label="Missed"
                    value={stats.missedDosesToday}
                    caption={
                      stats.missedDosesToday === 0
                        ? 'On track today'
                        : stats.missedDosesToday === 1
                          ? 'dose missed today'
                          : 'doses missed today'
                    }
                    icon="⚠️"
                    tone={stats.missedDosesToday > 0 ? 'error' : 'success'}
                  />
                  <StatCard
                    label="Low stock"
                    value={stats.lowStockCount}
                    caption={
                      stats.lowStockCount === 0
                        ? 'All stocked up'
                        : stats.lowStockCount === 1
                          ? 'needs refill'
                          : 'need refill'
                    }
                    icon="📦"
                    tone={stats.lowStockCount > 0 ? 'warning' : 'default'}
                    onPress={() => router.push('/medications')}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alerts</Text>
                <StatCard
                  label="Expiring soon"
                  value={stats.expiringCount}
                  caption={
                    stats.expiringCount === 0
                      ? 'Nothing expiring in the next 30 days'
                      : stats.expiringCount === 1
                        ? 'medication within 30 days'
                        : 'medications within 30 days'
                  }
                  icon="⏳"
                  tone={stats.expiringCount > 0 ? 'warning' : 'default'}
                  onPress={() => router.push('/medications')}
                  style={styles.fullWidthCard}
                />
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryAction,
                    pressed && styles.primaryActionPressed,
                  ]}
                  onPress={() => router.push('/medications/new')}
                >
                  <Text style={styles.primaryActionText}>Add medication</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.secondaryActionPressed,
                  ]}
                  onPress={() => router.push('/medications')}
                >
                  <Text style={styles.secondaryActionText}>View all medications</Text>
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
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
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
