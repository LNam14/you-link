// Shared cache module for sheet data
// Allows multiple API routes to share and invalidate cache

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"
export const CACHE_DURATION = 10 * 60 * 1000 // 10 phút (tăng cache để giảm số lần fetch)

export const sheetCache = new Map<string, { data: any; expiry: number }>()

// Get cache key for a specific spreadsheet
export function getCacheKey(spreadsheetId: string = SPREADSHEET_ID, suffix: string = ""): string {
    return `sheet-${spreadsheetId}${suffix ? `-${suffix}` : ""}`
}

// Invalidate cache for a specific spreadsheet
export function invalidateCache(spreadsheetId: string = SPREADSHEET_ID, suffix: string = ""): void {
    const cacheKey = getCacheKey(spreadsheetId, suffix)
    sheetCache.delete(cacheKey)
    console.log(`[sheetCache] Invalidated cache: ${cacheKey}`)
}

// Invalidate all sheet caches
export function invalidateAllCache(): void {
    const keysToDelete: string[] = []
    for (const key of sheetCache.keys()) {
        if (key.startsWith("sheet-")) {
            keysToDelete.push(key)
        }
    }
    keysToDelete.forEach(key => sheetCache.delete(key))
    console.log(`[sheetCache] Invalidated ${keysToDelete.length} cache entries`)
}

// Get cached data
export function getCachedData(cacheKey: string): any | null {
    const cached = sheetCache.get(cacheKey)
    if (cached && cached.expiry > Date.now()) {
        return cached.data
    }
    return null
}

// Set cached data
export function setCachedData(cacheKey: string, data: any, duration: number = CACHE_DURATION): void {
    sheetCache.set(cacheKey, {
        data,
        expiry: Date.now() + duration,
    })
}

// Cleanup expired cache entries
export function cleanupExpiredCache(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    for (const [key, value] of sheetCache.entries()) {
        if (value.expiry < now) {
            keysToDelete.push(key)
        }
    }
    keysToDelete.forEach(key => sheetCache.delete(key))
    if (keysToDelete.length > 0) {
        console.log(`[sheetCache] Cleaned up ${keysToDelete.length} expired cache entries`)
    }
}

// Run cleanup every minute
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        cleanupExpiredCache()
    }, 60000) // Cleanup mỗi phút
}

