import { Settings } from "lucide-react"
import PlatformCredentialsForm from "@/components/admin/PlatformCredentialsForm"

export default function AdminSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">플랫폼 API 설정</h1>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        광고 플랫폼의 API 키를 입력하면 계정 연결 기능을 사용할 수 있습니다.
        키는 암호화되어 안전하게 저장됩니다.
      </p>

      <PlatformCredentialsForm />
    </div>
  )
}
