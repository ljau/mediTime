import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { fontSize, fontWeight, textStyles } from '../../constants/typography';

type StatTone = keyof typeof TONE_STYLES;

interface StatCardProps {
  label: string;
  value: number | string;
  caption?: string;
  tone?: StatTone;
  icon?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function StatCard({
  label,
  value,
  caption,
  tone = 'default',
  icon,
  onPress,
  style,
}: StatCardProps) {
  const toneStyles = TONE_STYLES[tone] ?? TONE_STYLES.default;

  const content = (
    <>
      <View style={styles.headerRow}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: toneStyles.valueColor }]}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: toneStyles.background, borderColor: toneStyles.border },
          pressed && styles.pressed,
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: toneStyles.background, borderColor: toneStyles.border },
        style,
      ]}
    >
      {content}
    </View>
  );
}

const TONE_STYLES = {
  default: {
    background: colors.surface,
    border: colors.borderLight,
    valueColor: colors.textPrimary,
  },
  primary: {
    background: colors.surface,
    border: colors.primaryLight,
    valueColor: colors.primary,
  },
  success: {
    background: colors.successLight,
    border: colors.success,
    valueColor: colors.success,
  },
  warning: {
    background: colors.warningLight,
    border: colors.warning,
    valueColor: colors.warning,
  },
  error: {
    background: colors.errorLight,
    border: colors.error,
    valueColor: colors.error,
  },
  info: {
    background: colors.infoLight,
    border: colors.info,
    valueColor: colors.info,
  },
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.xs,
    flex: 1,
    minWidth: '46%',
  },
  pressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    fontSize: fontSize.md,
  },
  label: {
    ...textStyles.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  value: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    lineHeight: 38,
  },
  caption: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
  },
});
