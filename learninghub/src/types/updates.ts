/**
 * Canonical TypeScript Types for Student Updates Hub.
 */

export type UpdateCategory =
  | 'ALL'
  | 'ACADEMIC'
  | 'EXAMINATION'
  | 'ADMISSION'
  | 'SCHOLARSHIP'
  | 'CAREER'
  | 'COMPETITIVE_EXAMS'
  | 'GENERAL';

export type UpdateImportance = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export type UpdateVerificationStatus = 'VERIFIED' | 'PENDING_REVIEW' | 'FLAGGED';

export interface UpdateAttachment {
  id: string;
  title: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
}

export interface UpdateCrossLink {
  id: string;
  content_type: 'TEST' | 'EBOOK' | 'COURSE' | 'STUDY_PLAN';
  target_id: string;
  title: string;
  action_cta: string;
  action_url: string;
}

export interface UpdateVersion {
  id: string;
  version_number: number;
  title: string;
  summary: string;
  diff_summary: string;
  changed_fields: string[];
  created_at: string;
}

export interface UpdateSourceEndpoint {
  id: string;
  name: string;
  sub_category: string;
  endpoint_url: string;
  is_active: boolean;
}

export interface UpdateSource {
  source_id: string;
  name: string;
  domain: string;
  source_type: string;
  authority_level: 1 | 2 | 3 | 4 | 5;
  category: string;
  country: string;
  state: string;
  institution: string;
  base_url: string;
  polling_interval_minutes: number;
  is_enabled: boolean;
  last_success_at?: string;
  last_checked_at?: string;
  endpoints: UpdateSourceEndpoint[];
}

export interface StudentUpdate {
  id: string;
  title: string;
  summary: string;
  ai_summary?: string;
  is_ai_summarized?: boolean;
  source_url: string;
  category: UpdateCategory;
  sub_category: string;
  institution: string;
  department?: string;
  issuer_name?: string;
  issuer_role?: string;
  circular_number?: string;
  course?: string;
  semester?: string;
  published_at?: string;
  deadline?: string;
  importance: UpdateImportance;
  status: string;
  verification_status: UpdateVerificationStatus;
  version: number;
  source_name?: string;
  source_domain?: string;
  authority_level?: 1 | 2 | 3 | 4 | 5;
  attachments_count?: number;
  has_attachments?: boolean;
  attachments?: UpdateAttachment[];
  cross_links?: UpdateCrossLink[];
  versions?: UpdateVersion[];
  is_bookmarked?: boolean;
  user_reminders?: Array<{
    id: string;
    reminder_type: string;
    trigger_at: string;
    is_dispatched: boolean;
  }>;
  created_at: string;
}

export interface UpdateBookmark {
  id: string;
  update: StudentUpdate;
  notes: string;
  tag: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateReminder {
  id: string;
  update: StudentUpdate;
  reminder_type: '7_DAYS_BEFORE' | '3_DAYS_BEFORE' | '1_DAY_BEFORE' | 'DAY_OF';
  trigger_at: string;
  is_dispatched: boolean;
  dispatched_at?: string;
  created_at: string;
}

export interface UpdateSubscription {
  id: string;
  target_type: 'INSTITUTION' | 'COURSE' | 'SEMESTER' | 'EXAM' | 'CATEGORY';
  target_value: string;
  created_at: string;
}

export type ResultWatcherStatus = 'ACTIVE' | 'RESULT_DECLARED' | 'CANCELLED';

export interface ResultWatcher {
  id: string;
  institution: string;
  course: string;
  semester?: string;
  roll_number?: string;
  status: ResultWatcherStatus;
  matched_update?: StudentUpdate | string | null;
  matched_update_title?: string;
  result_url?: string;
  notified_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface UpdateNotificationPreference {
  id?: string;
  user_id?: number | string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_daily_push: number;
  subscribed_categories?: string[];
  allow_exam_forms?: boolean;
  allow_results?: boolean;
  allow_timetables?: boolean;
  allow_scholarships?: boolean;
  allow_admit_cards?: boolean;
  allow_academic?: boolean;
  digest_mode?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpdatesStatistics {
  total_updates: number;
  urgent_updates: number;
  active_deadlines: number;
  tracked_sources: number;
}

export interface CreateResultWatcherPayload {
  institution: string;
  course: string;
  semester?: string;
  roll_number?: string;
}

export interface FollowTargetPayload {
  target_type: 'INSTITUTION' | 'COURSE' | 'SEMESTER' | 'EXAM' | 'CATEGORY';
  target_value: string;
}

export interface CollegeCircularPayload {
  title: string;
  summary: string;
  department: string;
  institution: string;
  issuer_name: string;
  issuer_role?: string;
  circular_number?: string;
  category?: UpdateCategory;
  sub_category?: string;
  importance?: UpdateImportance;
  course?: string;
  semester?: string;
  deadline?: string;
  source_url?: string;
}

export interface UpdateEngagementEventPayload {
  event_type: 'IMPRESSION' | 'CLICK_DETAIL' | 'CLICK_SOURCE' | 'CALENDAR_EXPORT' | 'BOOKMARK' | 'REMINDER_SET';
  client_hash?: string;
}

export interface UpdateAnalyticsData {
  update_id: string;
  title: string;
  institution: string;
  department?: string;
  impressions: number;
  detail_clicks: number;
  source_clicks: number;
  calendar_exports: number;
  bookmarks: number;
  reminders_set: number;
  click_through_rate: number;
}

export interface GlobalEngagementAnalytics {
  total_events: number;
  total_impressions: number;
  total_detail_clicks: number;
  total_source_clicks: number;
  total_calendar_exports: number;
  total_bookmarks: number;
  total_reminders_set: number;
  average_click_through_rate: number;
  category_breakdown: Array<{
    update__category: string;
    event_count: number;
  }>;
}


