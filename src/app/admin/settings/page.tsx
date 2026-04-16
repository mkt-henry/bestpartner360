import PlatformCredentialsForm from "@/components/admin/PlatformCredentialsForm"

export default function AdminSettingsPage() {
  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>API <em>Settings</em></h1>
          <p className="sub">광고 플랫폼의 API 키를 입력하면 계정 연결 기능을 사용할 수 있습니다</p>
        </div>
      </div>
      <PlatformCredentialsForm />
    </div>
  )
}
