import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import CreateUserForm from "@/components/admin/CreateUserForm"
import UserRow from "@/components/admin/UserRow"
import { Users } from "lucide-react"

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const h = await headers()
  const currentUserId = h.get("x-user-id") ?? ""

  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name")
    .order("name")

  const { data: accesses } = await supabase
    .from("user_brand_access")
    .select("user_id, brand_id, brands(name)")

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">계정 관리</h1>
      </div>

      {/* Create User */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">새 고객 계정 생성</h2>
        <CreateUserForm brands={brands ?? []} />
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            계정 목록
            <span className="text-xs text-slate-400 font-normal ml-2">{users?.length ?? 0}명</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">이름</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">이메일</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">역할</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">브랜드</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {users?.map((u) => {
              const userAccess = accesses?.filter((a) => a.user_id === u.id) ?? []
              const brandIds = userAccess.map((a) => a.brand_id)
              const brandNames = userAccess
                .map((a) => (a.brands as unknown as { name: string } | null)?.name ?? "")
                .filter(Boolean)
              return (
                <UserRow
                  key={u.id}
                  user={u}
                  brands={brands ?? []}
                  currentBrandIds={brandIds}
                  isSelf={u.id === currentUserId}
                  brandNames={brandNames}
                />
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
