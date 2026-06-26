import { useCallback, useEffect, useState } from 'react';
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
import HistoryListItem from '../../components/history/HistoryListItem';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { useHistory } from '../../hooks/useHistory';
import { useMedications } from '../../hooks/useMedications';
import type { HistoryFilter } from '../../types/app';

const FILTERS: HistoryFilter[] = ['today', '7days', '30days', 'medication'];

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<HistoryFilter>('7days');
  const [medicationId, setMedicationId] = useState<string | undefined>();
  const { medications } = useMedications();
  const { entries, isLoading, error, refresh } = useHistory(filter, medicationId);

  useEffect(() => {
    if (filter === 'medication' && !medicationId && medications.length > 0) {
      setMedicationId(medications[0].id);
    }
  }, [filter, medicationId, medications]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.filterRow}>
          {FILTERS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.filterChip, filter === key && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterText, filter === key && styles.filterTextActive]}
              >
                {t(`history.filters.${key}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {filter === 'medication' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medFilter}>
            <View style={styles.medFilterRow}>
              {medications.map((med) => (
                <Pressable
                  key={med.id}
                  onPress={() => setMedicationId(med.id)}
                  style={[
                    styles.filterChip,
                    medicationId === med.id && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      medicationId === med.id && styles.filterTextActive,
                    ]}
                  >
                    {med.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <Text style={styles.error}>{t('history.couldNotLoad')}</Text>
        ) : entries.length === 0 ? (
          <Text style={styles.empty}>{t('history.empty')}</Text>
        ) : (
          <View style={styles.list}>
            {entries.map((entry) => (
              <HistoryListItem key={entry.id} entry={entry} />
            ))}
          </View>
        )}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    ...textStyles.label,
    color: colors.textPrimary,
  },
  filterTextActive: {
    color: colors.textInverse,
  },
  medFilter: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  medFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  loading: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  error: {
    ...textStyles.body,
    color: colors.error,
  },
  empty: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
  list: {
    gap: spacing.md,
  },
});
