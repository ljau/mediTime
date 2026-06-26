import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider, useDatabase } from '../context/DatabaseContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { textStyles } from '../constants/typography';
import { useIdempotentRouter } from '../hooks/useIdempotentRouter';
import '../i18n';
import {
  addNotificationResponseListener,
  configureNotifications,
  requestNotificationPermissions,
  syncAllMedicationReminders,
} from '../services/notifications';
import { syncAllRefillReminders } from '../services/refill/refillReminderService';
import { syncAllExpirationReminders } from '../services/expiration';

function NotificationLanguageSync() {
  const { db, isReady } = useDatabase();
  const { language } = useLanguage();

  useEffect(() => {
    if (!isReady || !db) return;

    void (async () => {
      await syncAllMedicationReminders(db);
      await syncAllRefillReminders(db);
      await syncAllExpirationReminders(db);
    })();
  }, [db, isReady, language]);

  return null;
}

function RootNavigator() {
  const { db, isReady, error } = useDatabase();
  const { push } = useIdempotentRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isReady || !db) return;

    let responseSubscription: Notifications.EventSubscription | undefined;

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
        push(`/medications/${medicationId}`);
      }
    });

    return () => {
      responseSubscription?.remove();
    };
  }, [db, isReady, push]);

  if (error) {
    const message =
      error instanceof Error ? error.message : t('layout.unexpectedError');
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>{t('layout.databaseError')}</Text>
        <Text style={styles.errorMessage}>{message}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('layout.preparing')}</Text>
      </View>
    );
  }

  return (
    <>
      <NotificationLanguageSync />
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
      <LanguageProvider>
        <DatabaseProvider>
          <RootNavigator />
        </DatabaseProvider>
      </LanguageProvider>
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
