import type { SupabaseClient } from "@supabase/supabase-js"

export type ProviderId = "meta" | "naver" | "tiktok" | "ga4"
export type AuthMode = "manual" | "oauth"
export type ProviderCategory = "ads" | "analytics"

export interface CredentialField {
  key: string
  label: string
  placeholder: string
}

export interface ProviderAccount {
  id: string
  name: string
  status?: string | null
}

export type ListAccountsResult =
  | { ok: true; accounts: ProviderAccount[] }
  | { ok: false; error: string; status?: number }

export interface ProviderMappingSchema {
  table: string
  accountIdColumn: string
  accountNameColumn: string
  /** true when a brand may link multiple accounts (e.g. GA4 properties). */
  multiplePerBrand: boolean
}

export interface ProviderUi {
  /** Short mark shown in the icon tile (e.g. "M", "N", "G"). */
  iconMark: string
  /** Icon tile background (semi-transparent tint). */
  iconBg: string
  /** Icon tile foreground / brand accent color. */
  iconColor: string
  /** One-line subtitle under the provider name in brand cards. */
  cardSubtitle: string
}

/**
 * Client-safe provider metadata. No server imports, no secrets — safe to
 * import from "use client" components.
 */
export interface ProviderMetadata {
  id: ProviderId
  label: string
  shortLabel: string
  category: ProviderCategory
  authMode: AuthMode
  description: string
  helpUrl: string
  helpLabel: string
  ui: ProviderUi
  /** True if user may type in account id/name directly (GA4 fallback). */
  supportsManualAdd?: boolean
  /** Manual-auth credential fields. Undefined for OAuth providers. */
  credentialFields?: CredentialField[]
  mapping: ProviderMappingSchema
}

/**
 * Server-side provider definition. Includes the metadata plus methods that
 * call external APIs with service-role credentials. Never import from
 * "use client" files.
 */
export interface ProviderDefinition extends ProviderMetadata {
  /** Fetch the account/property list this provider exposes. */
  listAccounts: () => Promise<ListAccountsResult>
  /** Returns true when the provider is fully configured (tokens present). */
  hasCredentials: () => Promise<boolean>
  /** Optional custom link handler — used when upsert shape isn't {brand_id, id, name}. */
  linkAccount?: (
    supabase: SupabaseClient,
    payload: { brand_id: string; account_id: string; account_name: string }
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  /** Optional custom unlink — used when delete key isn't accountIdColumn. */
  unlinkAccount?: (
    supabase: SupabaseClient,
    payload: { account_id: string; brand_id?: string }
  ) => Promise<{ ok: true } | { ok: false; error: string }>
}
