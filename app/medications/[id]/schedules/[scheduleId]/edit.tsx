import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScheduleForm, {
  formValuesToScheduleInput,
  isScheduleFormValid,
  type ScheduleFormValues,
} from '../../../../../components/schedules/ScheduleForm';
import Button from '../../../../../components/ui/Button';
import { colors } from '../../../../../constants/colors';
import { spacing } from '../../../../../constants/spacing';
import { textStyles } from '../../../../../constants/typography';
import { useDatabase } from '../../../../../context/DatabaseContext';
import { getScheduleById } from '../../../../../database/repositories/schedules';
import { useIdempotentRouter } from '../../../../../hooks/useIdempotentRouter';
import { editSchedule } from '../../../../../services/schedules';
import { parseReturnTo, RETURN_TO_PARAM } from '../../../../../types/navigation';
import type { ScheduleRecord } from '../../../../../types/app';

export default function EditScheduleScreen() {
  const { replace, dismissTo } = useIdempotentRouter();
  const params = useLocalSearchParams();
  const medicationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const scheduleId = Array.isArray(params.scheduleId) ? params.scheduleId[0] : params.scheduleId;
  const returnTo = parseReturnTo(params[RETURN_TO_PARAM]);
  const backHref = returnTo ?? (medicationId ? `/medications/${medicationId}` : '/medications');
  const { t } = useTranslation();
  const { db } = useDatabase();
  const [schedule, setSchedule] = useState<ScheduleRecord | null>(null);
  const [formValues, setFormValues] = useState<ScheduleFormValues | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSchedule = useCallback(async () => {
    if (!db || !scheduleId) return;

    setIsLoading(true);
    try {
      const row = await getScheduleById(db, scheduleId);
      setSchedule(row);
    } finally {
      setIsLoading(false);
    }
  }, [db, scheduleId]);

  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, [loadSchedule])
  );

  async function handleSave() {
    if (!db || !scheduleId || !formValues || !isScheduleFormValid(formValues, t)) return;

    setIsSaving(true);

    try {
      await editSchedule(db, scheduleId, formValuesToScheduleInput(medicationId!, formValues));
      replace(backHref);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('schedules.couldNotSave');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!schedule || !medicationId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('schedules.notFound')}</Text>
        <Button title={t('common.goBack')} variant="secondary" onPress={() => dismissTo(backHref)} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>{t('schedules.editDescription')}</Text>

        <ScheduleForm
          medicationId={medicationId}
          initialSchedule={schedule}
          onChange={(values, valid) => {
            setFormValues(values);
            setIsValid(valid);
          }}
        />

        <View style={styles.actions}>
          <Button
            title={t('schedules.saveChanges')}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving || !isValid}
          />
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => dismissTo(backHref)}
            disabled={isSaving}
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
  },
  description: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
