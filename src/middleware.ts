import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  let cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet = cookies
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // OAuth 콜백은 미들웨어 인증 체크 건너뛰기
  if (pathname.startsWith("/api/admin/ga4/auth") || pathname.startsWith("/api/admin/ga4/callback")) {
    return NextResponse.next()
  }

  // 미인증 → 로그인 페이지로
  if (!user && !pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // 인증된 경우: user_profiles + 대시보드면 brand_access 병렬 조회
  let profile: { role: string; full_name: string | null } | null = null
  let brandIds: string[] = []
  let brandName: string | null = null

  if (user) {
    const isDashboard = pathname.startsWith("/dashboard")

    const [profileResult, brandResult] = await Promise.all([
      supabase.from("user_profiles").select("role, full_name").eq("id", user.id).single(),
      isDashboard
        ? supabase.from("user_brand_access").select("brand_id, brands(name)").eq("user_id", user.id)
        : Promise.resolve({ data: null }),
    ])

    profile = profileResult.data

    if (brandResult.data) {
      brandIds = brandResult.data.map((b: { brand_id: string }) => b.brand_id)
      const firstBrand = (brandResult.data[0]?.brands as unknown as { name: string } | null)
      brandName = firstBrand?.name ?? null
    }
  }

  // 로그인 페이지 또는 루트 → 콘솔로 진입
  if (user && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/console", request.url))
  }

  // /admin/* 접근 시 role 확인
  if (user && pathname.startsWith("/admin")) {
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // 유저 정보를 헤더로 전달
  if (user && profile) {
    requestHeaders.set("x-user-id", user.id)
    requestHeaders.set("x-user-email", user.email ?? "")
    requestHeaders.set("x-user-role", profile.role)
    requestHeaders.set("x-user-name", encodeURIComponent(profile.full_name ?? user.email ?? ""))
    if (brandIds.length > 0) {
      requestHeaders.set("x-user-brand-ids", brandIds.join(","))
    }
    if (brandName) {
      requestHeaders.set("x-user-brand-name", encodeURIComponent(brandName))
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
