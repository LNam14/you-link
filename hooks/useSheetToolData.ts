"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FormattedRow } from "@/lib/services/google-sheets.service";

interface SiteData {
  rowIndex: number;
  sheetName: string;
  cs: string;
  tinhTrang: string;
  site: string;
  chuDe: string;
  linkOut: string;
  DR: string;
  keywords: string;
  trafficTool: string;
  noteKH: string;
  giaBanGP: string;
  giaBanText: string;
  giaBanTextHome: string;
  giaBanTextHeader: string;
  giaMuaGP: string;
  giaMuaText: string;
  giaMuaTextHome: string;
  giaMuaTextHeader: string;
  hoaHongGP: string;
  hoaHongText: string;
  giaCuoiGP: string;
  giaCuoiText: string;
  giaCuoiTextHome: string;
  giaCuoiTextHeader: string;
  loiNhuanGP: string;
  loiNhuanText: string;
  loiNhuanTextHome: string;
  loiNhuanTextHeader: string;
  NCC: string;
  MaNCC: string;
  FileNCC: string[] | string;
  GroupNCC: string[] | string;
  timeText: string;
  keThem:string;
}

interface FilterParams {
  diBong?: string; // "có" | "ko"
  diBET?: string; // "có" | "ko"
  siteVN?: string; // "yes" | "no"
  trafficTool?: string; // "1000" | "10000" | "100000" | "50000" | "1000000"
  giaGP?: string; // "1" | "20" | "40" | "80" | "160"
  DR?: string; // "5" | "10" | "20" | "40" | "60" | "gt20" | "gt40" | "gt60" | "gt80"
  giaText?: string; // "1" | "20" | "40" | "80" | "160"
  ngayCapNhat?: string; // "today" | "week" | "month" | "older"
  chuDe?: string; // comma-separated topics
}

interface UseSheetToolDataOptions {
  search?: string;
  searchType?: "Site" | "NCC";
  filters?: FilterParams;
}

interface UseSheetToolDataReturn {
  data: { gpTextVN: SiteData[] } | null;
  loading: boolean;
  refreshing: boolean;
  refetch: (
    search?: string,
    searchType?: "Site" | "NCC",
    filters?: FilterParams,
    forceLoadAll?: boolean,
    forceRevalidate?: boolean,
  ) => Promise<void>;
  isStale: boolean;
}

// Convert FormattedRow to SiteData
function convertToSiteData(row: FormattedRow): SiteData {
  const convertValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return value.toString();
    if (typeof value === "string") return value;
    return String(value);
  };

  const convertFileNCC = (value: any): string[] | string => {
    if (!value) return "";
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      // Try to parse as JSON array if it looks like one
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Not JSON, return as string
      }
      return value;
    }
    return "";
  };

  return {
    rowIndex: row.rowIndex,
    sheetName: row.sheetName,
    cs: convertValue(row.cs),
    tinhTrang: convertValue(row.tinhTrang),
    site: convertValue(row.site),
    chuDe: convertValue(row.chuDe),
    linkOut: convertValue(row.linkOut),
    DR: convertValue(row.DR),
    keywords: convertValue(row.keywords),
    trafficTool: convertValue(row.trafficTool),
    noteKH: convertValue((row as any).noteKH),
    giaBanGP: convertValue(row.giaBanGP),
    giaBanText: convertValue(row.giaBanText),
    giaBanTextHome: convertValue(row.giaBanTextHome),
    giaBanTextHeader: convertValue(row.giaBanTextHeader),
    giaMuaGP: convertValue(row.giaMuaGP),
    giaMuaText: convertValue(row.giaMuaText),
    giaMuaTextHome: convertValue(row.giaMuaTextHome),
    giaMuaTextHeader: convertValue(row.giaMuaTextHeader),
    hoaHongGP: convertValue(row.hoaHongGP),
    hoaHongText: convertValue(row.hoaHongText),
    giaCuoiGP: convertValue(row.giaCuoiGP),
    giaCuoiText: convertValue(row.giaCuoiText),
    giaCuoiTextHome: convertValue(row.giaCuoiTextHome),
    giaCuoiTextHeader: convertValue(row.giaCuoiTextHeader),
    loiNhuanGP: convertValue(row.loiNhuanGP),
    loiNhuanText: convertValue(row.loiNhuanText),
    loiNhuanTextHome: convertValue(row.loiNhuanTextHome),
    loiNhuanTextHeader: convertValue(row.loiNhuanTextHeader),
    NCC: convertValue(row.NCC),
    MaNCC: convertValue(row.MaNCC),
    FileNCC: convertFileNCC(row.FileNCC),
    GroupNCC: convertFileNCC(row.GroupNCC),
    timeText: convertValue(row.timeText),
    keThem: convertValue(row.keThem)
  };
}

export function useSheetToolData(
  autoFetch: boolean = true,
  options?: UseSheetToolDataOptions
): UseSheetToolDataReturn {
  const [data, setData] = useState<{ gpTextVN: SiteData[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const backgroundRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchRef = useRef<string>("");
  const currentSearchTypeRef = useRef<"Site" | "NCC">("Site");

  // Store ETag for cache validation
  const etagRef = useRef<string | null>(null);

  const fetchData = useCallback(async (isRefresh: boolean = false, search?: string, searchType?: "Site" | "NCC", filters?: FilterParams, forceLoadAll: boolean = false) => {
    const searchTerm = search !== undefined ? search : (options?.search || "");
    const searchTypeValue = searchType || options?.searchType || "Site";
    const filterParams = filters || options?.filters;
    
    // Allow fetch if there's a search term OR filters OR forceLoadAll is true
    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasFilters = filterParams && Object.keys(filterParams).some(key => filterParams[key as keyof FilterParams] !== undefined && filterParams[key as keyof FilterParams] !== "");
    
    // If forceLoadAll is true, allow fetch even without search term or filters
    if (!forceLoadAll && !hasSearchTerm && !hasFilters) {
      // No search term and no filters, don't fetch (unless forceLoadAll)
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Update refs
    currentSearchRef.current = searchTerm;
    currentSearchTypeRef.current = searchTypeValue;
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Get auth token từ localStorage (không bắt buộc cho tool công khai)
      const token = localStorage.getItem("auth-token");

      // Prepare headers với cache validation; chỉ thêm Authorization nếu có token
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      // Thêm API key (nếu được cấu hình) để hạn chế truy cập công khai
      if (process.env.NEXT_PUBLIC_TOOL_API_KEY) {
        headers["x-api-key"] = process.env.NEXT_PUBLIC_TOOL_API_KEY;
      }
      
      // Add ETag for cache validation.
      if (etagRef.current) {
        headers["If-None-Match"] = etagRef.current;
      }

      // Call the API endpoint - sử dụng sheet API with search params
      const searchParams = new URLSearchParams();
      // Chỉ buộc backend bỏ qua cache cho các request refresh chủ động.
      if (isRefresh) {
        searchParams.set("revalidate", "1");
      }
      if (hasSearchTerm && !forceLoadAll) {
        searchParams.set("search", searchTerm);
        searchParams.set("searchType", searchTypeValue);
      }
      
      // Add filter parameters (only if not forceLoadAll)
      if (filterParams && !forceLoadAll) {
        if (filterParams.diBong) searchParams.set("diBong", filterParams.diBong);
        if (filterParams.diBET) searchParams.set("diBET", filterParams.diBET);
        if (filterParams.siteVN) searchParams.set("siteVN", filterParams.siteVN);
        if (filterParams.trafficTool) searchParams.set("trafficTool", filterParams.trafficTool);
        if (filterParams.giaGP) searchParams.set("giaGP", filterParams.giaGP);
        if (filterParams.DR) searchParams.set("DR", filterParams.DR);
        if (filterParams.giaText) searchParams.set("giaText", filterParams.giaText);
        if (filterParams.ngayCapNhat) searchParams.set("ngayCapNhat", filterParams.ngayCapNhat);
        if (filterParams.chuDe) searchParams.set("chuDe", filterParams.chuDe);
      }
      
      const buildUrl = (base?: string) => {
        const normalizedBase = base ? base.replace(/\/$/, "") : "";
        const prefix = normalizedBase || "";
        const qs = searchParams.toString();
        return qs ? `${prefix}/api/sheet/get?${qs}` : `${prefix}/api/sheet/get`;
      };

      const candidateUrls: string[] = [];
      if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        candidateUrls.push(buildUrl(process.env.NEXT_PUBLIC_API_BASE_URL));
      }
      candidateUrls.push(buildUrl());
      if (typeof window !== "undefined") {
        candidateUrls.push(buildUrl(window.location.origin));
      }
      const uniqueCandidateUrls = Array.from(new Set(candidateUrls));

      let response: Response | null = null;
      let lastError: any = null;

      for (const url of uniqueCandidateUrls) {
        try {
          response = await fetch(url, {
            method: "GET",
            headers,
            credentials: "include",
            cache: isRefresh ? "no-store" : "no-cache",
          });

          if (response.status !== 404) {
            break;
          }
          // If 404, try next candidate
          lastError = new Error(`HTTP 404 at ${url}`);
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      if (!response) {
        throw lastError || new Error("Không thể kết nối API sheet/get");
      }

      // Handle 304 Not Modified
      if (response.status === 304) {
        // Data hasn't changed, keep current data
        setIsStale(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let message = "";
        if (errorText) {
          try {
            const parsed = JSON.parse(errorText);
            message = parsed?.message || parsed?.error || "";
          } catch {
            message = errorText;
          }
        }
        throw new Error(message || `HTTP error! status: ${response.status}`);
      }

      // Update ETag from response
      const newEtag = response.headers.get("ETag");
      if (newEtag) {
        etagRef.current = newEtag;
      }

      const result = await response.json();

      // API tool-check trả về { gpTextVN: [...], ncc: [...] } trực tiếp
      // Kiểm tra error response
      if (result.error) {
        throw new Error(result.message || "Failed to fetch data");
      }

      // Extract gpTextVN từ response
      if (result.gpTextVN && Array.isArray(result.gpTextVN)) {
        // Transform the data to match expected format
        const formattedData = result.gpTextVN.map((row: FormattedRow) => convertToSiteData(row));
        setData({
          gpTextVN: formattedData,
        });
        setIsStale(false);
      } else {
        throw new Error("Invalid data format from API");
      }
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      setData(null);
      setIsStale(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  const refetch = useCallback(
    async (
      search?: string,
      searchType?: "Site" | "NCC",
      filters?: FilterParams,
      forceLoadAll?: boolean,
      forceRevalidate?: boolean,
    ) => {
      const isRefresh = forceRevalidate === true ? true : !forceLoadAll;
      await fetchData(isRefresh, search, searchType, filters, forceLoadAll);
    },
    [fetchData],
  );

  useEffect(() => {
    // Only auto-fetch if there's a search term in options
    const searchTerm = options?.search || "";
    if (autoFetch && searchTerm.trim() && !hasFetchedRef.current && !isFetchingRef.current) {
      hasFetchedRef.current = true;
      fetchData(false, searchTerm, options?.searchType);
    } else if (!searchTerm.trim()) {
      // Clear data if no search term
      setData(null);
      setLoading(false);
    }
    
    // Cleanup background refresh timer on unmount
    return () => {
      if (backgroundRefreshTimerRef.current) {
        clearTimeout(backgroundRefreshTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, options?.search, options?.searchType]);

  return {
    data,
    loading,
    refreshing,
    refetch,
    isStale,
  };
}

