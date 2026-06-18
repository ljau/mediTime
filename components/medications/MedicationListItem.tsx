import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import {
  EXPIRATION_STATUS,
  daysUntilExpiration,
  getExpirationStatus,
  getStockStatus,
} from '../../utils/inventory';
import ExpiredBadge from './ExpiredBadge';
import ExpiringSoonBadge from './ExpiringSoonBadge';
import LowStockBadge from './LowStockBadge';

import type { MedicationRecord } from '../../types/app';

interface MedicationListItemProps {
  medication: MedicationRecord;
  onPress: () => void;
}

export default function MedicationListItem({ medication, onPress }: MedicationListItemProps) {
  const stockStatus = getStockStatus(medication);
  const expirationStatus = getExpirationStatus(medication);
  const lowStock = stockStatus === 'LOW_STOCK';
  const expired = expirationStatus === EXPIRATION_STATUS.EXPIRED;
  const expiringSoon = expirationStatus === EXPIRATION_STATUS.EXPIRING_SOON;
  const daysLeft = daysUntilExpiration(medication.expirationDate);
  const hasAlert = lowStock || expired || expiringSoon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        expired && styles.expiredContainer,
        !expired && expiringSoon && styles.expiringContainer,
        !expired && !expiringSoon && lowStock && styles.lowStockContainer,
        pressed && styles.pressed,
      ]}
    >
      {expired ? <View style={styles.errorAccent} /> : null}
      {!expired && expiringSoon ? <View style={styles.warningAccent} /> : null}
      {!expired && !expiringSoon && lowStock ? <View style={styles.warningAccent} /> : null}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{medication.name}</Text>
          {hasAlert && (
            <View style={styles.badges}>
              {lowStock ? <LowStockBadge /> : null}
              {expired ? <ExpiredBadge /> : null}
              {expiringSoon ? <ExpiringSoonBadge /> : null}
            </View>
          )}
        </View>

        {medication.dosage ? (
          <Text style={styles.detail}>{medication.dosage}</Text>
        ) : null}

        <Text style={[styles.detail, lowStock && styles.lowStockDetail]}>
          {medication.quantity} remaining
          {medication.refillThreshold > 0
            ? ` · refill at ${medication.refillThreshold}`
            : ''}
          {lowStock ? ' · LOW STOCK' : ''}
        </Text>

        {medication.expirationDate ? (
          <Text
            style={[
              styles.detail,
              expired && styles.expiredDetail,
              expiringSoon && styles.expiringDetail,
            ]}
          >
            {expired
              ? `Expired ${medication.expirationDate}`
              : daysLeft === 0
                ? `Expires today (${medication.expirationDate})`
                : daysLeft === 1
                  ? `Expires tomorrow (${medication.expirationDate})`
                  : `Expires in ${daysLeft} days (${medication.expirationDate})`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  lowStockContainer: {
    borderColor: colors.warning,
    backgroundColor: '#FFFBEB',
  },
  expiringContainer: {
    borderColor: colors.warning,
    backgroundColor: '#FFFBEB',
  },
  expiredContainer: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  pressed: {
    backgroundColor: colors.borderLight,
  },
  warningAccent: {
    width: 4,
    backgroundColor: colors.warning,
  },
  errorAccent: {
    width: 4,
    backgroundColor: colors.error,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...textStyles.sectionTitle,
    color: colors.textPrimary,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detail: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  lowStockDetail: {
    color: colors.warning,
    fontWeight: '600',
  },
  expiringDetail: {
    color: colors.warning,
    fontWeight: '600',
  },
  expiredDetail: {
    color: colors.error,
    fontWeight: '600',
  },
});
