"use client";

import { useEffect } from "react";
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext";
import BauCua from "@/components/bau-cua/BauCua";

export default function BauCuaPage() {
  const { setHeaderData } = useHeader();

  useEffect(() => {
    setHeaderData({
      title: "Bầu Cua Tôm Cá",
      subTitle: "Chọn con vật may mắn của bạn",
      tabs: [],
      activeTab: "",
      onTabChange: () => {},
      refreshButton: false,
      customControls: null,
    });
  }, [setHeaderData]);

  return <BauCua />;
}
