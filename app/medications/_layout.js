import { Stack } from 'expo-router';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { colors } from '../../constants/colors';

export default function MedicationsLayout() {
  return (
    <Stack
      screenOptions={{
        header: (props) => <ScreenHeader {...props} />,
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
