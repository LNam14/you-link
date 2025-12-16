"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon: any;
}

interface CustomControls {
  currency?: {
    value: "USDT" | "VND";
    exchangeRate?: string;
    onCurrencyChange: (currency: "USDT" | "VND") => void;
    onExchangeRateChange?: (rate: string) => void;
  };
  brand?: {
    value: "F" | "X";
    onBrandChange: (brand: "F" | "X") => void;
  };
  searchType?: {
    value: "Site" | "NCC";
    onSearchTypeChange: (type: "Site" | "NCC") => void;
  };
  refresh?: {
    loading?: boolean;
    refreshing?: boolean;
    isStale?: boolean;
  };
}

interface HeaderContextType {
  title: string;
  subTitle?: string;
  tabs: Tab[] | null;
  activeTab: string | null;
  onTabChange: ((tabId: string) => void) | null;
  refreshButton: boolean;
  onRefresh: (() => void) | null;
  customControls: CustomControls | null;
  setHeaderData: (data: {
    title?: string;
    subTitle?: string;
    tabs?: Tab[] | null;
    activeTab?: string | null;
    onTabChange?: ((tabId: string) => void) | null;
    refreshButton?: boolean;
    onRefresh?: (() => void) | null;
    customControls?: CustomControls | null;
  }) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string>("");
  const [subTitle, setSubTitle] = useState<string>("");
  const [tabs, setTabs] = useState<Tab[] | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [onTabChange, setOnTabChange] = useState<((tabId: string) => void) | null>(null);
  const [refreshButton, setRefreshButton] = useState<boolean>(false);
  const [onRefresh, setOnRefresh] = useState<(() => void) | null>(null);
  const [customControls, setCustomControls] = useState<CustomControls | null>(null);

  const setHeaderData = useCallback((data: {
    title?: string;
    subTitle?: string;
    tabs?: Tab[] | null;
    activeTab?: string | null;
    onTabChange?: ((tabId: string) => void) | null;
    refreshButton?: boolean;
    onRefresh?: (() => void) | null;
    customControls?: CustomControls | null;
  }) => {
    if (data.title !== undefined) setTitle(data.title);
    if (data.subTitle !== undefined) setSubTitle(data.subTitle);
    if (data.tabs !== undefined) setTabs(data.tabs);
    if (data.activeTab !== undefined) setActiveTab(data.activeTab);
    if (data.onTabChange !== undefined) setOnTabChange(() => data.onTabChange || null);
    if (data.refreshButton !== undefined) setRefreshButton(data.refreshButton);
    if (data.onRefresh !== undefined) setOnRefresh(() => data.onRefresh || null);
    if (data.customControls !== undefined) setCustomControls(data.customControls);
  }, []);

  return (
    <HeaderContext.Provider
      value={{
        title,
        subTitle,
        tabs,
        activeTab,
        onTabChange,
        refreshButton,
        onRefresh,
        customControls,
        setHeaderData,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

