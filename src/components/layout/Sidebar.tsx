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
  Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"

const viewerNav = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/dashboard/performance", label: "성과", icon: BarChart2 },
  { href: "/dashboard/activity", label: "운영 현황", icon: FileText },
  { href: "/dashboard/calendar", label: "캘린더", icon: Calendar },
  { href: "/dashboard/creatives", label: "소재", icon: Image },
]

const adminNav = [
  { href: "/admin/brands", label: "브랜드 관리", icon: Building2 },
  { href: "/admin/users", label: "계정 관리", icon: Users },
  { href: "/admin/campaigns", label: "캠페인 / KPI", icon: Megaphone },
  { href: "/admin/activity", label: "운영 현황 작성", icon: FileText },
  { href: "/admin/calendar", label: "캘린더 관리", icon: Calendar },
  { href: "/admin/creatives", label: "소재 관리", icon: Image },
]

interface SidebarProps {
  role: UserRole
  brandName?: string
}

export default function Sidebar({ role, brandName }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === "admin"

  const navItems = isAdmin ? adminNav : viewerNav

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">BP</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {brandName ?? "BestPartner360"}
            </p>
            <p className="text-xs text-slate-400">
              {isAdmin ? "관리자" : "클라이언트"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === href
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-slate-100">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Settings className="w-4 h-4" />
          설정
        </Link>
      </div>
    </aside>
  )
}
