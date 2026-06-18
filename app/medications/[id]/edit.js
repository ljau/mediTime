import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MedicationForm, {
  formValuesToInput,
  validateMedicationForm,
} from '../../../components/medications/MedicationForm';
import Button from '../../../components/ui/Button';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { textStyles } from '../../../constants/typography';
import { useDatabase } from '../../../context/DatabaseContext';
import { updateMedication } from '../../../database/repositories/medications';
import { checkRefillReminder } from '../../../services/inventory/inventoryService';
import { checkExpirationReminder } from '../../../services/expiration';
import { useMedication } from '../../../hooks/useMedication';

export default function EditMedicationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const medicationId = Array.isArray(id) ? id[0] : id;
  const { db } = useDatabase();
  const { medication, isLoading, error } = useMedication(medicationId);
  const [formValues, setFormValues] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(values) {
    setFormValues(values);
    setFormErrors(validateMedicationForm(values));
  }

  async function handleSave() {
    if (!formValues) return;

    const errors = validateMedicationForm(formValues);
    setFormErrors(errors);

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
        Alert.alert('Error', 'Medication not found.');
        return;
      }

      await checkRefillReminder(db, medicationId, { previousCount });
      await checkExpirationReminder(db, medicationId);
      router.replace(`/medications/${medicationId}`);
    } catch (err) {
      Alert.alert('Error', err.message ?? 'Could not update medication.');
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
        <Text style={styles.errorText}>Medication not found.</Text>
        <Button
          title="Back to list"
          variant="secondary"
          onPress={() => router.replace('/medications')}
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
        <Text style={styles.description}>
          Update the medication details below.
        </Text>

        <MedicationForm
          key={medication.id}
          initialValues={medication}
          onChange={handleChange}
        />

        {Object.keys(formErrors).length > 0 ? (
          <Text style={styles.validationHint}>
            Please fix the highlighted fields before saving.
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={isSaving}
            disabled={!formValues || Object.keys(formErrors).length > 0}
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
