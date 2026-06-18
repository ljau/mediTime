import { Stack } from 'expo-router';
import { colors } from '../../constants/colors';
import { textStyles } from '../../constants/typography';

export default function MedicationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { ...textStyles.sectionTitle },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Medications' }} />
      <Stack.Screen name="new" options={{ title: 'Add Medication' }} />
      <Stack.Screen name="[id]" options={{ title: 'Medication Details' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Medication' }} />
    </Stack>
  );
}
