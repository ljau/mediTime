import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';

export default function LowStockBadge({ label = 'Low stock' }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.warningLight,
  },
  text: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.warning,
  },
});
