import type { ProviderMetadata } from "./types"

// ── Client-safe metadata. Do NOT import server-only helpers here. ──

export const metaMetadata: ProviderMetadata = {
  id: "meta",
  label: "Meta (Facebook / Instagram)",
  shortLabel: "Meta",
  category: "ads",
  authMode: "manual",
  description: "Meta Business Suite에서 발급한 액세스 토큰을 입력하세요.",
  helpUrl: "https://developers.facebook.com/tools/explorer/",
  helpLabel: "Graph API Explorer에서 토큰 발급 →",
  ui: {
    iconMark: "M",
    iconBg: "#1877F220",
    iconColor: "#6FA8F5",
    cardSubtitle: "Meta 광고 계정 연결 및 상태 관리",
  },
  credentialFields: [
    { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxx..." },
  ],
  mapping: {
    table: "meta_ad_accounts",
    accountIdColumn: "meta_account_id",
    accountNameColumn: "meta_account_name",
    multiplePerBrand: false,
  },
}

export const naverMetadata: ProviderMetadata = {
  id: "naver",
  label: "네이버 검색광고",
  shortLabel: "Naver",
  category: "ads",
  authMode: "manual",
  description: "네이버 검색광고 API 라이선스 관리에서 발급한 키를 입력하세요.",
  helpUrl: "https://manage.searchad.naver.com/customers/START/tool/management",
  helpLabel: "검색광고 API 라이선스 관리 →",
  ui: {
    iconMark: "N",
    iconBg: "#03c75a20",
    iconColor: "#5ec27a",
    cardSubtitle: "네이버 검색 광고 계정 연결",
  },
  credentialFields: [
    { key: "api_key", label: "액세스라이선스", placeholder: "010000000050e04ece..." },
    { key: "secret_key", label: "비밀키", placeholder: "AQAAAAD1GRmybWH..." },
    { key: "customer_id", label: "CUSTOMER_ID", placeholder: "1655763" },
  ],
  mapping: {
    table: "naver_ad_accounts",
    accountIdColumn: "naver_customer_id",
    accountNameColumn: "naver_account_name",
    multiplePerBrand: false,
  },
}

export const tiktokMetadata: ProviderMetadata = {
  id: "tiktok",
  label: "TikTok Ads",
  shortLabel: "TikTok",
  category: "ads",
  authMode: "manual",
  description: "TikTok for Business 개발자 포털에서 발급한 앱 정보와 장기 액세스 토큰을 입력하세요.",
  helpUrl: "https://business-api.tiktok.com/portal/docs?id=1738373141733378",
  helpLabel: "TikTok Business API 인증 문서 →",
  ui: {
    iconMark: "T",
    iconBg: "#FE2C5520",
    iconColor: "#FE4D6A",
    cardSubtitle: "TikTok 광고주 계정 연결",
  },
  credentialFields: [
    { key: "app_id", label: "App ID", placeholder: "7234567890123456789" },
    { key: "secret", label: "App Secret", placeholder: "TikTok 앱 시크릿" },
    { key: "access_token", label: "Access Token", placeholder: "a1b2c3d4..." },
  ],
  mapping: {
    table: "tiktok_ad_accounts",
    accountIdColumn: "tiktok_advertiser_id",
    accountNameColumn: "tiktok_advertiser_name",
    multiplePerBrand: false,
  },
}

export const ga4Metadata: ProviderMetadata = {
  id: "ga4",
  label: "GA4 (Google Analytics)",
  shortLabel: "GA4",
  category: "analytics",
  authMode: "oauth",
  description:
    "Google 계정을 연결하면 GA4 속성 목록을 불러와 브랜드별로 연결할 수 있습니다. 한 브랜드에 여러 속성을 매핑할 수 있습니다.",
  helpUrl: "https://analytics.google.com/analytics/web/",
  helpLabel: "Google Analytics 관리 콘솔 →",
  ui: {
    iconMark: "G",
    iconBg: "#FBBC0520",
    iconColor: "#E8B04B",
    cardSubtitle: "GA4 속성 연결 (여러 개 가능)",
  },
  supportsManualAdd: true,
  mapping: {
    table: "ga4_properties",
    accountIdColumn: "property_id",
    accountNameColumn: "property_name",
    multiplePerBrand: true,
  },
}

export const PROVIDER_METADATA: ProviderMetadata[] = [
  metaMetadata,
  naverMetadata,
  tiktokMetadata,
  ga4Metadata,
]

export function getProviderMetadata(id: string): ProviderMetadata | null {
  return PROVIDER_METADATA.find((p) => p.id === id) ?? null
}
