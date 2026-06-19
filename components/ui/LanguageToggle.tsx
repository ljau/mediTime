import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { fontSize, fontWeight, textStyles } from '../../constants/typography';
import { useLanguage } from '../../context/LanguageContext';
import type { AppLanguage } from '../../i18n';

export default function LanguageToggle() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  function select(next: AppLanguage) {
    if (next !== language) {
      void setLanguage(next);
    }
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      accessibilityLabel={t('language.switchTo')}
    >
      <Pressable
        onPress={() => select('en')}
        style={({ pressed }) => [
          styles.option,
          language === 'en' && styles.optionActive,
          pressed && styles.optionPressed,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: language === 'en' }}
        accessibilityLabel={t('language.english')}
      >
        <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>
          EN
        </Text>
      </Pressable>
      <Pressable
        onPress={() => select('es')}
        style={({ pressed }) => [
          styles.option,
          language === 'es' && styles.optionActive,
          pressed && styles.optionPressed,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: language === 'es' }}
        accessibilityLabel={t('language.spanish')}
      >
        <Text style={[styles.optionText, language === 'es' && styles.optionTextActive]}>
          ES
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  option: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    minWidth: 44,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    ...textStyles.caption,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  optionTextActive: {
    color: colors.primary,
  },
});
