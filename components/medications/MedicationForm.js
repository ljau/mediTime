import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import TextInput from '../ui/TextInput';
import { spacing } from '../../constants/spacing';

const EMPTY_FORM = {
  name: '',
  dosage: '',
  quantity: '',
  refillThreshold: '7',
  expirationDate: '',
  notes: '',
};

function toFormValues(medication) {
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

function validate(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = 'Name is required';
  }

  if (values.quantity.trim() === '') {
    errors.quantity = 'Quantity is required';
  } else if (!/^\d+$/.test(values.quantity.trim())) {
    errors.quantity = 'Enter a whole number';
  }

  if (values.refillThreshold.trim() === '') {
    errors.refillThreshold = 'Refill threshold is required';
  } else if (!/^\d+$/.test(values.refillThreshold.trim())) {
    errors.refillThreshold = 'Enter a whole number';
  }

  if (
    values.expirationDate.trim() &&
    !/^\d{4}-\d{2}-\d{2}$/.test(values.expirationDate.trim())
  ) {
    errors.expirationDate = 'Use YYYY-MM-DD format';
  }

  return errors;
}

export function formValuesToInput(values) {
  return {
    name: values.name,
    dosage: values.dosage,
    quantity: parseInt(values.quantity, 10),
    refillThreshold: parseInt(values.refillThreshold, 10),
    expirationDate: values.expirationDate.trim() || null,
    notes: values.notes,
  };
}

export default function MedicationForm({ initialValues, onChange }) {
  const [values, setValues] = useState(() => toFormValues(initialValues));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const nextValues = toFormValues(initialValues);
    setValues(nextValues);
    const nextErrors = validate(nextValues);
    setErrors(nextErrors);
    onChange?.(nextValues, nextErrors);
  }, [initialValues]);

  function updateField(field, value) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    setErrors(validate(nextValues));
    onChange?.(nextValues, validate(nextValues));
  }

  return (
    <View style={styles.form}>
      <TextInput
        label="Name"
        value={values.name}
        onChangeText={(text) => updateField('name', text)}
        placeholder="e.g. Lisinopril"
        autoCapitalize="words"
        error={errors.name}
      />

      <TextInput
        label="Dosage"
        value={values.dosage}
        onChangeText={(text) => updateField('dosage', text)}
        placeholder="e.g. 10 mg"
        error={errors.dosage}
      />

      <TextInput
        label="Quantity"
        value={values.quantity}
        onChangeText={(text) => updateField('quantity', text)}
        placeholder="e.g. 30"
        keyboardType="number-pad"
        error={errors.quantity}
      />

      <TextInput
        label="Refill threshold"
        value={values.refillThreshold}
        onChangeText={(text) => updateField('refillThreshold', text)}
        placeholder="Alert when quantity reaches this"
        keyboardType="number-pad"
        error={errors.refillThreshold}
      />

      <TextInput
        label="Expiration date"
        value={values.expirationDate}
        onChangeText={(text) => updateField('expirationDate', text)}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        error={errors.expirationDate}
      />

      <TextInput
        label="Notes"
        value={values.notes}
        onChangeText={(text) => updateField('notes', text)}
        placeholder="Optional instructions or reminders"
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
