"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Brand {
  id: string
  name: string
}

export default function CreateUserForm({ brands }: { brands: Brand[] }) {
  const router = useRouter()
  const DEFAULT_PASSWORD = "Bestpartner1!"

  const [form, setForm] = useState({
    email: "",
    password: DEFAULT_PASSWORD,
    full_name: "",
    brand_id: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setMessage("")

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const json = await res.json()
    if (res.ok) {
      setStatus("success")
      setMessage("계정이 생성되었습니다.")
      setForm({ email: "", password: DEFAULT_PASSWORD, full_name: "", brand_id: "" })
      router.refresh()
    } else {
      setStatus("error")
      setMessage(json.error ?? "오류가 발생했습니다.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid cols-2">
      <div>
        <label className="form-label">이름</label>
        <input
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
          className="form-input"
          placeholder="홍길동"
        />
      </div>
      <div>
        <label className="form-label">이메일</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="form-input"
          placeholder="client@example.com"
        />
      </div>
      <div>
        <label className="form-label">
          비밀번호
          <span style={{ marginLeft: 6, color: "var(--dim)", fontWeight: "normal", textTransform: "none", letterSpacing: "normal" }}>
            (디폴트: {DEFAULT_PASSWORD})
          </span>
        </label>
        <input
          type="text"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={8}
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label">브랜드</label>
        <select
          value={form.brand_id}
          onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
          className="form-select"
        >
          <option value="">브랜드 선택 (선택사항)</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn primary"
          style={status === "loading" ? { opacity: 0.6 } : undefined}
        >
          {status === "loading" ? "생성 중..." : "계정 생성"}
        </button>
        {message && (
          <p className={status === "success" ? "form-success" : "form-error"}>
            {message}
          </p>
        )}
      </div>
    </form>
  )
}
