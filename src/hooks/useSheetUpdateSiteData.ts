"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import sheetApiRequest from "@/apiRequests/sheet"

interface UpdateSiteData {
  updateVN: any[]
  updateNN: any[]
}

interface UseSheetUpdateSiteDataReturn {
  data: UpdateSiteData | null
  loading: boolean
  refreshing: boolean
  error: Error | null
  refetch: (forceRefresh?: boolean) => Promise<void>
  isStale: boolean
}

/**
 * Hook để fetch dữ liệu từ sheet update site
 * - Không sử dụng cache, luôn fetch dữ liệu mới từ server
 */
export function useSheetUpdateSiteData(autoFetch = true): UseSheetUpdateSiteDataReturn {
  const [data, setData] = useState<UpdateSiteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  const hasInitialized = useRef(false)

  // Fetch dữ liệu từ API
  const fetchData = useCallback(async (showLoading = true, isBackgroundRefresh = false, forceRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setRefreshing(true)
      } else if (showLoading) {
        setLoading(true)
      }
      setError(null)

      const response = await sheetApiRequest.getDataUpdateSite(forceRefresh)
      const updateSiteData: UpdateSiteData = {
        updateVN: response.updateVN || [],
        updateNN: response.updateNN || [],
      }

      setData(updateSiteData)
      setIsStale(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      console.error("Error fetching sheet update site data:", error)
      throw error
    } finally {
      if (isBackgroundRefresh) {
        setRefreshing(false)
      } else if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  // Refetch function để force reload
  const refetch = useCallback(async (forceRefresh = true) => {
    const hasData = !!data
    await fetchData(!hasData, hasData, forceRefresh)
  }, [fetchData, data])

  // Load dữ liệu khi component mount (chỉ chạy một lần)
  useEffect(() => {
    if (!autoFetch || hasInitialized.current) return
    hasInitialized.current = true

    // Luôn fetch dữ liệu mới từ server
    fetchData(true, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Chỉ chạy một lần khi mount

  return {
    data,
    loading,
    refreshing,
    error,
    refetch,
    isStale,
  }
}













