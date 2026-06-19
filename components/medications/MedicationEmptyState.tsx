import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';

export default function MedicationEmptyState() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('medications.emptyTitle')}</Text>
      <Text style={styles.body}>{t('medications.emptyBody')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
