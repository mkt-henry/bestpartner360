"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type LogoutButtonProps = {
  className?: string
  label?: string
  pendingLabel?: string
}

export function LogoutButton({
  className,
  label = "로그아웃",
  pendingLabel = "로그아웃 중...",
}: LogoutButtonProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const handleLogout = async () => {
    if (isPending) return

    setIsPending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("[logout] failed to sign out:", error)
        setIsPending(false)
        return
      }

      router.replace("/login")
      router.refresh()
    } catch (error) {
      console.error("[logout] unexpected error:", error)
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleLogout}
      disabled={isPending}
      aria-busy={isPending}
    >
      <svg className="ico" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M8 4H4v12h4" />
        <path d="M12 6l4 4-4 4" />
        <path d="M7 10h9" />
      </svg>
      <span>{isPending ? pendingLabel : label}</span>
    </button>
  )
}
