"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { UserRole } from "@/types"

type NavItem = {
  href: string
  label: string
  exact?: boolean
  icon: React.ReactNode
  badge?: string
  trailing?: React.ReactNode
}

// ── Icon primitives (inline SVG so bundle stays light) ────────────────
const Icon = {
  grid: (
    <svg className="ico" viewBox="0 0 20 20">
      <path d="M3 3h6v8H3zM11 3h6v4h-6zM11 9h6v8h-6zM3 13h6v4H3z" />
    </svg>
  ),
  chart: (
    <svg className="ico" viewBox="0 0 20 20">
      <path d="M3 16l5-8 4 5 5-9" />
    </svg>
  ),
  trending: (
    <svg className="ico" viewBox="0 0 20 20">
      <path d="M3 13l5-5 4 4 5-7M13 5h4v4" />
    </svg>
  ),
  doc: (
    <svg className="ico" viewBox="0 0 20 20">
      <path d="M5 3h8l3 3v11H5z" />
      <path d="M13 3v4h3" />
    </svg>
  ),
  calendar: (
    <svg className="ico" viewBox="0 0 20 20">
      <rect x="3" y="5" width="14" height="13" rx="1" />
      <path d="M3 9h14M7 3v4M13 3v4" />
    </svg>
  ),
  image: (
    <svg className="ico" viewBox="0 0 20 20">
      <rect x="3" y="4" width="14" height="12" rx="1" />
      <circle cx="7" cy="9" r="1.5" />
      <path d="M3 14l5-4 9 6" />
    </svg>
  ),
  building: (
    <svg className="ico" viewBox="0 0 20 20">
      <path d="M4 17V5h12v12" />
      <path d="M7 8h2M11 8h2M7 11h2M11 11h2M7 14h2M11 14h2" />
    </svg>
  ),
  users: (
    <svg className="ico" viewBox="0 0 20 20">
      <circle cx="7" cy="8" r="3" />
      <path d="M2 17c0-3 2.5-5 5-5s5 2 5 5" />
      <circle cx="14" cy="9" r="2.2" />
      <path d="M12 17c0-2 1.5-3.5 3.5-3.5S19 15 19 17" />
    </svg>
  ),
  megaphone: (
    <svg className="ico" viewBox="0 0 20 20">
      <path d="M3 9v2l10-5v10L3 11" />
      <path d="M6 12v3h3" />
    </svg>
  ),
  key: (
    <svg className="ico" viewBox="0 0 20 20">
      <circle cx="7" cy="13" r="4" />
      <path d="M10 13l7-7M14 8l2 2" />
    </svg>
  ),
  eye: (
    <svg className="ico" viewBox="0 0 20 20">
      <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  ),
  settings: (
    <svg className="ico" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2 2M14.5 14.5l2 2M3.5 16.5l2-2M14.5 5.5l2-2" />
    </svg>
  ),
}

// ── Viewer nav (/dashboard/*) ─────────────────────────────────────────
const viewerMonitor: NavItem[] = [
  { href: "/dashboard", label: "개요", exact: true, icon: Icon.grid },
  { href: "/dashboard/performance", label: "성과", icon: Icon.chart },
  { href: "/dashboard/ga4", label: "GA4 UTM", icon: Icon.trending },
]
const viewerWorkspace: NavItem[] = [
  { href: "/dashboard/activity", label: "운영현황", icon: Icon.doc },
  { href: "/dashboard/calendar", label: "캘린더", icon: Icon.calendar },
  { href: "/dashboard/creatives", label: "소재", icon: Icon.image },
]

// ── Admin nav (/admin/*) ──────────────────────────────────────────────
const adminMonitor: NavItem[] = [
  { href: "/admin/campaigns", label: "브랜드 KPI", icon: Icon.chart },
  { href: "/admin/meta", label: "Meta 인사이트", icon: Icon.megaphone },
  { href: "/admin/ga4-utm", label: "GA4 UTM", icon: Icon.trending },
  { href: "/admin/viewer", label: "파트너 뷰어", icon: Icon.eye },
]
const adminWorkspace: NavItem[] = [
  { href: "/admin/brands", label: "브랜드", icon: Icon.building },
  { href: "/admin/users", label: "계정", icon: Icon.users },
  { href: "/admin/activity", label: "운영현황", icon: Icon.doc },
  { href: "/admin/calendar", label: "캘린더", icon: Icon.calendar },
  { href: "/admin/creatives", label: "소재", icon: Icon.image },
  { href: "/admin/settings", label: "API 설정", icon: Icon.key },
]

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className={active ? "active" : undefined}>
      {item.icon}
      {item.label}
      {item.badge && <span className="badge">{item.badge}</span>}
      {item.trailing}
    </Link>
  )
}

function initials(name: string | undefined | null, fallback: string) {
  if (!name || !name.trim()) return fallback
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

interface SidebarProps {
  role: UserRole
  userName?: string
  brandName?: string
  propertyCount?: number
}

export function Sidebar({ role, userName, brandName, propertyCount }: SidebarProps) {
  const pathname = usePathname() ?? "/dashboard"
  const isAdmin = role === "admin"
  const monitor = isAdmin ? adminMonitor : viewerMonitor
  const workspace = isAdmin ? adminWorkspace : viewerWorkspace

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/")

  const brandDisplay = brandName ?? (isAdmin ? "관리자" : "워크스페이스")
  const brandAvatar = initials(brandName, isAdmin ? "AD" : "WS")
  const userDisplay = userName ?? "사용자"
  const userAvatar = initials(userName, "U")
  const subline = isAdmin
    ? "관리자 워크스페이스"
    : propertyCount != null
      ? `${propertyCount}개 속성 · KRW`
      : "KRW"

  return (
    <aside>
      <div className="logo">
        <div className="mark">B</div>
        <div className="name">
          BP<em>360</em>
        </div>
        <div className="ver">{isAdmin ? "ADMIN" : "V"}</div>
      </div>

      <div className="client-switch">
        <div className="av">{brandAvatar.slice(0, 1)}</div>
        <div className="meta">
          <div className="n">{brandDisplay}</div>
          <div className="s">{subline}</div>
        </div>
        <div className="chev">▾</div>
      </div>

      <div className="nav-group">
        <div className="title">모니터</div>
        <div className="nav">
          {monitor.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item)} />
          ))}
        </div>
      </div>

      <div className="nav-group">
        <div className="title">워크스페이스</div>
        <div className="nav">
          {workspace.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item)} />
          ))}
        </div>
      </div>

      <div className="side-foot">
        <div className="user">
          <div className="av">{userAvatar}</div>
          <div className="meta">
            <div className="n">{userDisplay}</div>
            <div className="r">{isAdmin ? "관리자" : "뷰어"}</div>
          </div>
          <div className="st" />
        </div>
      </div>
    </aside>
  )
}
