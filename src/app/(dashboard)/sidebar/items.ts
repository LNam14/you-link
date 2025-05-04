import { LayoutDashboard, Receipt, Settings, Users, Wallet, Clock, ArrowDownUp } from "lucide-react"

interface SidebarItem {
    id: string
    title: string
    href: string
    icon: any
}

export const sidebarItems: SidebarItem[] = [
    {
        id: "deposit-withdrawal",
        title: "Nạp rút",
        href: "/dashboard/transactions",
        icon: ArrowDownUp
    },
    {
        id: "money-management",
        title: "Quản lý tiền",
        href: "/dashboard/money-management",
        icon: Wallet
    },
    {
        id: "time-tracking",
        title: "Chấm công",
        href: "/dashboard/time-tracking",
        icon: Clock
    }
] 