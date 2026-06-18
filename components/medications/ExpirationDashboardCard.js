import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';

/**
 * @param {{
 *   title: string,
 *   count: number,
 *   description: string,
 *   tone?: 'warning' | 'error',
 *   onPress?: () => void,
 * }} props
 */
export default function ExpirationDashboardCard({
  title,
  count,
  description,
  tone = 'warning',
  onPress,
}) {
  const isError = tone === 'error';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        isError ? styles.errorCard : styles.warningCard,
        pressed && onPress && styles.pressed,
      ]}
    >
      <Text style={styles.cardLabel}>{title}</Text>
      <Text style={[styles.statValue, isError ? styles.errorValue : styles.warningValue]}>
        {count}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.xs,
    flex: 1,
  },
  warningCard: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  errorCard: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
  },
  pressed: {
    opacity: 0.85,
  },
  cardLabel: {
    ...textStyles.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...textStyles.screenTitle,
    fontSize: 32,
  },
  warningValue: {
    color: colors.warning,
  },
  errorValue: {
    color: colors.error,
  },
  description: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
});
