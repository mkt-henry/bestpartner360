import { Topbar, FooterBar } from "../_components/Topbar"
import { Ga4Content } from "./Ga4Content"

export default function GA4Page() {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: "Haeundae" },
          { label: "GA4 Analytics", strong: true },
        ]}
        alerts={0}
        compare="Previous period"
      />

      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">Ω</span>
              <span>Google Analytics 4 · haeundae.kr · Property G-XK2N8P</span>
            </div>
            <h1>
              Audience &amp; <em>journeys</em>
            </h1>
            <div className="dh-meta">
              <span className="live-pill">Live · streaming</span>
              <span>Apr 1 — Apr 13, 2026</span>
              <span>·</span>
              <span>Compared vs <b>previous period</b></span>
              <span>·</span>
              <span>Attribution · <b>Data-driven</b> / 7d-click + 1d-view</span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn">＋ Segment</button>
            <button className="btn">⇄ Compare</button>
            <button className="btn primary">Open in GA4 ↗</button>
          </div>
        </div>
      </div>

      <Ga4Content />

      <FooterBar />
    </>
  )
}
