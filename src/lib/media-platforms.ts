export type MediaPlatformKey =
  | "meta"
  | "naver"
  | "ga4"
  | "google_ads"
  | "kakao"
  | "tiktok"
  | "youtube"
  | "crm"

export type MediaPlatformStatus = "live" | "planned"

export type MediaPlatformCategory = "ads" | "analytics" | "owned"

export type MediaPlatform = {
  key: MediaPlatformKey
  label: string
  shortLabel: string
  category: MediaPlatformCategory
  status: MediaPlatformStatus
  description: string
  credentialScope: "global" | "brand" | "none"
  color: string
  href?: string
}

export const MEDIA_PLATFORMS: MediaPlatform[] = [
  {
    key: "meta",
    label: "Meta Ads",
    shortLabel: "Meta",
    category: "ads",
    status: "live",
    description: "Facebook/Instagram 광고 계정 연결",
    credentialScope: "global",
    color: "#6FA8F5",
    href: "/admin/channels#meta",
  },
  {
    key: "naver",
    label: "Naver Ads",
    shortLabel: "Naver",
    category: "ads",
    status: "live",
    description: "네이버 검색광고 계정 연결",
    credentialScope: "global",
    color: "#5EC27A",
    href: "/admin/channels#naver",
  },
  {
    key: "ga4",
    label: "GA4",
    shortLabel: "GA4",
    category: "analytics",
    status: "live",
    description: "Google Analytics 속성 연결",
    credentialScope: "global",
    color: "#E8B04B",
    href: "/admin/channels#ga4",
  },
  {
    key: "google_ads",
    label: "Google Ads",
    shortLabel: "Google",
    category: "ads",
    status: "planned",
    description: "검색/디스플레이/동영상 광고 계정 연결 예정",
    credentialScope: "global",
    color: "#7AABF5",
  },
  {
    key: "kakao",
    label: "Kakao Ads",
    shortLabel: "Kakao",
    category: "ads",
    status: "planned",
    description: "카카오 광고 계정 연결 예정",
    credentialScope: "global",
    color: "#E8B04B",
  },
  {
    key: "tiktok",
    label: "TikTok Ads",
    shortLabel: "TikTok",
    category: "ads",
    status: "planned",
    description: "TikTok 광고 계정 연결 예정",
    credentialScope: "global",
    color: "#FF4770",
  },
  {
    key: "youtube",
    label: "YouTube",
    shortLabel: "YouTube",
    category: "owned",
    status: "planned",
    description: "채널/콘텐츠 성과 연결 예정",
    credentialScope: "global",
    color: "#E5553B",
  },
  {
    key: "crm",
    label: "CRM / Email",
    shortLabel: "CRM",
    category: "owned",
    status: "planned",
    description: "CRM, 이메일, 메시징 매체 연결 예정",
    credentialScope: "brand",
    color: "#C77DD6",
  },
]

export const LIVE_MEDIA_PLATFORMS = MEDIA_PLATFORMS.filter(
  (platform) => platform.status === "live"
)

export const PLANNED_MEDIA_PLATFORMS = MEDIA_PLATFORMS.filter(
  (platform) => platform.status === "planned"
)

export function getLiveMediaPlatformCount() {
  return LIVE_MEDIA_PLATFORMS.length
}
