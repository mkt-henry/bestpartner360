import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Topbar, FooterBar } from "../_components/Topbar"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type Experiment = {
  id: string
  name: string
  hypothesis: string | null
  platform: string | null
  status: "planned" | "running" | "completed" | "stopped"
  start_date: string | null
  end_date: string | null
  primary_metric: string | null
}

type ExperimentResult = {
  id: string
  experiment_id: string
  variant_label: string
  lift_pct: number | null
  confidence: number | null
  is_winner: boolean | null
  recorded_at: string
}

function durationLabel(start: string | null, end: string | null): string {
  if (!start) return "—"
  const s = new Date(start)
  const e = end ? new Date(end) : new Date()
  const diff = Math.max(0, Math.floor((e.getTime() - s.getTime()) / 86400000))
  return diff < 2 ? `${Math.max(1, Math.floor((Date.now() - s.getTime()) / 3600000))}h` : `${diff}d`
}

export default async function ConsoleExperimentsPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "Brand"

  if (!userId) redirect("/login")
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  const supabase = await createClient()
  let experiments: Experiment[] = []
  let results: ExperimentResult[] = []
  let schemaMissing = false

  if (brandIds.length > 0) {
    const expRes = await supabase
      .from("experiments")
      .select("id, name, hypothesis, platform, status, start_date, end_date, primary_metric")
      .in("brand_id", brandIds)
      .order("created_at", { ascending: false })

    if (expRes.error?.code === "42P01") {
      schemaMissing = true
    } else {
      experiments = (expRes.data ?? []) as Experiment[]
      const ids = experiments.map((e) => e.id)
      if (ids.length > 0) {
        const resultRes = await supabase
          .from("experiment_results")
          .select("id, experiment_id, variant_label, lift_pct, confidence, is_winner, recorded_at")
          .in("experiment_id", ids)
          .order("recorded_at", { ascending: false })
        if (resultRes.error?.code === "42P01") {
          schemaMissing = true
        } else {
          results = (resultRes.data ?? []) as ExperimentResult[]
        }
      }
    }
  }

  const latestByExp = new Map<string, ExperimentResult>()
  for (const r of results) {
    if (!latestByExp.has(r.experiment_id)) latestByExp.set(r.experiment_id, r)
  }

  const active = experiments.filter((e) => e.status === "running")
  const completed = experiments.filter((e) => e.status === "completed" || e.status === "stopped").slice(0, 8)
  const nearingSig = active.filter((e) => {
    const r = latestByExp.get(e.id)
    return r && r.confidence !== null && r.confidence >= 80 && r.confidence < 95
  }).length

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: brandName },
          { label: "Experiments", strong: true },
        ]}
      />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#b7e24a20", color: "#B7E24A" }}>
                +
              </span>
              <span>
                A/B Tests · {active.length} running · {completed.length} completed
              </span>
            </div>
            <h1>
              Experiments &amp; <em>tests</em>
            </h1>
            <div className="dh-meta">
              <span>{active.length} active experiments</span>
              <span>·</span>
              <span>{nearingSig} nearing significance</span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        {schemaMissing && (
          <div className="panel">
            <div className="p-body" style={{ padding: 24, color: "var(--dim)", fontSize: 12 }}>
              Experiments 모듈 DB 스키마가 아직 적용되지 않았습니다.{" "}
              <code>supabase/migrations/009_experiments.sql</code> 마이그레이션을 실행하세요.
            </div>
          </div>
        )}

        <div className="panel">
          <div className="p-head">
            <h3>Active Experiments</h3>
            <div className="sub">{active.length} running</div>
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
                {active.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      {schemaMissing ? "스키마 미적용" : "진행 중인 실험이 없습니다."}
                    </td>
                  </tr>
                )}
                {active.map((e) => {
                  const r = latestByExp.get(e.id)
                  const conf = r?.confidence ?? null
                  const lift = r?.lift_pct ?? null
                  return (
                    <tr key={e.id}>
                      <td>
                        <div>{e.name}</div>
                        {e.hypothesis && <div className="cell-sub">{e.hypothesis}</div>}
                      </td>
                      <td>{e.platform ?? "—"}</td>
                      <td
                        className="num"
                        style={conf !== null && conf >= 95 ? { color: "var(--good)" } : undefined}
                      >
                        {conf !== null ? `${conf.toFixed(0)}%` : "—"}
                      </td>
                      <td
                        className="num"
                        style={
                          lift !== null
                            ? { color: lift > 0 ? "var(--good)" : "var(--bad)" }
                            : undefined
                        }
                      >
                        {lift !== null ? `${lift >= 0 ? "+" : ""}${lift.toFixed(1)}%` : "—"}
                      </td>
                      <td className="num">{durationLabel(e.start_date, e.end_date)}</td>
                      <td className="num">
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 3,
                            background: "#5ec27a14",
                            color: "var(--good)",
                            border: "1px solid #5ec27a33",
                          }}
                        >
                          Running
                        </span>
                      </td>
                    </tr>
                  )
                })}
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
            {completed.length === 0 && (
              <div style={{ padding: 16, color: "var(--dim)", fontSize: 11, textAlign: "center" }}>
                완료된 실험이 없습니다.
              </div>
            )}
            {completed.map((e) => {
              const r = latestByExp.get(e.id)
              const won = r?.is_winner === true
              return (
                <div key={e.id} className="log-row">
                  <div className={`d ${won ? "" : "sys"}`} />
                  <div className="who">
                    {e.name}
                    <span className="when">{e.end_date ?? "—"}</span>
                  </div>
                  <div className="what">
                    {e.hypothesis ?? "—"}
                    {r?.lift_pct !== null && r?.lift_pct !== undefined
                      ? ` · lift ${r.lift_pct >= 0 ? "+" : ""}${r.lift_pct.toFixed(1)}%`
                      : ""}
                  </div>
                  <div className="act">{won ? "Winner" : "No winner"}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}
