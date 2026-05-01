import PlatformCredentialsForm from "@/components/admin/PlatformCredentialsForm"

export default function AdminSettingsPage() {
  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>
            API <em>설정</em>
          </h1>
          <p className="sub">
            Meta, 네이버, GA4의 주요 API 키를 DB에 저장해 배포 후에도 연결 상태를 유지합니다.
          </p>
        </div>
      </div>
      <PlatformCredentialsForm />
    </div>
  )
}
