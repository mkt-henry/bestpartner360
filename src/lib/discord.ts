type DiscordEmbedField = {
  name: string
  value: string
  inline?: boolean
}

type FeedbackNotificationInput = {
  brandName: string | null
  eventTitle: string | null
  eventDate: string | null
  eventChannel: string | null
  creativeTitle: string | null
  versionNumber: number | null
  authorName: string
  authorEmail: string | null
  content: string
  createdAt: string
  fileUrl: string | null
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1))}...`
}

function fieldValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

export async function sendDiscordFeedbackNotification(
  input: FeedbackNotificationInput
): Promise<"sent" | "skipped" | "failed"> {
  const webhookUrl =
    process.env.DISCORD_FEEDBACK_WEBHOOK_URL ?? process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) return "skipped"

  const fields: DiscordEmbedField[] = [
    { name: "브랜드", value: fieldValue(input.brandName), inline: true },
    { name: "일정", value: fieldValue(input.eventTitle), inline: true },
    { name: "버전", value: `${fieldValue(input.versionNumber)}차`, inline: true },
    { name: "작성자", value: fieldValue(input.authorName), inline: true },
    { name: "이메일", value: fieldValue(input.authorEmail), inline: true },
    { name: "일정일", value: fieldValue(input.eventDate), inline: true },
  ]

  if (input.eventChannel) {
    fields.push({ name: "채널", value: input.eventChannel, inline: true })
  }

  if (input.creativeTitle) {
    fields.push({ name: "소재", value: truncate(input.creativeTitle, 1024), inline: false })
  }

  if (input.fileUrl) {
    fields.push({ name: "파일", value: input.fileUrl, inline: false })
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "BestPartner360",
        embeds: [
          {
            title: "새 피드백이 등록되었습니다",
            description: truncate(input.content, 3900),
            color: 0xf59e0b,
            fields,
            timestamp: input.createdAt,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error("[discord] feedback notification failed:", response.status)
      return "failed"
    }

    return "sent"
  } catch (error) {
    console.error("[discord] feedback notification failed:", error)
    return "failed"
  }
}
