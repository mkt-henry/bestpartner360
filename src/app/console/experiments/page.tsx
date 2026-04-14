import { Topbar, FooterBar } from "../_components/Topbar"

export default function ExperimentsPage() {
  return (
    <>
      <Topbar crumbs={[{ label: "Workspace" }, { label: "Haeundae" }, { label: "Experiments", strong: true }]} />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#b7e24a20", color: "#B7E24A" }}>+</span>
              <span>A/B Tests · 3 running · 8 completed</span>
            </div>
            <h1>Experiments &amp; <em>tests</em></h1>
            <div className="dh-meta">
              <span>3 active experiments</span>
              <span>·</span>
              <span>2 nearing significance</span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn primary">＋ New experiment</button>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="panel">
          <div className="p-head">
            <h3>Active Experiments</h3>
            <div className="sub">3 running</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Experiment</th>
                  <th>Platform</th>
                  <th className="num">Confidence</th>
                  <th className="num">Lift</th>
                  <th className="num">Duration</th>
                  <th className="num">Status</th>
                </tr>
              </thead>
              <tbody>
                {EXPERIMENTS.map((e) => (
                  <tr key={e.name}>
                    <td>
                      <div>{e.name}</div>
                      <div className="cell-sub">{e.desc}</div>
                    </td>
                    <td>{e.platform}</td>
                    <td className="num" style={e.confHigh ? { color: "var(--good)" } : undefined}>{e.confidence}</td>
                    <td className="num" style={e.liftGood ? { color: "var(--good)" } : e.liftBad ? { color: "var(--bad)" } : undefined}>{e.lift}</td>
                    <td className="num">{e.duration}</td>
                    <td className="num"><span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: e.status === "Running" ? "#5ec27a14" : "#e8b04b14", color: e.status === "Running" ? "var(--good)" : "var(--amber)", border: `1px solid ${e.status === "Running" ? "#5ec27a33" : "#e8b04b33"}` }}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Recently Completed</h3>
            <div className="sub">Last 30 days</div>
          </div>
          <div className="p-body" style={{ paddingTop: 8 }}>
            {COMPLETED.map((c, i) => (
              <div key={i} className="log-row">
                <div className={`d ${c.won ? "" : "sys"}`} />
                <div className="who">{c.name}<span className="when">{c.date}</span></div>
                <div className="what">{c.result}</div>
                <div className="act">{c.won ? "Winner" : "No winner"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}

const EXPERIMENTS: { name: string; desc: string; platform: string; confidence: string; confHigh?: boolean; lift: string; liftGood?: boolean; liftBad?: boolean; duration: string; status: string }[] = [
  { name: "EXP-204: Creative hook test", desc: "Morning Ritual — 3 hook variants on Lookalike 1%", platform: "Meta Ads", confidence: "98%", confHigh: true, lift: "+24.8%", liftGood: true, duration: "72h", status: "Running" },
  { name: "EXP-205: PDP layout v2", desc: "New product page with review carousel above fold", platform: "GA4 / Web", confidence: "82%", lift: "+8.2%", liftGood: true, duration: "5d", status: "Running" },
  { name: "EXP-206: Email subject line", desc: "A/B on cart abandon email subject lines", platform: "CRM", confidence: "64%", lift: "+2.1%", duration: "3d", status: "Running" },
]

const COMPLETED = [
  { name: "EXP-201: Lookalike 5% expansion", date: "Apr 4", result: "Lookalike 3% outperformed 5% by 18% ROAS — keeping 3%", won: true },
  { name: "EXP-202: Checkout flow 2-step", date: "Mar 28", result: "2-step checkout reduced dropoff by 12% — shipped to 100%", won: true },
  { name: "EXP-203: TikTok vertical vs square", date: "Mar 22", result: "No significant difference at 95% after 14d — stopped", won: false },
]
