"use client"

import { useState } from "react"

interface Brand {
  id: string
  name: string
}

export default function CreateUserForm({ brands }: { brands: Brand[] }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
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
      setForm({ email: "", password: "", full_name: "", brand_id: "" })
    } else {
      setStatus("error")
      setMessage(json.error ?? "오류가 발생했습니다.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">이름</label>
        <input
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="홍길동"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">이메일</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="client@example.com"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">비밀번호</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={8}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="8자 이상"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">브랜드</label>
        <select
          value={form.brand_id}
          onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">브랜드 선택 (선택사항)</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
        >
          {status === "loading" ? "생성 중..." : "계정 생성"}
        </button>
        {message && (
          <p className={`text-sm ${status === "success" ? "text-emerald-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </div>
    </form>
  )
}
