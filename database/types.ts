/**
 * TypeScript types mirroring database/schema.sql.
 * IDs are TEXT to support UUIDs for future cloud sync.
 */

export type MedicationForm =
  | 'tablet'
  | 'capsule'
  | 'liquid'
  | 'injection'
  | 'topical'
  | 'other';

export type ScheduleFrequencyType =
  | 'daily'
  | 'weekly'
  | 'interval'
  | 'as_needed';

export type LogStatus = 'taken' | 'missed' | 'skipped' | 'pending';

export type NotificationReminderType = 'medication' | 'refill' | 'expiration';

export interface Medication {
  id: string;
  user_id: string | null;
  name: string;
  dosage: string | null;
  form: MedicationForm;
  instructions: string | null;
  notes: string | null;
  remaining_count: number;
  initial_count: number | null;
  low_stock_threshold: number;
  expiration_date: string | null;
  refill_reminder_enabled: 0 | 1;
  refill_reminder_days_before: number;
  color: string | null;
  image_uri: string | null;
  is_active: 0 | 1;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: string;
}

export interface Schedule {
  id: string;
  medication_id: string;
  user_id: string | null;
  label: string | null;
  frequency_type: ScheduleFrequencyType;
  dose_amount: number;
  dose_unit: string;
  reminder_times: string;
  days_of_week: number;
  interval_days: number | null;
  start_date: string;
  end_date: string | null;
  timezone: string;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
  metadata: string;
}

export interface Log {
  id: string;
  medication_id: string;
  schedule_id: string | null;
  user_id: string | null;
  scheduled_at: string;
  taken_at: string | null;
  status: LogStatus;
  dose_amount: number;
  dose_unit: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  metadata: string;
}

export interface NotificationReminder {
  id: string;
  medication_id: string;
  schedule_id: string | null;
  expo_notification_id: string;
  reminder_time: string;
  weekday: number | null;
  notification_type: NotificationReminderType;
  created_at: string;
  updated_at: string;
}

export interface RefillHistory {
  id: string;
  medication_id: string;
  user_id: string | null;
  refilled_at: string;
  quantity_added: number;
  quantity_before: number;
  quantity_after: number;
  pharmacy: string | null;
  prescription_number: string | null;
  cost_cents: number | null;
  notes: string | null;
  created_at: string;
  metadata: string;
}
