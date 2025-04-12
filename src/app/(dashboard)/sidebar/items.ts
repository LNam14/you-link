import { LayoutDashboard, Receipt, Settings, Users } from "lucide-react"

interface SidebarItem {
    id: string
    title: string
    href: string
    icon: any
}

export const sidebarItems: SidebarItem[] = [
    {
        id: "dashboard",
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard
    },
    {
        id: "transactions",
        title: "Giao dịch",
        href: "/dashboard/transactions",
        icon: Receipt
    },
    {
        id: "customers",
        title: "Khách hàng",
        href: "/dashboard/customers",
        icon: Users
    },
    {
        id: "settings",
        title: "Cài đặt",
        href: "/dashboard/settings",
        icon: Settings
    }
] 