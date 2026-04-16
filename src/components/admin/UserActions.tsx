"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, X, Check } from "lucide-react"

interface Brand { id: string; name: string }

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface UserActionsProps {
  user: User
  brands: Brand[]
  currentBrandIds: string[]
  isSelf: boolean
}

export default function UserActions({ user, brands, currentBrandIds, isSelf }: UserActionsProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: user.full_name ?? "",
    email: user.email,
    password: "",
    brand_ids: currentBrandIds,
  })

  async function handleUpdate() {
    setLoading(true)
    const res = await fetch("/api/admin/update-user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, ...form }),
    })
    setLoading(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? "수정 중 오류 발생")
    }
  }

  async function handleDelete() {
    setLoading(true)
    const res = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? "삭제 중 오류 발생")
    }
    setConfirmDelete(false)
  }

  function toggleBrand(id: string) {
    setForm(f => ({
      ...f,
      brand_ids: f.brand_ids.includes(id)
        ? f.brand_ids.filter(b => b !== id)
        : [...f.brand_ids, id],
    }))
  }

  if (editing) {
    return (
      <td colSpan={5} style={{ padding: "14px 18px", background: "var(--amber-dim)" }}>
        <div className="form-grid cols-2" style={{ maxWidth: 640 }}>
          <div>
            <label className="form-label">이름</label>
            <input
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">
              새 비밀번호 <span style={{ color: "var(--dim)", fontWeight: "normal", textTransform: "none", letterSpacing: "normal" }}>(변경 시만 입력)</span>
            </label>
            <input
              type="text"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="변경 없으면 비워두세요"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">브랜드 접근</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {brands.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBrand(b.id)}
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: form.brand_ids.includes(b.id) ? "var(--amber)" : "var(--line)",
                    background: form.brand_ids.includes(b.id) ? "var(--amber)" : "var(--bg-2)",
                    color: form.brand_ids.includes(b.id) ? "var(--bg)" : "var(--text-2)",
                    transition: "all .15s",
                    cursor: "pointer",
                  }}
                >
                  {b.name}
                </button>
              ))}
              {brands.length === 0 && <span style={{ fontSize: 10, color: "var(--dim)" }}>등록된 브랜드 없음</span>}
            </div>
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: 10 }}>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="btn primary"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <Check style={{ width: 13, height: 13 }} />
            {loading ? "저장 중..." : "저장"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="btn"
          >
            <X style={{ width: 13, height: 13 }} />
            취소
          </button>
        </div>
      </td>
    )
  }

  return (
    <td style={{ padding: "10px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => setEditing(true)}
          style={{ padding: 4, borderRadius: 4, color: "var(--dim)", transition: "color .15s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--amber)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--dim)"}
          title="수정"
        >
          <Pencil style={{ width: 13, height: 13 }} />
        </button>
        {!isSelf && (
          confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "var(--bad)" }}>삭제?</span>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{ padding: 3, borderRadius: 4, color: "var(--bad)", transition: "background .15s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#e5553b1a"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <Check style={{ width: 13, height: 13 }} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ padding: 3, borderRadius: 4, color: "var(--dim)", transition: "background .15s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ padding: 4, borderRadius: 4, color: "var(--dim)", transition: "color .15s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--bad)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--dim)"}
              title="삭제"
            >
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
          )
        )}
      </div>
    </td>
  )
}
