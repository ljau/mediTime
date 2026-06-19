import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';

export default function LowStockBadge() {
  const { t } = useTranslation();

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{t('stock.lowStock')}</Text>
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
