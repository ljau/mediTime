import type {
  LogStatus,
  NotificationReminderType,
  ScheduleFrequencyType,
} from '../database/types';

export interface ScheduledDose {
  scheduleId: string;
  medicationId: string;
  medicationName: string;
  medicationDosage: string | null;
  scheduledAt: string;
  reminderTime: string;
  doseAmount: number;
  doseUnit: string;
  label: string | null;
}

export type { LogStatus, NotificationReminderType, ScheduleFrequencyType };

export interface MedicationInput {
  name: string;
  dosage?: string | null;
  quantity: number;
  refillThreshold?: number;
  expirationDate?: string | null;
  notes?: string | null;
}

export interface MedicationRecord {
  id: string;
  name: string;
  dosage: string | null;
  quantity: number;
  refillThreshold: number;
  expirationDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleRecord {
  id: string;
  medicationId: string;
  userId: string | null;
  label: string | null;
  frequencyType: ScheduleFrequencyType;
  doseAmount: number;
  doseUnit: string;
  reminderTimes: string;
  daysOfWeek: number;
  intervalDays: number | null;
  startDate: string;
  endDate: string | null;
  timezone: string;
  isActive: 0 | 1;
  createdAt: string;
  updatedAt: string;
  metadata: string;
}

export interface ScheduleWithMedication extends ScheduleRecord {
  medicationName: string;
  medicationDosage: string | null;
}

export interface ScheduleInput {
  medicationId: string;
  label?: string | null;
  frequencyType?: ScheduleFrequencyType;
  doseAmount?: number;
  doseUnit?: string;
  reminderTimes?: string[];
  daysOfWeek?: number;
  intervalDays?: number | null;
  startDate?: string;
  endDate?: string | null;
  timezone?: string;
  isActive?: 0 | 1;
}

export interface LogRecord {
  id: string;
  medicationId: string;
  scheduleId: string | null;
  userId: string | null;
  scheduledAt: string;
  takenAt: string | null;
  status: LogStatus;
  doseAmount: number;
  doseUnit: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: string;
}

export interface LogInput {
  medicationId: string;
  scheduleId?: string | null;
  userId?: string | null;
  scheduledAt: string;
  takenAt?: string | null;
  status?: LogStatus;
  doseAmount?: number;
  doseUnit?: string;
  notes?: string | null;
}

export interface NotificationReminderRecord {
  id: string;
  medicationId: string;
  scheduleId: string | null;
  expoNotificationId: string;
  reminderTime: string;
  weekday: number | null;
  notificationType: NotificationReminderType;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationReminderInput {
  medicationId: string;
  scheduleId?: string | null;
  expoNotificationId: string;
  reminderTime: string;
  weekday?: number | null;
  notificationType?: NotificationReminderType;
}

export interface InventoryReductionResult {
  previousCount: number;
  newCount: number;
  requestedReduction: number;
  actualReduction: number;
}

export interface MedicationInventory {
  quantity: number;
  refillThreshold: number;
}

export interface MedicationExpiration {
  expirationDate?: string | null;
}

export interface DashboardStats {
  totalMedications: number;
  medicationsDueToday: number;
  dosesDueToday: number;
  missedDosesToday: number;
  lowStockCount: number;
  expiringCount: number;
  nextDose: ScheduledDose | null;
}

export interface DoseActionInput {
  medicationId: string;
  scheduleId?: string | null;
  scheduledAt: string;
  userId?: string | null;
  doseAmount?: number;
  doseUnit?: string;
  notes?: string | null;
  logId?: string;
}

export interface MarkDoseTakenResult {
  log: LogRecord;
  inventoryUpdated: boolean;
  inventory: InventoryReductionResult | null;
}

export interface ExpirationAlertsState {
  expired: MedicationRecord[];
  expiringSoon: MedicationRecord[];
  expiredCount: number;
  expiringSoonCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface DatabaseContextValue {
  db: import('expo-sqlite').SQLiteDatabase | null;
  isReady: boolean;
  error: unknown;
}
