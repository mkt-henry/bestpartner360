import { Topbar, FooterBar } from "../_components/Topbar"

export default function SettingsPage() {
  return (
    <>
      <Topbar crumbs={[{ label: "Workspace" }, { label: "Haeundae" }, { label: "Settings", strong: true }]} />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">⚙</span>
              <span>Workspace settings · Haeundae Kombucha</span>
            </div>
            <h1>Workspace <em>settings</em></h1>
            <div className="dh-meta">
              <span>3 connected sources</span>
              <span>·</span>
              <span>2 team members</span>
              <span>·</span>
              <span>Plan · <b>Pro</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="two">
          <div className="panel">
            <div className="p-head">
              <h3>Connected Sources</h3>
              <div className="sub">3 active</div>
            </div>
            <div className="p-body">
              {SOURCES.map((s) => (
                <div key={s.name} className="geo-row" style={{ gridTemplateColumns: "auto 1fr auto auto" }}>
                  <span className="ic" style={{ width: 22, height: 22, borderRadius: 5, background: s.bg, color: s.color, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600 }}>{s.icon}</span>
                  <span>
                    <div>{s.name}</div>
                    <div style={{ fontSize: 10, color: "var(--dim)" }}>{s.id}</div>
                  </span>
                  <span style={{ color: "var(--good)", fontSize: 10 }}>◉ Connected</span>
                  <span style={{ fontSize: 10, color: "var(--dim)" }}>{s.lastSync}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>Team</h3>
              <div className="sub">2 members</div>
            </div>
            <div className="p-body">
              {TEAM.map((t) => (
                <div key={t.name} className="geo-row" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: t.bg, display: "grid", placeItems: "center", fontSize: 10, color: "#0A0B0E", fontWeight: 600 }}>{t.initials}</span>
                  <span>
                    <div>{t.name}</div>
                    <div style={{ fontSize: 10, color: "var(--dim)" }}>{t.email}</div>
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}>{t.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>General</h3>
            <div className="sub">Workspace configuration</div>
          </div>
          <div className="p-body" style={{ fontSize: 12 }}>
            {CONFIG.map((c, i) => (
              <div key={i} className="log-row" style={{ gridTemplateColumns: "160px 1fr" }}>
                <div className="who">{c.label}</div>
                <div className="what">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}

const SOURCES = [
  { name: "Meta Ads", id: "Account 120219847412", icon: "M", bg: "#1877F220", color: "#6FA8F5", lastSync: "2m ago" },
  { name: "Google Analytics 4", id: "Property G-XK2N8P", icon: "Ω", bg: "#E8B04B20", color: "#E8B04B", lastSync: "Realtime" },
  { name: "Google Search Console", id: "haeundae.kr", icon: "G", bg: "#5EC27A20", color: "#5EC27A", lastSync: "6h ago" },
]

const TEAM = [
  { name: "Henry Park", email: "henry@bp360.io", initials: "HP", bg: "linear-gradient(135deg,#7DB8D6,#2a5e7a)", role: "Admin" },
  { name: "Jiwoo Lee", email: "jiwoo@bp360.io", initials: "JL", bg: "linear-gradient(135deg,#C77DD6,#6a2578)", role: "Editor" },
]

const CONFIG = [
  { label: "Workspace name", value: "Haeundae Kombucha" },
  { label: "Currency", value: "KRW (₩)" },
  { label: "Timezone", value: "Asia/Seoul (KST · UTC+9)" },
  { label: "Attribution model", value: "Data-driven / 7d-click + 1d-view" },
  { label: "Fiscal year start", value: "January" },
  { label: "Plan", value: "Pro · ₩290,000/month" },
  { label: "API key", value: "bp360_live_•••••••4a8f" },
  { label: "Webhook URL", value: "https://hooks.bp360.io/ws/haeundae" },
]
