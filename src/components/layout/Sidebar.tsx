"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BarChart2,
  FileText,
  Calendar,
  Image,
  Settings,
  ChevronRight,
  Users,
  Building2,
  KeyRound,
  TrendingUp,
  Eye,
  Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"

const viewerNavFull = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/dashboard/performance", label: "성과", icon: BarChart2 },
  { href: "/dashboard/ga4", label: "GA4 UTM", icon: TrendingUp },
  { href: "/dashboard/activity", label: "운영 현황", icon: FileText },
  { href: "/dashboard/calendar", label: "캘린더", icon: Calendar },
  { href: "/dashboard/creatives", label: "소재", icon: Image },
]

const adminNavFull = [
  { href: "/admin/brands", label: "브랜드 관리", icon: Building2 },
  { href: "/admin/users", label: "계정 관리", icon: Users },
  { href: "/admin/campaigns", label: "브랜드 KPI", icon: BarChart2 },
  { href: "/admin/meta", label: "Meta 인사이트", icon: Megaphone },
  { href: "/admin/ga4-utm", label: "GA4 UTM", icon: TrendingUp },
  { href: "/admin/settings", label: "API 설정", icon: KeyRound },
  { href: "/admin/activity", label: "운영 현황 작성", icon: FileText },
  { href: "/admin/calendar", label: "캘린더 관리", icon: Calendar },
  { href: "/admin/creatives", label: "소재 관리", icon: Image },
  { href: "/admin/viewer", label: "파트너 뷰어", icon: Eye },
]

// 모바일 하단 탭 (짧은 레이블)
const viewerNavMobile = [
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
  { href: "/dashboard/performance", label: "성과", icon: BarChart2 },
  { href: "/dashboard/activity", label: "운영현황", icon: FileText },
  { href: "/dashboard/calendar", label: "캘린더", icon: Calendar },
  { href: "/dashboard/creatives", label: "소재", icon: Image },
]

const adminNavMobile = [
  { href: "/admin/brands", label: "브랜드", icon: Building2 },
  { href: "/admin/users", label: "계정", icon: Users },
  { href: "/admin/campaigns", label: "브랜드KPI", icon: BarChart2 },
  { href: "/admin/activity", label: "운영현황", icon: FileText },
  { href: "/admin/calendar", label: "캘린더", icon: Calendar },
  { href: "/admin/viewer", label: "뷰어", icon: Eye },
]

interface SidebarProps {
  role: UserRole
  brandName?: string
  viewerBasePath?: string // e.g. "/admin/viewer/abc123" — overrides /dashboard prefix
}

export default function Sidebar({ role, brandName, viewerBasePath }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === "admin" && !viewerBasePath
  const baseNav = viewerBasePath ? viewerNavFull : isAdmin ? adminNavFull : viewerNavFull
  const baseMobileNav = viewerBasePath ? viewerNavMobile : isAdmin ? adminNavMobile : viewerNavMobile

  // Rewrite /dashboard to viewerBasePath when in admin viewer mode
  const navItems = viewerBasePath
    ? baseNav.map((item) => ({ ...item, href: item.href.replace("/dashboard", viewerBasePath) }))
    : baseNav
  const mobileNavItems = viewerBasePath
    ? baseMobileNav.map((item) => ({ ...item, href: item.href.replace("/dashboard", viewerBasePath) }))
    : baseMobileNav

  function isActive(href: string) {
    const homeHref = viewerBasePath ?? (isAdmin ? "/admin/brands" : "/dashboard")
    if (href === homeHref) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex-col h-full transition-colors">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">BP</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {brandName ?? "BestPartner360"}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {isAdmin ? "관리자" : "클라이언트"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {active && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-500 dark:text-blue-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-slate-100 dark:border-slate-700">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            설정
          </Link>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex pb-safe">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 transition-colors min-w-0",
                active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] leading-tight font-medium truncate w-full text-center">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
