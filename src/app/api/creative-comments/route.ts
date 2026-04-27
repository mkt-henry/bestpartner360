import { NextResponse } from "next/server"
import { sendDiscordFeedbackNotification } from "@/lib/discord"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type CommentRequest = {
  creative_id?: unknown
  content?: unknown
  version_number?: unknown
}

function normalizeVersionNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  return Number.isInteger(num) && num > 0 ? num : NaN
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: CommentRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const creativeId = typeof body.creative_id === "string" ? body.creative_id : ""
  const content = typeof body.content === "string" ? body.content.trim() : ""
  const versionNumber = normalizeVersionNumber(body.version_number)

  if (!creativeId) {
    return NextResponse.json({ error: "creative_id is required" }, { status: 400 })
  }
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "content must be 4000 characters or less" }, { status: 400 })
  }
  if (Number.isNaN(versionNumber)) {
    return NextResponse.json({ error: "version_number must be a positive integer" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { data: creative, error: creativeError } = await admin
    .from("creatives")
    .select("id, brand_id, title, calendar_event_id")
    .eq("id", creativeId)
    .maybeSingle()

  if (creativeError) {
    return NextResponse.json({ error: creativeError.message }, { status: 500 })
  }
  if (!creative) {
    return NextResponse.json({ error: "Creative not found" }, { status: 404 })
  }

  const role = profile?.role ?? "viewer"
  if (role !== "admin") {
    const { data: access, error: accessError } = await admin
      .from("user_brand_access")
      .select("id")
      .eq("user_id", user.id)
      .eq("brand_id", creative.brand_id)
      .maybeSingle()

    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: 500 })
    }
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const { data: comment, error: insertError } = await admin
    .from("creative_comments")
    .insert({
      creative_id: creative.id,
      user_id: user.id,
      content,
      version_number: versionNumber,
    })
    .select("id, content, created_at, user_id, version_number")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  let notification: "sent" | "skipped" | "failed" = "skipped"

  if (role === "viewer") {
    const [{ data: brand }, { data: event }, { data: version }] = await Promise.all([
      admin.from("brands").select("name").eq("id", creative.brand_id).maybeSingle(),
      creative.calendar_event_id
        ? admin
            .from("calendar_events")
            .select("title, event_date, channel")
            .eq("id", creative.calendar_event_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      versionNumber
        ? admin
            .from("creative_versions")
            .select("file_url")
            .eq("creative_id", creative.id)
            .eq("version_number", versionNumber)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    notification = await sendDiscordFeedbackNotification({
      brandName: brand?.name ?? null,
      eventTitle: event?.title ?? null,
      eventDate: event?.event_date ?? null,
      eventChannel: event?.channel ?? null,
      creativeTitle: creative.title ?? null,
      versionNumber: comment.version_number,
      authorName: profile?.full_name ?? user.email ?? "사용자",
      authorEmail: user.email ?? profile?.email ?? null,
      content: comment.content,
      createdAt: comment.created_at,
      fileUrl: version?.file_url ?? null,
    })
  }

  return NextResponse.json({ comment, notification }, { status: 201 })
}
