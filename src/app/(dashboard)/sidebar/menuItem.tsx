import { uniqueId } from "lodash"
import { MessageSquare, Globe, PackageCheck, PackageOpen, Wallet } from "lucide-react"

export function getMenuItemsFromRole() {
    const menuItems = [
        // {
        //     label: "DASHBOARD",
        //     items: [
        //         {
        //             id: uniqueId(),
        //             href: "/dashboard",
        //             title: "Dashboard",
        //             icon: PackageOpen,
        //         },
        //     ],
        // },
        // {
        //     label: "ĐƠN HÀNG",
        //     items: [
        //         {
        //             id: uniqueId(),
        //             href: "/dashboard/awaiting-approval",
        //             title: "Chờ xử lý",
        //             icon: PackageOpen,
        //         },
        //         // {
        //         //     id: uniqueId(),
        //         //     href: "/dashboard/processing",
        //         //     title: "Đang xử lý",
        //         //     icon: Package,
        //         // },
        //         {
        //             id: uniqueId(),
        //             href: "/dashboard/completed",
        //             title: "Đơn hàng",
        //             icon: PackageCheck,
        //         },
        //         // {
        //         //     id: uniqueId(),
        //         //     href: "/dashboard/ok",
        //         //     title: "Khách hàng",
        //         //     icon: PackageCheck,
        //         // },
        //         // {
        //         //     id: uniqueId(),
        //         //     href: "/dashboard/cancelled",
        //         //     title: "Đã hủy",
        //         //     icon: PackageX,
        //         // },
        //     ],
        // },
        // {
        //     label: "TÀI KHOẢN",
        //     items: [
        //         {
        //             id: uniqueId(),
        //             href: "/dashboard/account",
        //             title: "Tài khoản",
        //             icon: Globe,
        //         },
        //         // {
        //         //     id: uniqueId(),
        //         //     href: "/dashboard/chat-bot",
        //         //     title: "Chat Bot",
        //         //     icon: MessageSquare,
        //         // },
        //     ],
        // },
        {
            label: "NẠP TIỀN",
            items: [
                {
                    id: uniqueId(),
                    href: "/dashboard/transactions",
                    title: "Nạp tiền",
                    icon: Wallet,
                },
                // {
                //     id: uniqueId(),
                //     href: "/dashboard/chat-bot",
                //     title: "Chat Bot",
                //     icon: MessageSquare,
                // },
            ],
        },
        // {
        //     label: "KHÁC",
        //     items: [
        //         {
        //             id: uniqueId(),
        //             href: "/dashboard/not-found",
        //             title: "Site not found",
        //             icon: Globe,
        //         },
        //         {
        //             id: uniqueId(),
        //             href: "/dashboard/chat-bot",
        //             title: "Chat Bot",
        //             icon: MessageSquare,
        //         },
        //     ],
        // },
    ]

    return menuItems
}

const menuItems = getMenuItemsFromRole()

export default menuItems