import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, useDatabase } from '../context/DatabaseContext';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { textStyles } from '../constants/typography';
import {
  addNotificationResponseListener,
  configureNotifications,
  requestNotificationPermissions,
  syncAllMedicationReminders,
} from '../services/notifications';
import { syncAllRefillReminders } from '../services/refill/refillReminderService';
import { syncAllExpirationReminders } from '../services/expiration';

function RootNavigator() {
  const { db, isReady, error } = useDatabase();
  const router = useRouter();

  useEffect(() => {
    if (!isReady || !db) return;

    let responseSubscription;

    (async () => {
      await configureNotifications();
      await requestNotificationPermissions();
      await syncAllMedicationReminders(db);
      await syncAllRefillReminders(db);
      await syncAllExpirationReminders(db);
    })();

    responseSubscription = addNotificationResponseListener((response) => {
      const medicationId = response.notification.request.content.data?.medicationId;
      if (typeof medicationId === 'string') {
        router.push(`/medications/${medicationId}`);
      }
    });

    return () => {
      responseSubscription?.remove();
    };
  }, [db, isReady, router]);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Database error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparing MediTime…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { ...textStyles.sectionTitle },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="medications" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <RootNavigator />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  errorTitle: {
    ...textStyles.sectionTitle,
    color: colors.error,
  },
  errorMessage: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
