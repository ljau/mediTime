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
import { useIdempotentCallback } from '../../hooks/useIdempotentCallback';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { getAppLocale } from '../../i18n';
import { formatDisplayTime, parseTimeValue, toTimeString } from '../../utils/dates';

interface TimeInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TimeInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  containerStyle,
}: TimeInputProps) {
  const { t } = useTranslation();
  const locale = getAppLocale();
  const [showPicker, setShowPicker] = useState(false);
  const [draftTime, setDraftTime] = useState(() => new Date());

  const displayValue = value ? formatDisplayTime(value, locale) : '';
  const pickerValue = value ? parseTimeValue(value) : new Date();

  function openPicker() {
    setDraftTime(pickerValue);
    setShowPicker(true);
  }

  function closePicker() {
    setShowPicker(false);
  }

  function confirmPicker() {
    onChange(toTimeString(draftTime));
    closePicker();
  }

  function handleAndroidChange(event: DateTimePickerEvent, selectedDate?: Date) {
    closePicker();
    if (event.type === 'set' && selectedDate) {
      onChange(toTimeString(selectedDate));
    }
  }

  const handleOpenPicker = useIdempotentCallback(openPicker);
  const handleClosePicker = useIdempotentCallback(closePicker);
  const handleConfirmPicker = useIdempotentCallback(confirmPicker);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={handleOpenPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.field,
          error && styles.fieldError,
          pressed && styles.fieldPressed,
        ]}
      >
        <Text style={[styles.fieldText, !displayValue && styles.placeholder]}>
          {displayValue || placeholder || t('form.selectTime')}
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display="default"
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={closePicker}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={handleClosePicker} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Pressable onPress={handleClosePicker} hitSlop={8}>
                  <Text style={styles.modalAction}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable onPress={handleConfirmPicker} hitSlop={8}>
                  <Text style={[styles.modalAction, styles.modalActionPrimary]}>
                    {t('form.done')}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draftTime}
                mode="time"
                display="spinner"
                locale={locale}
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setDraftTime(selectedDate);
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
  field: {
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
