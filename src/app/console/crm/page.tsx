import { Topbar, FooterBar } from "../_components/Topbar"

export default function CRMPage() {
  return (
    <>
      <Topbar crumbs={[{ label: "Workspace" }, { label: "Haeundae" }, { label: "CRM & Email", strong: true }]} />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#c77dd620", color: "#C77DD6" }}>E</span>
              <span>CRM · 6 active flows · 84,200 subscribers</span>
            </div>
            <h1>CRM &amp; <em>email</em></h1>
            <div className="dh-meta">
              <span>6 automated flows</span>
              <span>·</span>
              <span>4 campaigns this month</span>
              <span>·</span>
              <span>Avg open rate <b>42.8%</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="kpi-row">
          <div className="kpi"><div className="top">Subscribers</div><div className="v">84<span className="u">.2k</span></div><div className="d"><span className="chg up">▲ 1.2k</span> this month</div></div>
          <div className="kpi"><div className="top">Open rate</div><div className="v">42.8<span className="u">%</span></div><div className="d"><span className="chg up">▲ 2.1pp</span> benchmark 38%</div></div>
          <div className="kpi"><div className="top">Click rate</div><div className="v">8.4<span className="u">%</span></div><div className="d"><span className="chg up">▲ 0.6pp</span></div></div>
          <div className="kpi"><div className="top">Revenue</div><div className="v">₩22<span className="u">.4M</span></div><div className="d"><span className="chg up">▲ 14%</span> vs last month</div></div>
          <div className="kpi"><div className="top">ROAS</div><div className="v">46.7<span className="u">×</span></div><div className="d">₩480k spend</div></div>
          <div className="kpi"><div className="top">Unsubscribe</div><div className="v">0.12<span className="u">%</span></div><div className="d"><span className="chg dn">▼ 0.02pp</span></div></div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Active Flows</h3>
            <div className="sub">6 automated · running</div>
            <button className="more">···</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Flow</th>
                  <th className="num">Sent</th>
                  <th className="num">Open rate</th>
                  <th className="num">Click rate</th>
                  <th className="num">Revenue</th>
                  <th className="num">Rev / email</th>
                </tr>
              </thead>
              <tbody>
                {FLOWS.map((f) => (
                  <tr key={f.name}>
                    <td>
                      <div className="cell-main">
                        <span className={`stat-dot`} />
                        <div>
                          <div>{f.name}</div>
                          <div className="cell-sub">{f.sub}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{f.sent}</td>
                    <td className="num">{f.open}</td>
                    <td className="num">{f.click}</td>
                    <td className="num">{f.rev}</td>
                    <td className="num">{f.rpe}</td>
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

const FLOWS = [
  { name: "Welcome series", sub: "3-step · trigger: signup", sent: "12,840", open: "58.4%", click: "14.2%", rev: "₩8.4M", rpe: "₩654" },
  { name: "Cart abandonment", sub: "2-step · trigger: 1h after abandon", sent: "8,420", open: "48.2%", click: "12.8%", rev: "₩6.2M", rpe: "₩736" },
  { name: "Post-purchase", sub: "3-step · trigger: order confirmed", sent: "6,240", open: "62.1%", click: "8.4%", rev: "₩2.8M", rpe: "₩449" },
  { name: "Win-back", sub: "2-step · trigger: 30d inactive", sent: "4,180", open: "28.4%", click: "4.2%", rev: "₩1.2M", rpe: "₩287" },
  { name: "VIP reorder", sub: "1-step · trigger: 45d since last order", sent: "1,840", open: "52.8%", click: "18.4%", rev: "₩3.2M", rpe: "₩1,739" },
  { name: "Review request", sub: "1-step · trigger: 7d after delivery", sent: "5,420", open: "38.2%", click: "6.8%", rev: "₩0.6M", rpe: "₩111" },
]
