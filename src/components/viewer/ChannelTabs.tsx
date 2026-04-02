"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

const CHANNEL_COLORS: Record<string, string> = {
  Meta: "bg-blue-500",
  Instagram: "bg-pink-500",
  Facebook: "bg-blue-600",
  Google: "bg-yellow-500",
  Naver: "bg-green-500",
  Kakao: "bg-yellow-400",
  TikTok: "bg-slate-800",
  YouTube: "bg-red-500",
  GA4: "bg-orange-500",
}

interface Props {
  channels: string[]
  currentChannel: string | null
  basePath?: string
}

function ChannelTabsInner({ channels, currentChannel, basePath }: Props) {
  const searchParams = useSearchParams()
  const base = basePath ?? "/dashboard/performance"

  function buildHref(channel: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (channel) {
      params.set("channel", channel)
    } else {
      params.delete("channel")
    }
    const qs = params.toString()
    return `${base}${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <Link
        href={buildHref(null)}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
          !currentChannel
            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
      >
        전체
      </Link>
      {channels.map((ch) => (
        <Link
          key={ch}
          href={buildHref(ch)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
            currentChannel === ch
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <span className={cn("w-2 h-2 rounded-full", CHANNEL_COLORS[ch] ?? "bg-slate-400")} />
          {ch}
        </Link>
      ))}
    </div>
  )
}

export default function ChannelTabs(props: Props) {
  return (
    <Suspense fallback={null}>
      <ChannelTabsInner {...props} />
    </Suspense>
  )
}
