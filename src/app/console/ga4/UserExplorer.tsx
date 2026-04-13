"use client"

import { useState } from "react"
import { TabGroup } from "../_components/TabGroup"

type User = {
  name: string
  av: string
  dev: string
  loc: string
  src: string
  id: string
  first: string
  rev: string
  when: string
  device: string
  city: string
  events: string
  conv: string
  convKind: "yes" | "no"
}

const USERS: User[] = [
  {
    name: "user_7c4a·k2", av: "K", dev: "📱 iPhone 15 · iOS 17.3", loc: "Seoul · KR",
    src: "Meta Ads / BRD_Prospecting", id: "d29f·1834·bc71", first: "Mar 18, 2026", rev: "₩68,400",
    when: "3 min ago", device: "📱 iPhone 15", city: "Seoul", events: "12 events",
    conv: "◉ Purchase · ₩68,400", convKind: "yes",
  },
  {
    name: "user_19fe·a8", av: "L", dev: "💻 MacBook · Safari 17", loc: "Busan · KR",
    src: "Google / organic", id: "a41e·5523·dd12", first: "Jan 04, 2026", rev: "₩486,200",
    when: "12 min ago", device: "💻 Mac Safari", city: "Busan", events: "18 events",
    conv: "◉ Purchase · ₩142,800", convKind: "yes",
  },
  {
    name: "user_3b21·df", av: "M", dev: "📱 Galaxy S24 · Android 14", loc: "Incheon · KR",
    src: "Email / CRM · welcome_flow", id: "b91c·0098·7721", first: "Feb 12, 2026", rev: "₩182,400",
    when: "32 min ago", device: "📱 Galaxy S24", city: "Incheon", events: "24 events",
    conv: "◉ Purchase · ₩94,200 · 2nd order", convKind: "yes",
  },
  {
    name: "user_842b·19", av: "Y", dev: "📱 iPhone 14 · iOS 17.2", loc: "Tokyo · JP",
    src: "Naver / organic", id: "c722·8844·19ab", first: "Apr 2, 2026", rev: "₩0 · abandoned",
    when: "48 min ago", device: "📱 iPhone 14", city: "Tokyo", events: "9 events",
    conv: "— Abandoned cart · ₩32,400", convKind: "no",
  },
  {
    name: "user_ee31·c2", av: "S", dev: "📱 iPhone 15 Pro · iOS 17.3", loc: "Seoul · KR",
    src: "Direct", id: "e831·2244·bc22", first: "Nov 22, 2025", rev: "₩1,248,000 · VIP",
    when: "1 h ago", device: "📱 iPhone 15 Pro", city: "Seoul", events: "38 events",
    conv: "◉ Purchase · ₩248,000 · VIP", convKind: "yes",
  },
  {
    name: "user_901f·4e", av: "J", dev: "💻 Windows · Chrome 122", loc: "Daegu · KR",
    src: "Meta Ads / Retargeting", id: "f91d·3321·aa81", first: "Mar 28, 2026", rev: "₩58,200",
    when: "1 h ago", device: "💻 Windows Chrome", city: "Daegu", events: "14 events",
    conv: "◉ Purchase · ₩58,200", convKind: "yes",
  },
  {
    name: "user_4aa2·71", av: "R", dev: "📱 iPhone 13 · iOS 16.7", loc: "Daejeon · KR",
    src: "Google / paid", id: "1124·9918·dd38", first: "Apr 10, 2026", rev: "₩0 · exit",
    when: "2 h ago", device: "📱 iPhone 13", city: "Daejeon", events: "6 events",
    conv: "— Exit at checkout", convKind: "no",
  },
  {
    name: "user_2f9d·38", av: "T", dev: "📱 Pixel 8 · Android 14", loc: "Osaka · JP",
    src: "Instagram / social", id: "2e81·7722·af19", first: "Feb 28, 2026", rev: "₩78,400",
    when: "3 h ago", device: "📱 Pixel 8", city: "Osaka", events: "22 events",
    conv: "◉ Purchase · ₩78,400", convKind: "yes",
  },
]

const TIMELINE = [
  { kind: "start", time: "14:02:18", t: "Session start · landed on <code>/</code>", m: [["Referrer", "Meta Ads"], ["Campaign", "Spring·Brand·Prospecting"], ["Creative", "CR-01-v3"]] },
  { kind: "", time: "14:02:36", t: "<code>scroll</code> — 75% of home page", m: [["Dwell", "18s"]] },
  { kind: "", time: "14:02:54", t: '<code>click</code> — "Shop the starter kit"', m: [["Element", "hero_cta_primary"]] },
  { kind: "", time: "14:02:56", t: "<code>page_view</code> · <code>/shop/starter-kit</code>", m: [["Product", "Morning Ritual · 6-bottle"], ["Price", "₩68,400"]] },
  { kind: "", time: "14:03:01", t: "<code>view_item</code> — Morning Ritual 6-bottle", m: [["SKU", "MR-6-KR"], ["Category", "Starter"]] },
  { kind: "", time: "14:05:15", t: "<code>scroll</code> · reached review section", m: [["Reviews viewed", "6"], ["Dwell", "2m 14s"]] },
  { kind: "", time: "14:05:42", t: "<code>add_to_cart</code>", m: [["Qty", "1"], ["Value", "₩68,400"]] },
  { kind: "", time: "14:05:44", t: "<code>page_view</code> · <code>/cart</code>", m: [["Cart total", "₩68,400"]] },
  { kind: "", time: "14:06:12", t: "<code>begin_checkout</code>", m: [["Step", "1 of 3"]] },
  { kind: "", time: "14:09:48", t: "<code>add_payment_info</code>", m: [["Method", "Naver Pay"]] },
  { kind: "conv", time: "14:11:00", t: '<code>purchase</code> · <b style="color:var(--good)">Order MK-24817</b>', m: [["Value", "₩68,400"], ["Tax", "₩6,218"], ["Shipping", "free"], ["Items", "1"]] },
  { kind: "end", time: "14:11:00", t: "Session end · exit from <code>/thank-you</code>", m: [["Duration", "8m 42s"], ["Engagement", "high"]] },
]

export function UserExplorer() {
  const [idx, setIdx] = useState(0)
  const u = USERS[idx]

  return (
    <div className="panel">
      <div className="p-head">
        <h3>User Explorer</h3>
        <div className="sub">Individual journeys · last 24 h · 18,240 users</div>
        <TabGroup tabs={["Converters", "High-value", "At-risk", "New"]} initial="Converters" />
        <button className="more">···</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr" }}>
        <div className="users-list">
          {USERS.map((user, i) => (
            <div
              key={user.name}
              className={`ul-row ${i === idx ? "on" : ""}`}
              onClick={() => setIdx(i)}
            >
              <div className="top">
                <b>{user.name}</b>
                <span className="t">· {user.when}</span>
              </div>
              <div className="mid">
                <span>{user.device}</span>
                <span className="k">{user.city}</span>
                <span>{user.events}</span>
              </div>
              <div className={`conv ${user.convKind}`}>{user.conv}</div>
            </div>
          ))}
        </div>

        <div className="user-detail">
          <div className="ud-head">
            <div className="av">{u.av}</div>
            <div>
              <div className="n">{u.name}</div>
              <div className="s">
                <span>{u.dev}</span>
                <span>📍 <b>{u.loc}</b></span>
                <span>Source · <b>{u.src}</b></span>
                <span>Device ID · <b>{u.id}</b></span>
                <span>First seen · <b>{u.first}</b></span>
              </div>
            </div>
            <div className="rev">
              {u.rev}
              <small>Lifetime</small>
            </div>
          </div>

          <div className="session-band">
            <span>Session · <b>sess_b832·a7</b> · 8m 42s</span>
            <span><b>12</b> events · <b>1</b> conversion</span>
          </div>

          <div className="timeline">
            {TIMELINE.map((e, i) => (
              <div key={i} className={`tl-event ${e.kind}`}>
                <div className="dot" />
                <div className="body">
                  <div className="t" dangerouslySetInnerHTML={{ __html: e.t }} />
                  <div className="m">
                    {e.m.map(([k, v], j) => (
                      <span key={j}>
                        {k} · <b>{v}</b>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="time">{e.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
