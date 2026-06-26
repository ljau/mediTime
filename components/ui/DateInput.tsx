import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { getAppLocale } from '../../i18n';
import { formatDisplayDate, parseIsoDate, toIsoDate } from '../../utils/dates';

interface DateInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  minimumDate?: Date;
  maximumDate?: Date;
  clearable?: boolean;
}

export default function DateInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  containerStyle,
  minimumDate,
  maximumDate,
  clearable = true,
}: DateInputProps) {
  const { t } = useTranslation();
  const locale = getAppLocale();
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() => new Date());

  const displayValue = value ? formatDisplayDate(value, locale) : '';
  const pickerValue = value ? parseIsoDate(value) : new Date();

  function openPicker() {
    setDraftDate(pickerValue);
    setShowPicker(true);
  }

  function closePicker() {
    setShowPicker(false);
  }

  function confirmPicker() {
    onChange(toIsoDate(draftDate));
    closePicker();
  }

  function handleAndroidChange(event: DateTimePickerEvent, selectedDate?: Date) {
    closePicker();
    if (event.type === 'set' && selectedDate) {
      onChange(toIsoDate(selectedDate));
    }
  }

  function handleClear() {
    onChange('');
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.fieldRow}>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [
            styles.field,
            error && styles.fieldError,
            pressed && styles.fieldPressed,
          ]}
        >
          <Text style={[styles.fieldText, !displayValue && styles.placeholder]}>
            {displayValue || placeholder || t('form.selectDate')}
          </Text>
        </Pressable>

        {clearable && value ? (
          <Pressable
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel={t('form.clearDate')}
            style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
          >
            <Text style={styles.clearButtonText}>{t('form.clearDate')}</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={closePicker}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={closePicker} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Pressable onPress={closePicker} hitSlop={8}>
                  <Text style={styles.modalAction}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable onPress={confirmPicker} hitSlop={8}>
                  <Text style={[styles.modalAction, styles.modalActionPrimary]}>
                    {t('form.done')}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="inline"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale={locale}
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setDraftDate(selectedDate);
                  }
                }}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...textStyles.label,
    color: colors.textPrimary,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  fieldPressed: {
    backgroundColor: colors.borderLight,
  },
  fieldError: {
    borderColor: colors.error,
  },
  fieldText: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textMuted,
  },
  clearButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  clearButtonPressed: {
    opacity: 0.7,
  },
  clearButtonText: {
    ...textStyles.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalAction: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  modalActionPrimary: {
    color: colors.primary,
    fontWeight: '600',
  },
  iosPicker: {
    alignSelf: 'center',
  },
});
