import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import MedicationForm, {
  formValuesToInput,
  isMedicationFormValid,
  validateMedicationForm,
  type MedicationFormErrors,
  type MedicationFormValues,
} from '../../../components/medications/MedicationForm';
import Button from '../../../components/ui/Button';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { textStyles } from '../../../constants/typography';
import { useDatabase } from '../../../context/DatabaseContext';
import { updateMedication } from '../../../database/repositories/medications';
import { useIdempotentRouter } from '../../../hooks/useIdempotentRouter';
import { checkRefillReminder } from '../../../services/inventory/inventoryService';
import { checkExpirationReminder } from '../../../services/expiration';
import { useMedication } from '../../../hooks/useMedication';

export default function EditMedicationScreen() {
  const { replace, dismissTo } = useIdempotentRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const medicationId = Array.isArray(id) ? id[0] : id;
  const { db } = useDatabase();
  const { medication, isLoading, error } = useMedication(medicationId);
  const [formValues, setFormValues] = useState<MedicationFormValues | null>(null);
  const [formErrors, setFormErrors] = useState<MedicationFormErrors>({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(values: MedicationFormValues) {
    setFormValues(values);
  }

  async function handleSave() {
    if (!formValues || !medication) return;

    const errors = validateMedicationForm(formValues);
    setFormErrors(errors);
    setShowAllErrors(true);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!db || !medicationId) return;

    setIsSaving(true);

    try {
      const previousCount = medication.quantity;
      const updated = await updateMedication(
        db,
        medicationId,
        formValuesToInput(formValues)
      );

      if (!updated) {
        Alert.alert(t('common.error'), t('medications.notFound'));
        return;
      }

      await checkRefillReminder(db, medicationId, { previousCount });
      await checkExpirationReminder(db, medicationId);
      replace(`/medications/${medicationId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('medications.couldNotUpdate');
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

  if (error || !medication) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('medications.notFound')}</Text>
        <Button
          title={t('medications.backToList')}
          variant="secondary"
          onPress={() => replace('/medications')}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>{t('medications.editDescription')}</Text>

        <MedicationForm
          key={medication.id}
          initialValues={medication}
          onChange={handleChange}
          showAllErrors={showAllErrors}
        />

        {showAllErrors && Object.keys(formErrors).length > 0 ? (
          <Text style={styles.validationHint}>{t('medications.fixFieldsHint')}</Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={t('medications.saveChanges')}
            onPress={handleSave}
            loading={isSaving}
            disabled={!formValues || isSaving || !isMedicationFormValid(formValues)}
          />
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() =>
              medicationId ? dismissTo(`/medications/${medicationId}`) : dismissTo('/medications')
            }
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
    textAlign: 'center',
  },
  description: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  validationHint: {
    ...textStyles.bodySmall,
    color: colors.error,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
