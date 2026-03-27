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
      <td colSpan={5} className="px-5 py-4 bg-blue-50 dark:bg-blue-900/20">
        <div className="grid grid-cols-2 gap-3 max-w-2xl">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">이름</label>
            <input
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">새 비밀번호 <span className="text-slate-400">(변경 시만 입력)</span></label>
            <input
              type="text"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="변경 없으면 비워두세요"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">브랜드 접근</label>
            <div className="flex flex-wrap gap-1.5">
              {brands.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBrand(b.id)}
                  className={`text-xs px-2 py-1 rounded-full border transition ${
                    form.brand_ids.includes(b.id)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400"
                  }`}
                >
                  {b.name}
                </button>
              ))}
              {brands.length === 0 && <span className="text-xs text-slate-400">등록된 브랜드 없음</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition"
          >
            <Check className="w-3.5 h-3.5" />
            {loading ? "저장 중..." : "저장"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-xs font-medium rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
            취소
          </button>
        </div>
      </td>
    )
  }

  return (
    <td className="px-5 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
          title="수정"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {!isSelf && (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-600 dark:text-red-400">삭제?</span>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>
    </td>
  )
}
