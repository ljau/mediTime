import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScheduleForm, {
  formValuesToScheduleInput,
  isScheduleFormValid,
  type ScheduleFormValues,
} from '../../../../components/schedules/ScheduleForm';
import Button from '../../../../components/ui/Button';
import { colors } from '../../../../constants/colors';
import { spacing } from '../../../../constants/spacing';
import { textStyles } from '../../../../constants/typography';
import { useDatabase } from '../../../../context/DatabaseContext';
import { useIdempotentRouter } from '../../../../hooks/useIdempotentRouter';
import { saveSchedule } from '../../../../services/schedules';
import { parseReturnTo, RETURN_TO_PARAM } from '../../../../types/navigation';

export default function NewScheduleScreen() {
  const { replace, dismissTo } = useIdempotentRouter();
  const params = useLocalSearchParams();
  const medicationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const returnTo = parseReturnTo(params[RETURN_TO_PARAM]);
  const backHref = returnTo ?? (medicationId ? `/medications/${medicationId}` : '/medications');
  const { t } = useTranslation();
  const { db } = useDatabase();
  const [formValues, setFormValues] = useState<ScheduleFormValues | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!db || !medicationId || !formValues || !isScheduleFormValid(formValues, t)) return;

    setIsSaving(true);

    try {
      await saveSchedule(db, formValuesToScheduleInput(medicationId, formValues));
      replace(backHref);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('schedules.couldNotSave');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!medicationId) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>{t('schedules.addDescription')}</Text>

        <ScheduleForm
          medicationId={medicationId}
          onChange={(values, valid) => {
            setFormValues(values);
            setIsValid(valid);
          }}
        />

        <View style={styles.actions}>
          <Button
            title={t('schedules.saveSchedule')}
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
  description: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
