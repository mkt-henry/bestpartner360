import Link from "next/link"
import { Topbar, FooterBar } from "../_components/Topbar"
import { MetaAdsContent } from "./MetaAdsContent"

export default function MetaAdsPage() {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: "Haeundae" },
          { label: "Meta Ads" },
          { label: "Spring · Brand Prospecting", strong: true },
        ]}
        alerts={0}
        compare="Previous period"
      />

      <div className="detail-head">
        <Link className="back-link" href="/console">
          ← Back to Overview
        </Link>
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">M</span>
              <span>Meta Ads · Conversion Objective · ADV+ Shopping</span>
            </div>
            <h1>
              Spring · Brand <em>Prospecting</em>
            </h1>
            <div className="dh-meta">
              <span className="status-pill">Active</span>
              <span className="sep">·</span>
              <span className="m">ID <b>120219847412</b></span>
              <span className="sep">·</span>
              <span className="m">12 ad sets</span>
              <span className="sep">·</span>
              <span className="m">38 creatives</span>
              <span className="sep">·</span>
              <span className="m">Started <b>Mar 14, 2026</b></span>
              <span className="sep">·</span>
              <span className="m">Owner <b>Henry P.</b></span>
              <span className="sep">·</span>
              <span className="m">Last edit <b>4h ago</b></span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn">⎘ Duplicate</button>
            <button className="btn danger">◼ Pause</button>
            <button className="btn primary">Edit in Meta ↗</button>
          </div>
        </div>

        <div className="budget" style={{ marginBottom: 20 }}>
          <div>
            <div className="l">
              <span>Daily budget · <b>₩2,200,000</b></span>
              <span className="warn">◉ Pacing 148% — will exhaust by 15:40 KST</span>
              <span>Lifetime cap · <b>₩40.0M</b></span>
            </div>
            <div className="bar">
              <b className="over" style={{ width: "64%" }} />
              <span className="tick" style={{ left: "42%" }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "var(--dim)",
                marginTop: 6,
                fontFamily: "var(--c-mono)",
              }}
            >
              <span>Spent today ₩1.42M / ₩2.20M</span>
              <span>Expected at pace · ₩0.96M</span>
              <span>Lifetime ₩12.42M / ₩40.00M</span>
            </div>
          </div>
          <div className="num">4.98<small>× ROAS</small></div>
        </div>
      </div>

      <MetaAdsContent />

      <FooterBar />
    </>
  )
}
