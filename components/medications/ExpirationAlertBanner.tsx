import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useIdempotentCallback } from '../../hooks/useIdempotentCallback';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';

interface ExpirationAlertBannerProps {
  title: string;
  message: string;
  tone?: 'warning' | 'error';
  onPress?: () => void;
}

export default function ExpirationAlertBanner({
  title,
  message,
  tone = 'warning',
  onPress,
}: ExpirationAlertBannerProps) {
  const isError = tone === 'error';
  const handlePress = useIdempotentCallback(onPress ?? (() => {}));

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.banner,
        isError ? styles.errorBanner : styles.warningBanner,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={[styles.accent, isError ? styles.errorAccent : styles.warningAccent]} />
      <View style={styles.content}>
        <Text style={[styles.title, isError ? styles.errorTitle : styles.warningTitle]}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  warningBanner: {
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  errorBanner: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  pressed: {
    opacity: 0.9,
  },
  accent: {
    width: 4,
  },
  warningAccent: {
    backgroundColor: colors.warning,
  },
  errorAccent: {
    backgroundColor: colors.error,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  title: {
    ...textStyles.label,
    fontWeight: '700',
  },
  warningTitle: {
    color: colors.warning,
  },
  errorTitle: {
    color: colors.error,
  },
  message: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
});
