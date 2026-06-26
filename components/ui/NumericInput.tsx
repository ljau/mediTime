import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';

interface NumericInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  min?: number;
  max?: number;
  step?: number;
}

function parseNumericValue(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function clamp(value: number, min: number, max?: number): number {
  let result = Math.max(min, value);
  if (max !== undefined) {
    result = Math.min(max, result);
  }
  return result;
}

export default function NumericInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  containerStyle,
  min = 0,
  max,
  step = 1,
}: NumericInputProps) {
  const { t } = useTranslation();
  const currentValue = parseNumericValue(value) ?? min;
  const canDecrement = currentValue > min;
  const canIncrement = max === undefined || currentValue < max;

  function handleChangeText(text: string) {
    const digitsOnly = text.replace(/\D/g, '');
    onChange(digitsOnly);
  }

  function handleDecrement() {
    if (!canDecrement) return;
    onChange(String(clamp(currentValue - step, min, max)));
  }

  function handleIncrement() {
    if (!canIncrement) return;
    onChange(String(clamp(currentValue + step, min, max)));
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.controlRow, error && styles.controlRowError]}>
        <Pressable
          onPress={handleDecrement}
          disabled={!canDecrement}
          accessibilityRole="button"
          accessibilityLabel={t('form.decreaseValue')}
          style={({ pressed }) => [
            styles.stepButton,
            styles.stepButtonLeft,
            !canDecrement && styles.stepButtonDisabled,
            pressed && canDecrement && styles.stepButtonPressed,
          ]}
        >
          <Ionicons
            name="remove"
            size={20}
            color={canDecrement ? colors.primary : colors.textMuted}
          />
        </Pressable>

        <RNTextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
          textAlign="center"
        />

        <Pressable
          onPress={handleIncrement}
          disabled={!canIncrement}
          accessibilityRole="button"
          accessibilityLabel={t('form.increaseValue')}
          style={({ pressed }) => [
            styles.stepButton,
            styles.stepButtonRight,
            !canIncrement && styles.stepButtonDisabled,
            pressed && canIncrement && styles.stepButtonPressed,
          ]}
        >
          <Ionicons
            name="add"
            size={20}
            color={canIncrement ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  controlRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    overflow: 'hidden',
  },
  controlRowError: {
    borderColor: colors.error,
  },
  stepButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  stepButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  stepButtonRight: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  stepButtonPressed: {
    backgroundColor: colors.border,
  },
  stepButtonDisabled: {
    opacity: 0.5,
  },
  input: {
    ...textStyles.body,
    flex: 1,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    minWidth: 0,
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
  },
});
