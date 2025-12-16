"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ExtensionData {
    Extension: string;
    NCC: string;
    Domains: string;
    Note: string;
    DR: string;
    DA: string;
    TF: string;
    Spam: string;
    Traffic: string;
    LinkOut: string;
    GiaBanGP: string;
    GiaBanText: string;
    MaSP: string;
    TenNCC: string;
    GiaMuaGP: string;
    GiaMuaText: string;
    HHGP: string;
    HHText: string;
    KeGP: string;
    KeText: string;
}

interface UseExtensionDataReturn {
    data: ExtensionData[] | null;
    loading: boolean;
    refreshing: boolean;
    refetch: (forceRefresh?: boolean) => Promise<void>;
    isStale: boolean;
}

export function useExtensionData(
    autoFetch: boolean = true
): UseExtensionDataReturn {
    const [data, setData] = useState<ExtensionData[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [isStale, setIsStale] = useState<boolean>(false);
    const hasFetchedRef = useRef(false);
    const isFetchingRef = useRef(false);

    const fetchData = useCallback(async (isRefresh: boolean = false) => {
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

            // Get auth token from localStorage
            const token = localStorage.getItem("auth-token");
            if (!token) {
                throw new Error("No authentication token found");
            }

            // Prepare headers
            const headers: HeadersInit = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            // Call the API endpoint
            const searchParams = new URLSearchParams();
            if (isRefresh) {
                searchParams.set("revalidate", "1");
            }

            const url = `/api/sheet/extension?${searchParams.toString()}`;

            const response = await fetch(url, {
                method: "GET",
                headers,
                credentials: "include",
                cache: isRefresh ? "no-store" : "default",
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // API trả về { extension: [...] }
            if (result.error) {
                throw new Error(result.message || "Failed to fetch data");
            }

            // Extract extension data từ response
            if (result.extension && Array.isArray(result.extension)) {
                setData(result.extension);
                setIsStale(false);
            } else {
                throw new Error("Invalid data format from API");
            }
        } catch (error) {
            console.error("Error fetching extension data:", error);
            setData(null);
            setIsStale(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    }, []);

    const refetch = useCallback(async (forceRefresh?: boolean) => {
        await fetchData(forceRefresh || false);
    }, [fetchData]);

    useEffect(() => {
        if (autoFetch && !hasFetchedRef.current && !isFetchingRef.current) {
            hasFetchedRef.current = true;
            fetchData(false);
        }

        return () => {
            // Cleanup if needed
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFetch]);

    return {
        data,
        loading,
        refreshing,
        refetch,
        isStale,
    };
}

