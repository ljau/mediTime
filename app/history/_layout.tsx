import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { colors } from '../../constants/colors';

export default function HistoryLayout() {
  const { t, i18n } = useTranslation();

  return (
    <Stack
      key={i18n.language}
      screenOptions={{
        header: (props: NativeStackHeaderProps) => <ScreenHeader {...props} />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('history.title') }} />
    </Stack>
  );
}
