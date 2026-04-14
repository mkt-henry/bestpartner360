import { Topbar, FooterBar } from "../_components/Topbar"

export default function AlertsPage() {
  return (
    <>
      <Topbar crumbs={[{ label: "Workspace" }, { label: "Haeundae" }, { label: "Alerts", strong: true }]} alerts={3} />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#e5553b20", color: "#E5553B" }}>!</span>
              <span>Alert center · 3 active · 12 resolved today</span>
            </div>
            <h1>Alerts &amp; <em>rules</em></h1>
            <div className="dh-meta">
              <span style={{ color: "var(--bad)" }}>1 critical</span>
              <span>·</span>
              <span style={{ color: "var(--amber)" }}>2 warnings</span>
              <span>·</span>
              <span>8 active rules</span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn primary">＋ New rule</button>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="panel alerts">
          <div className="p-head">
            <h3>Active Alerts</h3>
            <div className="sub">3 unresolved</div>
          </div>
          <div className="p-body">
            {ALERTS.map((a, i) => (
              <div key={i} className={`alert ${a.kind}`}>
                <div className="bullet" />
                <div className="body">
                  <div className="top">
                    <span className="tag">{a.tag}</span>
                    <span className="time">{a.time}</span>
                  </div>
                  <div className="msg" dangerouslySetInnerHTML={{ __html: a.msg }} />
                  <div className="meta" dangerouslySetInnerHTML={{ __html: a.meta }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Alert Rules</h3>
            <div className="sub">8 active</div>
            <button className="more">···</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Rule</th>
                  <th>Condition</th>
                  <th>Channel</th>
                  <th className="num">Triggered</th>
                  <th className="num">Status</th>
                </tr>
              </thead>
              <tbody>
                {RULES.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td style={{ fontSize: 11, color: "var(--text-2)" }}>{r.condition}</td>
                    <td>{r.channel}</td>
                    <td className="num">{r.triggered}</td>
                    <td className="num"><span className={`stat-dot`} style={{ display: "inline-block" }} /> Active</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}

const ALERTS = [
  {
    kind: "crit",
    tag: "Critical · Budget",
    time: "2m ago",
    msg: "Campaign <b>Spring·Brand·PROS</b> pacing 148% — will exhaust daily cap in 1h 20m",
    meta: "Meta · Spend <b>₩3.2M / ₩2.2M</b>",
  },
  {
    kind: "warn",
    tag: "Warn · CAC",
    time: "14m",
    msg: "Blended CAC on <b>TikTok / Launch·04</b> up 34% hour-over-hour",
    meta: "₩8,120 → <b>₩10,880</b>",
  },
  {
    kind: "warn",
    tag: "Warn · Funnel",
    time: "3h",
    msg: "Checkout → Payment dropoff <b>+6.2pp</b> on mobile Safari",
    meta: "Investigate · 412 affected sessions",
  },
]

const RULES = [
  { name: "Budget pacing > 130%", condition: "Daily spend > 130% of budget", channel: "Slack + Email", triggered: "12 times" },
  { name: "CAC spike > 25%", condition: "CAC increases > 25% HoH", channel: "Slack", triggered: "8 times" },
  { name: "ROAS drop below 2×", condition: "Campaign ROAS < 2× for 24h", channel: "Email", triggered: "3 times" },
  { name: "Creative fatigue", condition: "Frequency > 3.5 + CTR decline", channel: "Slack + Dashboard", triggered: "6 times" },
  { name: "Funnel dropoff spike", condition: "Step dropoff > +5pp vs 7d avg", channel: "Email", triggered: "4 times" },
  { name: "Monthly goal hit", condition: "Revenue target reached", channel: "Slack", triggered: "1 time" },
  { name: "SEO top 10 movement", condition: "Keyword enters/exits top 10", channel: "Dashboard", triggered: "18 times" },
  { name: "Error rate > 0.5%", condition: "4xx/5xx rate on key pages", channel: "Slack + PagerDuty", triggered: "0 times" },
]
