"use client"

import { useState, useEffect } from "react"
import authApiRequest from "@/apiRequests/auth"

export function useCustomerCount() {
    const [count, setCount] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchCount = async () => {
            try {
                setIsLoading(true)
                // Add cache-busting parameter to prevent caching
                const timestamp = new Date().getTime()
                const result: any = await authApiRequest.getCount(timestamp)

                if (result && result.success) {
                    const customerCount = result.count || 0
                    setCount(customerCount)
                } else {
                    setError("Failed to fetch customer count")
                }
            } catch (error) {
                console.error("Error fetching customer count:", error)
                setError("Error fetching customer count")
            } finally {
                setIsLoading(false)
            }
        }

        fetchCount()
    }, [])

    return { count, isLoading, error }
}
