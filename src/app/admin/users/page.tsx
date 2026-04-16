import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import CreateUserForm from "@/components/admin/CreateUserForm"
import UserRow from "@/components/admin/UserRow"

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
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>계정 <em>관리</em></h1>
          <p className="sub">계정 관리</p>
        </div>
      </div>

      <div className="panel">
        <div className="p-head"><h3>새 고객 계정 생성</h3></div>
        <div className="p-body">
          <CreateUserForm brands={brands ?? []} />
        </div>
      </div>

      <div className="panel">
        <div className="p-head"><h3>계정 목록</h3></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>역할</th>
                <th>브랜드</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
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
