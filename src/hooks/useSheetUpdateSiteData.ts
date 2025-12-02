"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import sheetApiRequest from "@/apiRequests/sheet"

const CACHE_KEY = "sheet_update_site_data_cache"
const CACHE_EXPIRY_KEY = "sheet_update_site_data_cache_expiry"
const CACHE_DURATION = 5 * 60 * 1000 // 5 phút

interface UpdateSiteData {
  updateVN: any[]
  updateNN: any[]
}

interface UseSheetUpdateSiteDataReturn {
  data: UpdateSiteData | null
  loading: boolean // Chỉ true khi lần đầu load và không có cache
  refreshing: boolean // True khi đang refresh background
  error: Error | null
  refetch: () => Promise<void>
  isStale: boolean
}

/**
 * Hook tối ưu để fetch và cache dữ liệu từ sheet update site
 * - Tự động load từ cache ngay lập tức
 * - Fetch dữ liệu mới ở background
 * - Lưu cache vào localStorage để persist qua reload
 */
// Helper function để get cached data synchronously (chỉ dùng ở client)
const getCachedDataSync = (): UpdateSiteData | null => {
  if (typeof window === "undefined") return null

  try {
    const cachedExpiry = localStorage.getItem(CACHE_EXPIRY_KEY)
    if (!cachedExpiry) return null

    const expiryTime = parseInt(cachedExpiry, 10)
    if (Date.now() > expiryTime) {
      return null
    }

    const cachedData = localStorage.getItem(CACHE_KEY)
    if (!cachedData) return null

    return JSON.parse(cachedData) as UpdateSiteData
  } catch (err) {
    return null
  }
}

export function useSheetUpdateSiteData(autoFetch = true): UseSheetUpdateSiteDataReturn {
  // Khởi tạo với cached data ngay từ đầu để tránh re-render
  const [data, setData] = useState<UpdateSiteData | null>(() => {
    if (typeof window !== "undefined") {
      return getCachedDataSync()
    }
    return null
  })
  const [loading, setLoading] = useState(false) // Loading ban đầu (chỉ khi không có cache)
  const [refreshing, setRefreshing] = useState(false) // Đang refresh background
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  const hasInitialized = useRef(false) // Track xem đã khởi tạo chưa

  // Lấy dữ liệu từ cache
  const getCachedData = useCallback((): UpdateSiteData | null => {
    if (typeof window === "undefined") return null

    try {
      const cachedExpiry = localStorage.getItem(CACHE_EXPIRY_KEY)
      if (!cachedExpiry) return null

      const expiryTime = parseInt(cachedExpiry, 10)
      if (Date.now() > expiryTime) {
        // Cache đã hết hạn
        localStorage.removeItem(CACHE_KEY)
        localStorage.removeItem(CACHE_EXPIRY_KEY)
        return null
      }

      const cachedData = localStorage.getItem(CACHE_KEY)
      if (!cachedData) return null

      return JSON.parse(cachedData) as UpdateSiteData
    } catch (err) {
      console.error("Error reading cache:", err)
      return null
    }
  }, [])

  // Lưu dữ liệu vào cache
  const saveToCache = useCallback((dataToCache: UpdateSiteData) => {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache))
      localStorage.setItem(
        CACHE_EXPIRY_KEY,
        (Date.now() + CACHE_DURATION).toString()
      )
    } catch (err) {
      console.error("Error saving cache:", err)
      // Nếu localStorage đầy, xóa cache cũ
      try {
        localStorage.removeItem(CACHE_KEY)
        localStorage.removeItem(CACHE_EXPIRY_KEY)
        localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache))
        localStorage.setItem(
          CACHE_EXPIRY_KEY,
          (Date.now() + CACHE_DURATION).toString()
        )
      } catch (e) {
        console.error("Failed to save cache after cleanup:", e)
      }
    }
  }, [])

  // Fetch dữ liệu từ API
  const fetchData = useCallback(async (showLoading = true, isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setRefreshing(true)
      } else if (showLoading) {
        setLoading(true)
      }
      setError(null)

      const response = await sheetApiRequest.getDataUpdateSite()
      const updateSiteData: UpdateSiteData = {
        updateVN: response.updateVN || [],
        updateNN: response.updateNN || [],
      }

      setData(updateSiteData)
      saveToCache(updateSiteData)
      setIsStale(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      console.error("Error fetching sheet update site data:", error)

      // Nếu có lỗi nhưng có cache, vẫn dùng cache
      const cached = getCachedData()
      if (cached && !data) {
        setData(cached)
        setIsStale(true)
      }
      throw error // Re-throw để component có thể xử lý
    } finally {
      if (isBackgroundRefresh) {
        setRefreshing(false)
      } else if (showLoading) {
        setLoading(false)
      }
    }
  }, [saveToCache, getCachedData, data])

  // Refetch function để force reload
  // Nếu đã có data, chỉ set refreshing, không set loading để tránh flicker
  const refetch = useCallback(async () => {
    const hasData = !!data
    await fetchData(!hasData, hasData) // Nếu có data thì chỉ refreshing, không loading
  }, [fetchData, data])

  // Load dữ liệu khi component mount (chỉ chạy một lần)
  useEffect(() => {
    if (!autoFetch || hasInitialized.current) return
    hasInitialized.current = true

    // Nếu đã có data từ initial state (cache), chỉ cần check stale và refresh background
    if (data) {
      // Kiểm tra xem cache có cũ không
      const cachedExpiry = localStorage.getItem(CACHE_EXPIRY_KEY)
      if (cachedExpiry) {
        const expiryTime = parseInt(cachedExpiry, 10)
        const timeUntilExpiry = expiryTime - Date.now()
        // Nếu cache còn hơn 1 phút thì không đánh dấu là stale
        setIsStale(timeUntilExpiry < 60 * 1000)
      }

      // Fetch dữ liệu mới ở background (không hiển thị loading, chỉ set refreshing)
      fetchData(false, true).catch(() => {
        // Lỗi đã được xử lý trong fetchData
      })
      return
    }

    // Không có cache, fetch ngay với loading state
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







