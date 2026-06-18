import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { STOCK_STATUS, type StockStatus } from '../../utils/inventory';

interface StockStatusIndicatorProps {
  stockStatus: StockStatus;
  quantity: number;
  refillThreshold: number;
}

export default function StockStatusIndicator({
  stockStatus,
  quantity,
  refillThreshold,
}: StockStatusIndicatorProps) {
  const isLowStock = stockStatus === STOCK_STATUS.LOW_STOCK;

  return (
    <View
      style={[
        styles.container,
        isLowStock ? styles.lowStockContainer : styles.normalContainer,
      ]}
    >
      <Text
        style={[
          styles.statusLabel,
          isLowStock ? styles.lowStockLabel : styles.normalLabel,
        ]}
      >
        {isLowStock ? 'LOW STOCK' : 'In stock'}
      </Text>
      <Text style={styles.detail}>
        {quantity} remaining · refill at {refillThreshold}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xxs,
    borderWidth: 1,
  },
  lowStockContainer: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  normalContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
  },
  statusLabel: {
    ...textStyles.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  lowStockLabel: {
    color: colors.warning,
  },
  normalLabel: {
    color: colors.success,
  },
  detail: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
});
