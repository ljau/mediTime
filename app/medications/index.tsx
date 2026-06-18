import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExpirationAlertBanner from '../../components/medications/ExpirationAlertBanner';
import MedicationEmptyState from '../../components/medications/MedicationEmptyState';
import MedicationListItem from '../../components/medications/MedicationListItem';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { useExpirationAlerts } from '../../hooks/useExpirationAlerts';
import { useMedications } from '../../hooks/useMedications';

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function MedicationListScreen() {
  const router = useRouter();
  const { medications, isLoading, error, refresh } = useMedications();
  const {
    expired,
    expiringSoon,
    expiredCount,
    expiringSoonCount,
    refresh: refreshExpiration,
  } = useExpirationAlerts();

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshExpiration();
    }, [refresh, refreshExpiration])
  );

  const hasExpirationAlerts = expiredCount > 0 || expiringSoonCount > 0;
  const expiringSoonIds = new Set(expiringSoon.map((medication) => medication.id));
  const listData =
    hasExpirationAlerts && expiringSoonCount > 0
      ? medications.filter((medication) => !expiringSoonIds.has(medication.id))
      : medications;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load medications.</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            medications.length === 0 && styles.emptyListContent,
          ]}
          ListHeaderComponent={
            hasExpirationAlerts ? (
              <View style={styles.alertSection}>
                {expiredCount > 0 ? (
                  <ExpirationAlertBanner
                    tone="error"
                    title={
                      expiredCount === 1
                        ? '1 expired medication'
                        : `${expiredCount} expired medications`
                    }
                    message={
                      expiredCount === 1
                        ? `${expired[0]?.name} has expired. Review and discard safely.`
                        : 'Some medications have passed their expiration date.'
                    }
                  />
                ) : null}

                {expiringSoonCount > 0 ? (
                  <>
                    <SectionHeader title="Expiring soon" />
                    {expiringSoon.map((medication) => (
                      <MedicationListItem
                        key={`expiring-${medication.id}`}
                        medication={medication}
                        onPress={() => router.push(`/medications/${medication.id}`)}
                      />
                    ))}
                  </>
                ) : null}

                {listData.length > 0 ? <SectionHeader title="All medications" /> : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <MedicationListItem
              medication={item}
              onPress={() => router.push(`/medications/${item.id}`)}
            />
          )}
          ListEmptyComponent={<MedicationEmptyState />}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/medications/new')}
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl + spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  alertSection: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    ...textStyles.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
  },
  fabLabel: {
    ...textStyles.screenTitle,
    color: colors.textInverse,
    lineHeight: 32,
  },
});
