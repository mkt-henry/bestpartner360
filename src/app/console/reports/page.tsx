import { Topbar, FooterBar } from "../_components/Topbar"

export default function ReportsPage() {
  return (
    <>
      <Topbar crumbs={[{ label: "Workspace" }, { label: "Haeundae" }, { label: "Reports", strong: true }]} />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">R</span>
              <span>Reports · 12 saved · 4 scheduled</span>
            </div>
            <h1>Reports &amp; <em>exports</em></h1>
            <div className="dh-meta">
              <span>12 reports</span>
              <span>·</span>
              <span>Last generated <b>4h ago</b></span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn primary">＋ New report</button>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="panel">
          <div className="p-head">
            <h3>All Reports</h3>
            <div className="sub">12 total</div>
            <button className="more">···</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Report</th>
                  <th>Author</th>
                  <th>Type</th>
                  <th className="num">Last run</th>
                  <th className="num">Schedule</th>
                </tr>
              </thead>
              <tbody>
                {REPORTS.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <div>{r.title}</div>
                      <div className="cell-sub">{r.desc}</div>
                    </td>
                    <td>{r.author}</td>
                    <td><span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: r.kind === "ai" ? "#c77dd61a" : r.kind === "sys" ? "#7db8d61a" : "var(--bg-2)", color: r.kind === "ai" ? "#C77DD6" : r.kind === "sys" ? "#7DB8D6" : "var(--text-2)", border: "1px solid var(--line)" }}>{r.type}</span></td>
                    <td className="num">{r.lastRun}</td>
                    <td className="num">{r.schedule}</td>
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

const REPORTS = [
  { title: "Monthly Performance — March 2026", desc: "Cross-channel KPIs, spend, revenue, ROAS", author: "Henry Park", kind: "", type: "Manual", lastRun: "Apr 12", schedule: "Monthly" },
  { title: "Creative fatigue analysis", desc: "Q1 retrospective — CTR decay, frequency impact", author: "BP360 Agent", kind: "ai", type: "AI · Auto", lastRun: "Apr 10", schedule: "Weekly" },
  { title: "Audience expansion test results", desc: "Lookalike 5% vs 3% performance comparison", author: "Jiwoo Lee", kind: "", type: "Manual", lastRun: "Apr 8", schedule: "—" },
  { title: "Weekly budget reconciliation", desc: "Spend vs plan, pacing alerts, reallocation log", author: "System", kind: "sys", type: "Scheduled", lastRun: "Apr 7", schedule: "Weekly" },
  { title: "Conversion path analysis", desc: "Top 3 purchase journeys, touchpoint attribution", author: "BP360 Agent", kind: "ai", type: "AI · Auto", lastRun: "Apr 5", schedule: "Bi-weekly" },
  { title: "Q1 2026 comprehensive report", desc: "Full quarter performance, goals, recommendations", author: "Henry Park", kind: "", type: "Manual", lastRun: "Apr 1", schedule: "Quarterly" },
  { title: "SEO keyword movement tracker", desc: "Top 50 keywords position changes", author: "System", kind: "sys", type: "Scheduled", lastRun: "Apr 3", schedule: "Weekly" },
  { title: "Email flow performance", desc: "All 6 flows — open, click, revenue by flow", author: "System", kind: "sys", type: "Scheduled", lastRun: "Apr 6", schedule: "Weekly" },
]
