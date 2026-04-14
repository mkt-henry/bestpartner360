import { Topbar, FooterBar } from "../_components/Topbar"
import { RealtimeContent } from "./RealtimeContent"

export default function RealtimePage() {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: "Haeundae" },
          { label: "Realtime", strong: true },
        ]}
      />

      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#5ec27a20", color: "#5EC27A" }}>◉</span>
              <span>Cross-platform · All connected sources</span>
            </div>
            <h1>
              Realtime <em>monitor</em>
            </h1>
            <div className="dh-meta">
              <span className="live-pill">Live · streaming</span>
              <span>12 sources connected</span>
              <span>·</span>
              <span>Last event <b>2s ago</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        <RealtimeContent />
      </div>

      <FooterBar />
    </>
  )
}
