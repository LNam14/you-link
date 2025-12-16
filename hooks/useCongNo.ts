import { useState, useEffect, useCallback, useRef } from "react";

interface CongNoItem {
  MaMoi: string;
  CongNo: string;
}

interface UseCongNoReturn {
  congNoData: CongNoItem[];
  loading: boolean;
}

export function useCongNo(): UseCongNoReturn {
  const [congNoData, setCongNoData] = useState<CongNoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);

      // Get auth token from localStorage
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Fetch công nợ data from API
      const response = await fetch("/api/customers/cong-no", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.message || "Failed to fetch data");
      }

      // API trả về mảng [ma_moi, cong_no] hoặc array of objects
      const data = result.data || result || [];
      
      // Convert to format { MaMoi, CongNo }
      const formattedData: CongNoItem[] = data.map((item: any) => {
        if (Array.isArray(item)) {
          // Format: [ma_moi, cong_no]
          return {
            MaMoi: item[0] || "",
            CongNo: item[1] || "0",
          };
        } else if (typeof item === "object") {
          // Format: { MaMoi, CongNo } or { ma_moi, cong_no }
          return {
            MaMoi: item.MaMoi || item.ma_moi || "",
            CongNo: item.CongNo || item.cong_no || "0",
          };
        }
        return { MaMoi: "", CongNo: "0" };
      });

      setCongNoData(formattedData);
    } catch (error) {
      console.error("Error fetching cong no data:", error);
      setCongNoData([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, [fetchData]);

  return {
    congNoData,
    loading,
  };
}

