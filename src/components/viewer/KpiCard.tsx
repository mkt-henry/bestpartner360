import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string
  unit?: string
  trend?: number | null
  className?: string
}

export default function KpiCard({ label, value, unit, trend, className }: KpiCardProps) {
  const isPositive = trend !== null && trend !== undefined && trend > 0
  const isNegative = trend !== null && trend !== undefined && trend < 0

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 p-5", className)}>
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-400 mb-0.5">{unit}</span>}
      </div>
      {trend !== null && trend !== undefined && (
        <div
          className={cn(
            "mt-2 text-xs font-medium",
            isPositive && "text-emerald-600",
            isNegative && "text-red-500",
            !isPositive && !isNegative && "text-slate-400"
          )}
        >
          {isPositive && "▲"}
          {isNegative && "▼"}
          {!isPositive && !isNegative && "–"}{" "}
          {Math.abs(trend).toFixed(1)}% 지난 기간 대비
        </div>
      )}
    </div>
  )
}
