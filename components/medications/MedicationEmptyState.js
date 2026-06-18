import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';

export default function MedicationEmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No medications yet</Text>
      <Text style={styles.body}>
        Add your first medication to start tracking inventory, refills, and
        expiration dates.
      </Text>
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
