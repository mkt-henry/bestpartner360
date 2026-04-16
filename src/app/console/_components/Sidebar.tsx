"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const monitor = [
  {
    href: "/console",
    label: "개요",
    exact: true,
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <path d="M3 3h6v8H3zM11 3h6v4h-6zM11 9h6v8h-6zM3 13h6v4H3z" />
      </svg>
    ),
  },
  {
    href: "/console/realtime",
    label: "실시간",
    trailing: <span className="dot" />,
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <path d="M3 10a7 7 0 1 0 14 0 7 7 0 0 0-14 0z" />
        <path d="M10 3v7l5 3" />
      </svg>
    ),
  },
  {
    href: "/console/meta-ads",
    label: "Meta Ads",
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M3 8h14M8 3v14" />
      </svg>
    ),
  },
  {
    href: "/console/ga4",
    label: "GA4 분석",
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <path d="M3 16l5-8 4 5 5-9" />
      </svg>
    ),
  },
  {
    href: "/console/search",
    label: "Search Console",
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" />
        <path d="M15 15l3 3" />
      </svg>
    ),
  },
]

const workspace = [
  {
    href: "/console/reports",
    label: "리포트",
    badge: "12",
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <path d="M4 4h12v12H4z" />
        <path d="M4 8h12M8 4v12" />
      </svg>
    ),
  },
  {
    href: "/console/experiments",
    label: "실험",
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <path d="M10 3v14M3 10h14" />
      </svg>
    ),
  },
  {
    href: "/console/alerts",
    label: "알림",
    badge: "3",
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <path d="M3 4l7 8 7-8M3 10l7 8 7-8" />
      </svg>
    ),
  },
  {
    href: "/console/settings",
    label: "설정",
    icon: (
      <svg className="ico" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="3" />
        <path d="M10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2 2M14.5 14.5l2 2M3.5 16.5l2-2M14.5 5.5l2-2" />
      </svg>
    ),
  },
]

type NavItem = {
  href: string
  label: string
  exact?: boolean
  icon: React.ReactNode
  badge?: string
  trailing?: React.ReactNode
}

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

export function Sidebar() {
  const pathname = usePathname() ?? "/console"
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/")

  return (
    <aside>
      <div className="logo">
        <div className="mark">B</div>
        <div className="name">
          BP<em>360</em>
        </div>
        <div className="ver">v3.14</div>
      </div>

      <div className="client-switch">
        <div className="av">H</div>
        <div className="meta">
          <div className="n">Haeundae Kombucha</div>
          <div className="s">속성 3개 · KRW</div>
        </div>
        <div className="chev">▾</div>
      </div>

      <div className="nav-group">
        <div className="title">모니터링</div>
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
          <div className="av">HP</div>
          <div className="meta">
            <div className="n">Henry Park</div>
            <div className="r">관리자</div>
          </div>
          <div className="st" />
        </div>
      </div>
    </aside>
  )
}
