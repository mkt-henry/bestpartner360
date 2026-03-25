"use client"

import { useRouter } from "next/navigation"
import { LogOut, Bell } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface TopBarProps {
  userName?: string
  title: string
}

export default function TopBar({ userName, title }: TopBarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xs font-medium text-blue-700">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <span className="text-sm text-slate-700">{userName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
