import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { useIdempotentCallback } from '../../hooks/useIdempotentCallback';

const VARIANTS = {
  primary: {
    container: {
      backgroundColor: colors.primary,
    },
    text: {
      color: colors.textInverse,
    },
    pressed: {
      backgroundColor: colors.primaryDark,
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {
      color: colors.textPrimary,
    },
    pressed: {
      backgroundColor: colors.borderLight,
    },
  },
  danger: {
    container: {
      backgroundColor: colors.error,
    },
    text: {
      color: colors.textInverse,
    },
    pressed: {
      backgroundColor: '#B91C1C',
    },
  },
};

type ButtonVariant = keyof typeof VARIANTS;

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const variantStyles = VARIANTS[variant] ?? VARIANTS.primary;
  const isDisabled = disabled || loading;
  const handlePress = useIdempotentCallback(onPress);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variantStyles.container,
        pressed && !isDisabled && variantStyles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? colors.primary : colors.textInverse}
        />
      ) : (
        <Text style={[styles.label, variantStyles.text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    ...textStyles.label,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
