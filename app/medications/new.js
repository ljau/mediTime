import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MedicationForm, {
  formValuesToInput,
  validateMedicationForm,
} from '../../components/medications/MedicationForm';
import Button from '../../components/ui/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { useDatabase } from '../../context/DatabaseContext';
import { createMedication } from '../../database/repositories/medications';
import { checkRefillReminder } from '../../services/inventory/inventoryService';
import { checkExpirationReminder } from '../../services/expiration';

const INITIAL_FORM = {
  name: '',
  dosage: '',
  quantity: '',
  refillThreshold: '7',
  expirationDate: '',
  notes: '',
};

export default function AddMedicationScreen() {
  const router = useRouter();
  const { db } = useDatabase();
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(values) {
    setFormValues(values);
    setFormErrors(validateMedicationForm(values));
  }

  async function handleSave() {
    const errors = validateMedicationForm(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!db) return;

    setIsSaving(true);

    try {
      const medication = await createMedication(db, formValuesToInput(formValues));
      await checkRefillReminder(db, medication.id);
      await checkExpirationReminder(db, medication.id);
      router.replace(`/medications/${medication.id}`);
    } catch (err) {
      Alert.alert('Error', err.message ?? 'Could not save medication.');
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
        <Text style={styles.description}>
          Enter the medication details below. You can update them anytime.
        </Text>

        <MedicationForm onChange={handleChange} />

        {Object.keys(formErrors).length > 0 ? (
          <Text style={styles.validationHint}>
            Please fix the highlighted fields before saving.
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Save Medication"
            onPress={handleSave}
            loading={isSaving}
            disabled={Object.keys(formErrors).length > 0}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => router.back()}
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
