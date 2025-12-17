"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/Toaster";
import { HeaderProvider } from "./contexts/HeaderContext";
import DashboardHeader from "@/components/ui/DashboardHeader";
import Sidebar from "./components/Sidebar";
import SidebarOverlay from "./components/SidebarOverlay";
import { useSidebar } from "./hooks/useSidebar";
import { getMenuGroups, MenuGroup } from "./config/menu.config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isSidebarOpen, closeSidebar, toggleSidebar } = useSidebar();
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure menuGroups is calculated after mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    setMenuGroups(getMenuGroups(user?.role));
  }, [user?.role]);

  return (
    <HeaderProvider>
      <div className="flex min-h-screen bg-gray-50 relative">
        <Toaster />
        
        <SidebarOverlay isOpen={isSidebarOpen} onClose={closeSidebar} />
        
        {isMounted && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={closeSidebar}
            pathname={pathname}
            menuGroups={menuGroups}
            onLogout={logout}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full min-h-screen">
          <DashboardHeader
            user={user}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
          />

          <main className="flex-1 bg-gray-50 overflow-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </HeaderProvider>
  );
}

