"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Brand { id: string; name: string }

interface UserRowProps {
  user: { id: string; email: string; full_name: string | null; role: string }
  brands: Brand[]
  currentBrandIds: string[]
  isSelf: boolean
  brandNames: string[]
}

export default function UserRow({ user, brands, currentBrandIds, isSelf, brandNames }: UserRowProps) {
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

  function toggleBrand(id: string) {
    setForm(f => ({
      ...f,
      brand_ids: f.brand_ids.includes(id)
        ? f.brand_ids.filter(b => b !== id)
        : [...f.brand_ids, id],
    }))
  }

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

  if (editing) {
    return (
      <tr>
        <td colSpan={5} style={{ padding: "18px 14px" }}>
          <div className="form-grid cols-2" style={{ maxWidth: 600 }}>
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
                새 비밀번호{" "}
                <span style={{ color: "var(--dim)", fontWeight: "normal", textTransform: "none", letterSpacing: "normal" }}>
                  (변경 시만 입력)
                </span>
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
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: form.brand_ids.includes(b.id) ? "var(--amber)" : "var(--line)",
                      background: form.brand_ids.includes(b.id) ? "var(--amber)" : "var(--bg-2)",
                      color: form.brand_ids.includes(b.id) ? "var(--bg)" : "var(--text-2)",
                      cursor: "pointer",
                      fontWeight: form.brand_ids.includes(b.id) ? 500 : 400,
                      transition: "all .15s",
                    }}
                  >
                    {b.name}
                  </button>
                ))}
                {brands.length === 0 && (
                  <span style={{ fontSize: 11, color: "var(--dim)" }}>등록된 브랜드 없음</span>
                )}
              </div>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="btn primary"
              style={loading ? { opacity: 0.6 } : undefined}
            >
              {loading ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="btn"
            >
              취소
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>
        {user.full_name ?? "-"}
      </td>
      <td>{user.email}</td>
      <td>
        <span className={user.role === "admin" ? "tag admin" : "tag client"}>
          {user.role === "admin" ? "관리자" : "고객"}
        </span>
      </td>
      <td>
        {brandNames.join(", ") || "-"}
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setEditing(true)}
            className="btn"
            style={{ padding: "4px 10px" }}
            title="수정"
          >
            수정
          </button>
          {!isSelf && (
            confirmDelete ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--bad)" }}>삭제?</span>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn danger"
                  style={{ padding: "4px 10px" }}
                >
                  확인
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn"
                  style={{ padding: "4px 10px" }}
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn danger"
                style={{ padding: "4px 10px" }}
                title="삭제"
              >
                삭제
              </button>
            )
          )}
        </div>
      </td>
    </tr>
  )
}
