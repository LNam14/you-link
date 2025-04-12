import { type StatusType } from "@/types/transactions"

type StatusStyle = {
    bg: string
    text: string
    dot: string
}

const statusStyles: Record<StatusType, StatusStyle> = {
    "Hoàn thành": { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-400" },
    "Lỗi": { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-400" },
    "Đang chờ": { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-400" },
}

const defaultStyle: StatusStyle = {
    bg: "bg-slate-100",
    text: "text-slate-800",
    dot: "bg-slate-400"
}

interface TransactionStatusBadgeProps {
    status: string
}

export default function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
    const style = statusStyles[status as StatusType] || defaultStyle

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
            <span className={`w-2 h-2 mr-2 rounded-full ${style.dot}`}></span>
            {status}
        </span>
    )
} 