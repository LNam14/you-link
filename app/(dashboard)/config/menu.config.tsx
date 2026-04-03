import { Home, Users, UserCircle, Calendar, DollarSign, ClipboardList, FileText, Package, LayoutGrid, Dice6, LucideIcon } from "lucide-react";

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const getMenuGroups = (userRole?: string): MenuGroup[] => {
  if (userRole === "Khách hàng") {
    return [
      {
        title: "Tools",
        items: [
          { href: "/dashboard/tool-check-site", label: "Tool Check Site", icon: FileText },
          { href: "/dashboard/bau-cua", label: "Bầu Cua", icon: Dice6 },
        ],
      },
    ];
  }

  return [
    {
      title: "Quản lý",
      items: [
        { href: "/dashboard/customers", label: "Quản lý khách hàng", icon: UserCircle },
        ...(userRole === "Admin" 
          ? [{ href: "/dashboard/users", label: "Quản lý tài khoản", icon: Users }]
          : []
        ),
      ],
    },
    {
      title: "Công việc & Thu nhập",
      items: [
        { href: "/dashboard/cham-cong", label: "Chấm công", icon: Calendar },
        { href: "/dashboard/quan-ly-thu-nhap", label: "Quản lý thu nhập", icon: DollarSign },
        { href: "/dashboard/quan-ly-cong-viec", label: "Quản lý công việc", icon: ClipboardList },
      ],
    },
    {
      title: "Tools",
      items: [
        { href: "/dashboard/tool-check-site", label: "Tool Check Site", icon: FileText },
        { href: "/dashboard/tool-check-tong-hop", label: "Tool Check Tổng Hợp", icon: Package },
        { href: "/dashboard/quan-ly-site", label: "Quản lý Site", icon: LayoutGrid },
        { href: "/dashboard/bau-cua", label: "Bầu Cua", icon: Dice6 },
      ],
    },
  ];
};

export const homeMenuItem: MenuItem = {
  href: "/dashboard",
  label: "Trang chủ",
  icon: Home,
};

