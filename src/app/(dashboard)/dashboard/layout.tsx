"use client";
import * as React from "react";
import useResponsive from "@/hook/useResponsive";
import { useState } from "react";
import { MenuProvider } from "@/app/context/MenuContext";
import Sidebar from "../sidebar/Sidebar";
import Header from "../components/layout/header";
import "@/app/globals.css";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isMobile } = useResponsive();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <html lang="vi">
      <body className="bg-gray-50">
        <MenuProvider>
          <div className="flex">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} />

            {/* Main Content */}
            <motion.main
              initial={{ marginLeft: isSidebarOpen ? "240px" : "64px", width: "calc(100% - 240px)" }}
              animate={{
                marginLeft: isSidebarOpen ? "240px" : "64px",
                width: isSidebarOpen ? "calc(100% - 240px)" : "calc(100% - 64px)"
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed right-0 min-h-screen"
            >
              {/* Header */}
              <Header onMenuToggle={toggleMenu} />

              {/* Page Content */}
              <div className="px-4 w-full">
                {children}
              </div>
            </motion.main>
          </div>
        </MenuProvider>
      </body>
    </html>
  );
}
