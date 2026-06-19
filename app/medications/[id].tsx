import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import LowStockBadge from '../../components/medications/LowStockBadge';
import ExpirationStatusIndicator from '../../components/medications/ExpirationStatusIndicator';
import ExpiredBadge from '../../components/medications/ExpiredBadge';
import ExpiringSoonBadge from '../../components/medications/ExpiringSoonBadge';
import StockStatusIndicator from '../../components/medications/StockStatusIndicator';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';
import { useDatabase } from '../../context/DatabaseContext';
import { deleteMedication } from '../../database/repositories/medications';
import { useMedication } from '../../hooks/useMedication';
import { EXPIRATION_STATUS, getExpirationStatus, getStockStatus } from '../../utils/inventory';

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function MedicationDetailsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const medicationId = Array.isArray(id) ? id[0] : id;
  const { db } = useDatabase();
  const { medication, isLoading, error, refresh } = useMedication(medicationId);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function confirmDelete() {
    Alert.alert(
      t('medications.deleteConfirmTitle'),
      t('medications.deleteConfirmMessage', { name: medication?.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: handleDelete,
        },
      ]
    );
  }

  async function handleDelete() {
    if (!db || !medicationId) return;

    setIsDeleting(true);

    try {
      await deleteMedication(db, medicationId);
      router.replace('/medications');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('medications.couldNotDelete');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !medication) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('medications.notFound')}</Text>
        <Button
          title={t('medications.backToList')}
          variant="secondary"
          onPress={() => router.replace('/medications')}
        />
      </View>
    );
  }

  const stockStatus = getStockStatus(medication);
  const expirationStatus = getExpirationStatus(medication);
  const lowStock = stockStatus === 'LOW_STOCK';
  const expired = expirationStatus === EXPIRATION_STATUS.EXPIRED;
  const expiringSoon = expirationStatus === EXPIRATION_STATUS.EXPIRING_SOON;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card>
          <Text style={styles.title}>{medication.name}</Text>

          {(lowStock || expired || expiringSoon) && (
            <View style={styles.statusRow}>
              {lowStock ? <LowStockBadge /> : null}
              {expired ? <ExpiredBadge /> : null}
              {expiringSoon ? <ExpiringSoonBadge /> : null}
            </View>
          )}

          <StockStatusIndicator
            stockStatus={stockStatus}
            quantity={medication.quantity}
            refillThreshold={medication.refillThreshold}
          />

          <ExpirationStatusIndicator
            expirationStatus={expirationStatus}
            expirationDate={medication.expirationDate}
          />

          <DetailRow label={t('medications.dosage')} value={medication.dosage} />
          <DetailRow label={t('medications.quantity')} value={String(medication.quantity)} />
          <DetailRow
            label={t('medications.refillThreshold')}
            value={String(medication.refillThreshold)}
          />
          <DetailRow label={t('medications.notes')} value={medication.notes} />
        </Card>

        <View style={styles.actions}>
          <Button
            title={t('medications.editMedication')}
            onPress={() => router.push(`/medications/${medication.id}/edit`)}
          />
          <Button
            title={t('medications.deleteMedication')}
            variant="danger"
            onPress={confirmDelete}
            loading={isDeleting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
    textAlign: 'center',
  },
  title: {
    ...textStyles.screenTitle,
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailRow: {
    gap: spacing.xxs,
  },
  detailLabel: {
    ...textStyles.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.md,
  },
});
