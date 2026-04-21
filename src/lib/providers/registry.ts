import { metaProvider } from "./meta"
import { naverProvider } from "./naver"
import { tiktokProvider } from "./tiktok"
import { ga4Provider } from "./ga4"
import type { ProviderDefinition, ProviderId } from "./types"

const providers: Record<ProviderId, ProviderDefinition> = {
  meta: metaProvider,
  naver: naverProvider,
  tiktok: tiktokProvider,
  ga4: ga4Provider,
}

export function getProvider(id: string): ProviderDefinition | null {
  return (providers as Record<string, ProviderDefinition>)[id] ?? null
}

export function getAllProviders(): ProviderDefinition[] {
  return Object.values(providers)
}

export function getManualProviders(): ProviderDefinition[] {
  return getAllProviders().filter((p) => p.authMode === "manual")
}

export function isProviderId(value: string): value is ProviderId {
  return value in providers
}

export type { ProviderDefinition, ProviderId } from "./types"
