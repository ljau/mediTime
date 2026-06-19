import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import TextInput from '../ui/TextInput';
import { spacing } from '../../constants/spacing';
import i18n from '../../i18n';
import type { MedicationInput, MedicationRecord } from '../../types/app';

export interface MedicationFormValues {
  name: string;
  dosage: string;
  quantity: string;
  refillThreshold: string;
  expirationDate: string;
  notes: string;
}

export type MedicationFormErrors = Partial<Record<keyof MedicationFormValues, string>>;

const EMPTY_FORM: MedicationFormValues = {
  name: '',
  dosage: '',
  quantity: '',
  refillThreshold: '7',
  expirationDate: '',
  notes: '',
};

function toFormValues(medication?: MedicationRecord | null): MedicationFormValues {
  if (!medication) return EMPTY_FORM;

  return {
    name: medication.name ?? '',
    dosage: medication.dosage ?? '',
    quantity: String(medication.quantity ?? ''),
    refillThreshold: String(medication.refillThreshold ?? '7'),
    expirationDate: medication.expirationDate ?? '',
    notes: medication.notes ?? '',
  };
}

function validate(values: MedicationFormValues): MedicationFormErrors {
  const errors: MedicationFormErrors = {};

  if (!values.name.trim()) {
    errors.name = i18n.t('form.nameRequired');
  }

  if (values.quantity.trim() === '') {
    errors.quantity = i18n.t('form.quantityRequired');
  } else if (!/^\d+$/.test(values.quantity.trim())) {
    errors.quantity = i18n.t('form.wholeNumber');
  }

  if (values.refillThreshold.trim() === '') {
    errors.refillThreshold = i18n.t('form.refillThresholdRequired');
  } else if (!/^\d+$/.test(values.refillThreshold.trim())) {
    errors.refillThreshold = i18n.t('form.wholeNumber');
  }

  if (
    values.expirationDate.trim() &&
    !/^\d{4}-\d{2}-\d{2}$/.test(values.expirationDate.trim())
  ) {
    errors.expirationDate = i18n.t('form.dateFormat');
  }

  return errors;
}

export function formValuesToInput(values: MedicationFormValues): MedicationInput {
  return {
    name: values.name,
    dosage: values.dosage,
    quantity: parseInt(values.quantity, 10),
    refillThreshold: parseInt(values.refillThreshold, 10),
    expirationDate: values.expirationDate.trim() || null,
    notes: values.notes,
  };
}

interface MedicationFormProps {
  initialValues?: MedicationRecord | null;
  onChange?: (values: MedicationFormValues, errors: MedicationFormErrors) => void;
}

export default function MedicationForm({ initialValues, onChange }: MedicationFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => toFormValues(initialValues));
  const [errors, setErrors] = useState<MedicationFormErrors>({});

  useEffect(() => {
    const nextValues = toFormValues(initialValues);
    setValues(nextValues);
    const nextErrors = validate(nextValues);
    setErrors(nextErrors);
    onChange?.(nextValues, nextErrors);
  }, [initialValues, onChange]);

  function updateField(field: keyof MedicationFormValues, value: string) {
    const nextValues = { ...values, [field]: value };
    const nextErrors = validate(nextValues);
    setValues(nextValues);
    setErrors(nextErrors);
    onChange?.(nextValues, nextErrors);
  }

  return (
    <View style={styles.form}>
      <TextInput
        label={t('form.name')}
        value={values.name}
        onChangeText={(text) => updateField('name', text)}
        placeholder={t('form.namePlaceholder')}
        autoCapitalize="words"
        error={errors.name}
      />

      <TextInput
        label={t('form.dosage')}
        value={values.dosage}
        onChangeText={(text) => updateField('dosage', text)}
        placeholder={t('form.dosagePlaceholder')}
        error={errors.dosage}
      />

      <TextInput
        label={t('form.quantity')}
        value={values.quantity}
        onChangeText={(text) => updateField('quantity', text)}
        placeholder={t('form.quantityPlaceholder')}
        keyboardType="number-pad"
        error={errors.quantity}
      />

      <TextInput
        label={t('form.refillThreshold')}
        value={values.refillThreshold}
        onChangeText={(text) => updateField('refillThreshold', text)}
        placeholder={t('form.refillThresholdPlaceholder')}
        keyboardType="number-pad"
        error={errors.refillThreshold}
      />

      <TextInput
        label={t('form.expirationDate')}
        value={values.expirationDate}
        onChangeText={(text) => updateField('expirationDate', text)}
        placeholder={t('form.expirationDatePlaceholder')}
        autoCapitalize="none"
        error={errors.expirationDate}
      />

      <TextInput
        label={t('form.notes')}
        value={values.notes}
        onChangeText={(text) => updateField('notes', text)}
        placeholder={t('form.notesPlaceholder')}
        multiline
        numberOfLines={4}
        style={styles.notesInput}
        error={errors.notes}
      />
    </View>
  );
}

export { validate as validateMedicationForm };

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
