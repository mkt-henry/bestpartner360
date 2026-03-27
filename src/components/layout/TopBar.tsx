"use client"

import { useRouter } from "next/navigation"
import { LogOut, Sun, Moon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "@/components/ThemeProvider"

interface TopBarProps {
  userName?: string
  title: string
}

export default function TopBar({ userName, title }: TopBarProps) {
  const router = useRouter()
  const { theme, toggle } = useTheme()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-6 flex-shrink-0 transition-colors">
      {/* 모바일: 로고 + 앱명, 데스크탑: 페이지 타이틀 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[10px]">BP</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">BestPartner360</span>
        </div>
        <h2 className="hidden md:block text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
          title={theme === "dark" ? "라이트 모드" : "다크 모드"}
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </button>
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <span className="hidden sm:block text-sm text-slate-700 dark:text-slate-300 max-w-[120px] truncate">{userName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
