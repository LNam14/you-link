import { Home, Users, UserCircle, Calendar, DollarSign, ClipboardList, FileText, Package, LayoutGrid, Search, Dice6, LucideIcon } from "lucide-react";

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const isVietnamWeekend = (): boolean => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());

  return weekday === "Sat" || weekday === "Sun";
};

export const getMenuGroups = (userRole?: string): MenuGroup[] => {
  const showBauCua = isVietnamWeekend();

  if (userRole === "Khách hàng") {
    return [
      {
        title: "Tools",
        items: [
          { href: "/dashboard/tool-check-site", label: "Tool Check Site", icon: FileText },
          ...(showBauCua
            ? [{ href: "/dashboard/bau-cua", label: "Bầu cua", icon: Dice6 }]
            : []),
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
        { href: "/dashboard/top-google", label: "Top 50 Google", icon: Search },
        ...(showBauCua
          ? [{ href: "/dashboard/bau-cua", label: "Bầu cua", icon: Dice6 }]
          : []),
      ],
    },
  ];
};

export const homeMenuItem: MenuItem = {
  href: "/dashboard",
  label: "Trang chủ",
  icon: Home,
};

