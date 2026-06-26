import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import MedicationForm, {
  formValuesToInput,
  isMedicationFormValid,
  validateMedicationForm,
  type MedicationFormErrors,
  type MedicationFormValues,
} from '../../components/medications/MedicationForm';
import Button from '../../components/ui/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { useDatabase } from '../../context/DatabaseContext';
import { createMedication } from '../../database/repositories/medications';
import { useIdempotentRouter } from '../../hooks/useIdempotentRouter';
import { checkRefillReminder } from '../../services/inventory/inventoryService';
import { checkExpirationReminder } from '../../services/expiration';

const INITIAL_FORM: MedicationFormValues = {
  name: '',
  dosage: '',
  quantity: '',
  refillThreshold: '',
  expirationDate: '',
  notes: '',
};

export default function AddMedicationScreen() {
  const { replace, dismissTo } = useIdempotentRouter();
  const { t } = useTranslation();
  const { db } = useDatabase();
  const [formValues, setFormValues] = useState<MedicationFormValues>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<MedicationFormErrors>({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(values: MedicationFormValues) {
    setFormValues(values);
  }

  async function handleSave() {
    const errors = validateMedicationForm(formValues);
    setFormErrors(errors);
    setShowAllErrors(true);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!db) return;

    setIsSaving(true);

    try {
      const medication = await createMedication(db, formValuesToInput(formValues));
      await checkRefillReminder(db, medication.id);
      await checkExpirationReminder(db, medication.id);
      replace(`/medications/${medication.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('medications.couldNotSave');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>{t('medications.addDescription')}</Text>

        <MedicationForm onChange={handleChange} showAllErrors={showAllErrors} />

        {showAllErrors && Object.keys(formErrors).length > 0 ? (
          <Text style={styles.validationHint}>{t('medications.fixFieldsHint')}</Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={t('medications.saveMedication')}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving || !isMedicationFormValid(formValues)}
          />
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => dismissTo('/medications')}
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
  validationHint: {
    ...textStyles.bodySmall,
    color: colors.error,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
