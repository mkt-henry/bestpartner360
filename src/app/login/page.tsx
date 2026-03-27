"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.")
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single()

      window.location.href = profile?.role === "admin" ? "/admin" : "/dashboard"
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <span className="text-white font-bold text-lg">BP</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">BestPartner360</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">광고 성과 대시보드</p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 transition-colors">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                required
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                  error ? "border-red-400 focus:ring-red-400" : "border-slate-200 dark:border-slate-600 focus:ring-blue-500"
                }`}
                placeholder="이메일 주소 입력"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
                required
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                  error ? "border-red-400 focus:ring-red-400" : "border-slate-200 dark:border-slate-600 focus:ring-blue-500"
                }`}
                placeholder="비밀번호 입력"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition mt-2"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          계정 발급은 담당 대행사에 문의하세요
        </p>
      </div>
    </div>
  )
}
