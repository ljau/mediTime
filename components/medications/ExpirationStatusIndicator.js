import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { EXPIRATION_STATUS, daysUntilExpiration } from '../../utils/inventory';

/**
 * @param {{
 *   expirationStatus: typeof EXPIRATION_STATUS[keyof typeof EXPIRATION_STATUS],
 *   expirationDate: string|null,
 * }} props
 */
export default function ExpirationStatusIndicator({
  expirationStatus,
  expirationDate,
}) {
  if (!expirationDate) {
    return null;
  }

  const daysLeft = daysUntilExpiration(expirationDate);
  const isExpired = expirationStatus === EXPIRATION_STATUS.EXPIRED;
  const isExpiringSoon = expirationStatus === EXPIRATION_STATUS.EXPIRING_SOON;

  let statusLabel = 'Valid';
  let detail = `Expires ${expirationDate}`;

  if (isExpired) {
    statusLabel = 'EXPIRED';
    detail = `Expired on ${expirationDate}`;
  } else if (isExpiringSoon && daysLeft !== null) {
    statusLabel = 'EXPIRING SOON';
    detail =
      daysLeft === 0
        ? `Expires today (${expirationDate})`
        : daysLeft === 1
          ? `Expires tomorrow (${expirationDate})`
          : `Expires in ${daysLeft} days (${expirationDate})`;
  }

  return (
    <View
      style={[
        styles.container,
        isExpired
          ? styles.expiredContainer
          : isExpiringSoon
            ? styles.expiringContainer
            : styles.normalContainer,
      ]}
    >
      <Text
        style={[
          styles.statusLabel,
          isExpired
            ? styles.expiredLabel
            : isExpiringSoon
              ? styles.expiringLabel
              : styles.normalLabel,
        ]}
      >
        {statusLabel}
      </Text>
      <Text style={styles.detail}>{detail}</Text>
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
  expiredContainer: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
  },
  expiringContainer: {
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
  expiredLabel: {
    color: colors.error,
  },
  expiringLabel: {
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
