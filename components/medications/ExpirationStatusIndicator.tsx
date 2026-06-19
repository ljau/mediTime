import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { EXPIRATION_STATUS, daysUntilExpiration, type ExpirationStatus } from '../../utils/inventory';

interface ExpirationStatusIndicatorProps {
  expirationStatus: ExpirationStatus;
  expirationDate: string | null;
}

export default function ExpirationStatusIndicator({
  expirationStatus,
  expirationDate,
}: ExpirationStatusIndicatorProps) {
  const { t } = useTranslation();

  if (!expirationDate) {
    return null;
  }

  const daysLeft = daysUntilExpiration(expirationDate);
  const isExpired = expirationStatus === EXPIRATION_STATUS.EXPIRED;
  const isExpiringSoon = expirationStatus === EXPIRATION_STATUS.EXPIRING_SOON;

  let statusLabel = t('expiration.valid');
  let detail = t('expiration.expires', { date: expirationDate });

  if (isExpired) {
    statusLabel = t('expiration.expiredUpper');
    detail = t('expiration.expiredOn', { date: expirationDate });
  } else if (isExpiringSoon && daysLeft !== null) {
    statusLabel = t('expiration.expiringSoonUpper');
    detail =
      daysLeft === 0
        ? t('expiration.expiresToday', { date: expirationDate })
        : daysLeft === 1
          ? t('expiration.expiresTomorrow', { date: expirationDate })
          : t('expiration.expiresInDays', { days: daysLeft, date: expirationDate });
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
