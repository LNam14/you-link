"use client"

import { useState, useCallback, useRef } from "react"

/**
 * Custom hook for handling batch updates to improve performance
 * @param updateFn Function to call for updates
 * @param debounceTime Time to wait before sending batch updates (in ms)
 * @returns Object with update function and loading state
 */
export function useBatchUpdate<T>(updateFn: (data: T) => Promise<any>, debounceTime = 1000) {
  const [isUpdating, setIsUpdating] = useState(false)
  const updateQueueRef = useRef<Map<string, T>>(new Map())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Queue an update to be processed in batch
   * @param key Unique identifier for the update
   * @param data Data to update
   */
  const queueUpdate = useCallback(
    (key: string, data: T) => {
      // Add or update the item in the queue
      updateQueueRef.current.set(key, data)

      // Clear existing timeout if any
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout to process the batch
      timeoutRef.current = setTimeout(() => {
        processQueue()
      }, debounceTime)
    },
    [debounceTime],
  )

  /**
   * Process all queued updates
   */
  const processQueue = useCallback(async () => {
    if (updateQueueRef.current.size === 0) return

    setIsUpdating(true)

    try {
      // Get all updates from the queue
      const updates = Array.from(updateQueueRef.current.values())
      updateQueueRef.current.clear()

      // Process all updates
      await Promise.all(updates.map((update) => updateFn(update)))
    } catch (error) {
      console.error("Error processing batch updates:", error)
    } finally {
      setIsUpdating(false)
    }
  }, [updateFn])

  return {
    queueUpdate,
    isUpdating,
    processQueue,
  }
}
