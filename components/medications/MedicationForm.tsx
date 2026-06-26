import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateInput from '../ui/DateInput';
import TextInput from '../ui/TextInput';
import { spacing } from '../../constants/spacing';
import i18n from '../../i18n';
import type { MedicationInput, MedicationRecord } from '../../types/app';
import { isValidIsoDate } from '../../utils/dates';

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

  if (values.expirationDate.trim() && !isValidIsoDate(values.expirationDate.trim())) {
    errors.expirationDate = i18n.t('form.dateFormat');
  }

  return errors;
}

export function isMedicationFormValid(values: MedicationFormValues): boolean {
  return Object.keys(validate(values)).length === 0;
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
  onChange?: (values: MedicationFormValues) => void;
  showAllErrors?: boolean;
}

function visibleErrors(
  allErrors: MedicationFormErrors,
  touched: Partial<Record<keyof MedicationFormValues, boolean>>,
  showAllErrors: boolean
): MedicationFormErrors {
  if (showAllErrors) return allErrors;

  const visible: MedicationFormErrors = {};
  for (const key of Object.keys(allErrors) as (keyof MedicationFormValues)[]) {
    if (touched[key]) {
      visible[key] = allErrors[key];
    }
  }
  return visible;
}

export default function MedicationForm({
  initialValues,
  onChange,
  showAllErrors = false,
}: MedicationFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => toFormValues(initialValues));
  const [touched, setTouched] = useState<
    Partial<Record<keyof MedicationFormValues, boolean>>
  >({});

  const errors = visibleErrors(validate(values), touched, showAllErrors);

  function updateField(field: keyof MedicationFormValues, value: string) {
    const nextValues = { ...values, [field]: value };
    setTouched((current) => ({ ...current, [field]: true }));
    setValues(nextValues);
    onChange?.(nextValues);
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

      <DateInput
        label={t('form.expirationDate')}
        value={values.expirationDate}
        onChange={(date) => updateField('expirationDate', date)}
        placeholder={t('form.expirationDatePlaceholder')}
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
