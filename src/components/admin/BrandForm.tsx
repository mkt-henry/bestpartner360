"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function BrandForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from("brands").insert({ name: name.trim() })

    if (error) {
      setMessage("오류가 발생했습니다: " + error.message)
    } else {
      setMessage("브랜드가 추가되었습니다.")
      setName("")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="브랜드명 입력"
        style={{
          flex: 1,
          padding: '8px 12px',
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 7,
          color: 'var(--text)',
          font: 'inherit',
          fontSize: 12,
          outline: 'none',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--amber)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--line)'}
      />
      <button
        type="submit"
        disabled={loading}
        className="btn primary"
        style={{ opacity: loading ? 0.5 : 1 }}
      >
        추가
      </button>
      {message && (
        <span style={{ fontSize: 11, color: 'var(--good)', marginLeft: 4 }}>{message}</span>
      )}
    </form>
  )
}
