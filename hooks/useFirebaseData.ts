import { useState, useEffect, useCallback, useRef } from "react";

interface UseFirebaseDataReturn {
  data: any[];
  originalData: any[];
  loading: boolean;
}

export function useFirebaseData(): UseFirebaseDataReturn {
  const [data, setData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
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

      // Fetch customer data from Google Sheets API
      const response = await fetch("/api/sheet/get", {
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

      // Extract data from response
      // API /api/sheet/get trả về object với key là "2C" (customer data)
      // Format: { "2C": [...], "ncc": [...] }
      const fetchedData = result["2C"] || result.data || result.rows || result || [];
      const dataArray = Array.isArray(fetchedData) ? fetchedData : [];

      setData(dataArray);
      setOriginalData(dataArray);
    } catch (error) {
      console.error("Error fetching Firebase data:", error);
      setData([]);
      setOriginalData([]);
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
    data,
    originalData,
    loading,
  };
}

