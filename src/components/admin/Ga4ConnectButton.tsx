"use client"

import { CheckCircle2 } from "lucide-react"

interface Props {
  connected: boolean
}

export default function Ga4ConnectButton({ connected }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Google Analytics</p>
          <p className="text-xs text-slate-400">
            {connected
              ? "계정이 연결되어 있습니다. 각 브랜드에서 GA4 속성을 선택할 수 있습니다."
              : "Google 계정을 연결하면 GA4 속성을 브랜드에 연결할 수 있습니다."}
          </p>
        </div>
      </div>

      {connected ? (
        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          연결됨
        </span>
      ) : (
        <a
          href="/api/admin/ga4/auth"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
        >
          계정 연결
        </a>
      )}
    </div>
  )
}
