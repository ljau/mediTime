import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { fontSize, fontWeight, textStyles } from '../../constants/typography';

interface ScreenHeaderProps {
  options: { title?: string };
  navigation: { goBack: () => void };
  back?: NativeStackHeaderProps['back'];
}

export default function ScreenHeader({ options, navigation, back }: ScreenHeaderProps) {
  const title = options.title ?? '';
  const canGoBack = back != null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        {canGoBack ? (
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={30} color={colors.primary} />
          </Pressable>
        ) : null}
        <Text
          style={[styles.title, !canGoBack && styles.titleLeading]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.xs,
  },
  backButtonPressed: {
    backgroundColor: colors.successLight,
  },
  title: {
    ...textStyles.screenTitle,
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  titleLeading: {
    marginLeft: spacing.xxs,
  },
});
