import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let labels: unknown
  try {
    const body = await request.json()
    labels = body.labels
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(labels) || labels.some((l) => typeof l !== "string")) {
    return NextResponse.json({ error: "labels must be a string array" }, { status: 400 })
  }
  const cleaned = (labels as string[])
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20)

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  const role = profile?.role ?? "viewer"

  const { data: event } = await admin
    .from("calendar_events")
    .select("id, brand_id")
    .eq("id", eventId)
    .maybeSingle()

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  if (role !== "admin") {
    const { data: access } = await admin
      .from("user_brand_access")
      .select("id")
      .eq("user_id", user.id)
      .eq("brand_id", event.brand_id)
      .maybeSingle()
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await admin
    .from("calendar_events")
    .update({ labels: cleaned })
    .eq("id", eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ labels: cleaned })
}
