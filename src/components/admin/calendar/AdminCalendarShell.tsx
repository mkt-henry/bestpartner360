"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import CalendarView from "@/components/viewer/calendar/CalendarView"
import EventEditModal, { type EventEditModalState } from "./EventEditModal"
import type { CalendarEvent } from "@/types"

interface Brand { id: string; name: string }
interface Campaign { id: string; name: string; brand_id: string; channel: string }

interface AdminCalendarShellProps {
  brands: Brand[]
  campaigns: Campaign[]
  events: CalendarEvent[]
}

export default function AdminCalendarShell({ brands, campaigns, events }: AdminCalendarShellProps) {
  const [modal, setModal] = useState<EventEditModalState | null>(null)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>캘린더 <em>관리</em></h1>
          <div className="sub">
            {events.length}건 · 날짜 셀을 클릭해 새 일정을 추가하거나 이벤트를 클릭해 편집하세요
          </div>
        </div>
        <div className="pg-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => setModal({ mode: "create" })}
          >
            <Plus style={{ width: 14, height: 14 }} />
            새 일정
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="p-body">
          <CalendarView
            events={events}
            editable
            currentUserRole="admin"
            onDayClick={(dateKey) => setModal({ mode: "create", initialDate: dateKey })}
            onEventEdit={(event) => setModal({ mode: "edit", event })}
          />
        </div>
      </div>

      <EventEditModal
        state={modal}
        brands={brands}
        campaigns={campaigns}
        onClose={() => setModal(null)}
      />
    </>
  )
}
