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
import { useAuthGuard } from "./hooks/useAuthGuard";
import { getMenuGroups, MenuGroup } from "./config/menu.config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isSidebarOpen, closeSidebar, toggleSidebar } = useSidebar();
  const { shouldRender } = useAuthGuard();
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure menuGroups is calculated after mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    setMenuGroups(getMenuGroups(user?.role));
  }, [user?.role]);

  // Show loading state if checking auth, but limit the time to avoid infinite loading
  // If loading takes too long, allow render anyway (might be network issue)
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);
  
  useEffect(() => {
    if (!shouldRender) {
      // Set timeout to show content even if auth check is slow
      const timer = setTimeout(() => {
        setShowLoadingTimeout(true);
      }, 3000); // 3 seconds max loading
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingTimeout(false);
    }
  }, [shouldRender]);
  
  // Show loading only if not timed out
  if (!shouldRender && !showLoadingTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    );
  }
  
  // If timed out or should render, show content
  // This prevents infinite loading screen

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

