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
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="브랜드명 입력"
        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
      >
        추가
      </button>
      {message && <p className="text-sm text-emerald-600 self-center">{message}</p>}
    </form>
  )
}
