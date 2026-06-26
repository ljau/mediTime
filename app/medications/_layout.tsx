import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { colors } from '../../constants/colors';

export default function MedicationsLayout() {
  const { t, i18n } = useTranslation();

  return (
    <Stack
      key={i18n.language}
      screenOptions={{
        header: (props: NativeStackHeaderProps) => <ScreenHeader {...props} />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('medications.title') }} />
      <Stack.Screen name="new" options={{ title: t('medications.addTitle') }} />
      <Stack.Screen
        name="[id]"
        options={{ title: t('medications.detailsTitle') }}
        dangerouslySingular
      />
      <Stack.Screen name="[id]/edit" options={{ title: t('medications.editTitle') }} />
      <Stack.Screen name="[id]/schedules/new" options={{ title: t('schedules.addTitle') }} />
      <Stack.Screen
        name="[id]/schedules/[scheduleId]/edit"
        options={{ title: t('schedules.editTitle') }}
      />
    </Stack>
  );
}
