import { createClient } from "@/lib/supabase/server"
import CreateUserForm from "@/components/admin/CreateUserForm"
import { Users } from "lucide-react"

export default async function AdminUsersPage() {
  const supabase = await createClient()

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
        <Users className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">계정 관리</h1>
      </div>

      {/* Create User */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">새 고객 계정 생성</h2>
        <CreateUserForm brands={brands ?? []} />
      </div>

      {/* User List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">계정 목록</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">이름</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">이메일</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">역할</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">브랜드</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users?.map((u) => {
              const userAccess = accesses?.filter((a) => a.user_id === u.id) ?? []
              return (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3 text-sm text-slate-900 font-medium">
                    {u.full_name ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === "admin"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role === "admin" ? "관리자" : "고객"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {userAccess.map((a) => (a.brands as unknown as { name: string } | null)?.name).join(", ") || "-"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
