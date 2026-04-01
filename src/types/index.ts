export type UserRole = "admin" | "viewer"

export interface Brand {
  id: string
  name: string
  logo_url: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface UserBrandAccess {
  id: string
  user_id: string
  brand_id: string
  brand?: Brand
}

export interface Campaign {
  id: string
  brand_id: string
  name: string
  channel: string
  status: "active" | "paused" | "ended"
  start_date: string
  end_date: string | null
  created_at: string
  brand?: Brand
}

export interface KpiDefinition {
  id: string
  campaign_id: string
  metric_key: string
  label: string
  unit: string
  display_order: number
  is_visible: boolean
}

export interface PerformanceRecord {
  id: string
  campaign_id: string
  record_date: string
  values: Record<string, number>
}

export interface Budget {
  id: string
  campaign_id: string
  period_start: string
  period_end: string
  total_budget: number
}

export interface SpendRecord {
  id: string
  campaign_id: string
  spend_date: string
  amount: number
}

export interface Activity {
  id: string
  brand_id: string
  campaign_id: string | null
  channel: string | null
  title: string
  content: string
  activity_date: string
  created_at: string
  campaign?: Campaign
}

export interface CalendarEvent {
  id: string
  brand_id: string
  campaign_id: string | null
  title: string
  channel: string | null
  asset_type: string | null
  event_date: string
  status: CalendarEventStatus
  description: string | null
  campaign?: Campaign
}

export type CalendarEventStatus =
  | "draft"
  | "review_requested"
  | "feedback_pending"
  | "in_revision"
  | "upload_scheduled"
  | "completed"

export const STATUS_LABELS: Record<CalendarEventStatus, string> = {
  draft: "초안",
  review_requested: "검토 요청",
  feedback_pending: "피드백 대기",
  in_revision: "수정 중",
  upload_scheduled: "업로드 예정",
  completed: "완료",
}

export const STATUS_COLORS: Record<CalendarEventStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  review_requested: "bg-blue-100 text-blue-700",
  feedback_pending: "bg-yellow-100 text-yellow-700",
  in_revision: "bg-orange-100 text-orange-700",
  upload_scheduled: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
}

export interface Creative {
  id: string
  brand_id: string
  campaign_id: string | null
  title: string
  channel: string | null
  asset_type: "image" | "video" | "banner" | "other"
  status: CalendarEventStatus
  description: string | null
  scheduled_date: string | null
  created_at: string
  campaign?: Campaign
  latest_version?: CreativeVersion
}

export interface CreativeVersion {
  id: string
  creative_id: string
  version_number: number
  file_path: string
  file_url: string
  uploaded_at: string
}

export interface MetaAdAccount {
  id: string
  brand_id: string
  meta_account_id: string
  meta_account_name: string
  created_at: string
  brand?: Brand
}

export interface NaverAdAccount {
  id: string
  brand_id: string
  naver_customer_id: string
  naver_account_name: string
  created_at: string
  brand?: Brand
}

export interface Ga4Property {
  id: string
  brand_id: string
  property_id: string
  property_name: string
  website_url: string | null
  created_at: string
  brand?: Brand
}

export interface Ga4UtmEntry {
  id: string
  brand_id: string
  label: string
  landing_url: string | null
  utm_source: string
  utm_medium: string
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  created_at: string
  brand?: Brand
}

export interface Ga4UtmPerformance {
  id: string
  utm_entry_id: string
  record_date: string
  sessions: number
  users: number
  pageviews: number
  bounce_rate: number | null
  avg_session_duration: number | null
  conversions: number
  revenue: number
}

export interface CreativeComment {
  id: string
  creative_id: string
  user_id: string
  content: string
  created_at: string
  user?: UserProfile
}
