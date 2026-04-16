"use client"

interface Props {
  connected: boolean
}

export default function Ga4ConnectButton({ connected }: Props) {
  return (
    <div className="panel">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg style={{ width: 22, height: 22, flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>Google Analytics</p>
            <p style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
              {connected
                ? "계정이 연결되어 있습니다. 각 브랜드에서 GA4 속성을 선택할 수 있습니다."
                : "Google 계정을 연결하면 GA4 속성을 브랜드에 연결할 수 있습니다."}
            </p>
          </div>
        </div>

        {connected ? (
          <span className="status-pill">연결됨</span>
        ) : (
          <a href="/api/admin/ga4/auth" className="btn primary">
            계정 연결
          </a>
        )}
      </div>
    </div>
  )
}
