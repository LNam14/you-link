"use client"
import { useState, useEffect, useCallback } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, push, set, remove, update } from "firebase/database"
import { toast } from "sonner"

export const useFirebaseData = () => {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const createEmptyRow = () => {
    return Array(24).fill("")
  }

  // Load data from Firebase
  useEffect(() => {
    const dataRef = ref(database, "customers")

    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        const firebaseData = snapshot.val()
        if (firebaseData) {
          // Convert Firebase object to array with keys
          const dataArray = Object.entries(firebaseData).map(([key, value]: [string, any]) => {
            return [...(value as any[]), key] // Add Firebase key as last element
          })
          setData(dataArray)
        } else {
          setData([])
        }
        setLoading(false)
      },
      (error) => {
        console.error("Firebase error:", error)
        toast.error("Lỗi kết nối Firebase")
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  // Filter data based on search term
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true
    return row.some((cell: any) => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  })

  // Save single row
  const saveRow = useCallback(
    async (rowIndex: number, rowData: any[]) => {
      try {
        const firebaseKey = data[rowIndex]?.[24] // Firebase key is at index 24
        const dataToSave = rowData.slice(0, 24) // Remove Firebase key from data

        if (firebaseKey) {
          // Update existing row
          const rowRef = ref(database, `customers/${firebaseKey}`)
          await set(rowRef, dataToSave)
        } else {
          // Create new row
          const customersRef = ref(database, "customers")
          await push(customersRef, dataToSave)
        }

        toast.success("Đã lưu thành công")
      } catch (error) {
        console.error("Save error:", error)
        toast.error("Lỗi khi lưu dữ liệu")
      }
    },
    [data],
  )

  // Save multiple rows/changes at once
  const saveMultipleRows = useCallback(
    async (changes: any[]) => {
      try {
        const updates: { [key: string]: any } = {}

        changes.forEach(([rowIndex, colIndex, oldVal, newVal]) => {
          const firebaseKey = data[rowIndex]?.[24]
          if (firebaseKey && colIndex < 24) {
            updates[`customers/${firebaseKey}/${colIndex}`] = newVal
          }
        })

        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates)
          toast.success(`Đã cập nhật ${changes.length} thay đổi`)
        }
      } catch (error) {
        console.error("Bulk save error:", error)
        toast.error("Lỗi khi lưu nhiều thay đổi")
      }
    },
    [data],
  )

  const addNewRow = useCallback(async (rowData?: any[]) => {
    try {
      const customersRef = ref(database, "customers")
      const newRowData = rowData || createEmptyRow()
      await push(customersRef, newRowData)
      // No individual toast - will be handled by bulk operation
    } catch (error) {
      console.error("Add row error:", error)
      throw error // Re-throw to be handled by bulk operation
    }
  }, [])

  const addMultipleRows = useCallback(async (rowsData: any[][]) => {
    try {
      const customersRef = ref(database, "customers")
      const promises = rowsData.map((rowData) => {
        return push(customersRef, rowData)
      })

      await Promise.all(promises)
      toast.success(`Đã thêm ${rowsData.length} hàng mới`)
    } catch (error) {
      console.error("Bulk add error:", error)
      toast.error("Lỗi khi thêm nhiều hàng")
    }
  }, [])

  // Delete row
  const deleteRow = useCallback(
    async (rowIndex: number) => {
      try {
        const firebaseKey = data[rowIndex]?.[24]
        if (firebaseKey) {
          const rowRef = ref(database, `customers/${firebaseKey}`)
          await remove(rowRef)
          // No individual toast - will be handled by bulk operation
        }
      } catch (error) {
        console.error("Delete error:", error)
        throw error // Re-throw to be handled by bulk operation
      }
    },
    [data],
  )

  const deleteMultipleRows = useCallback(
    async (rowIndexes: number[]) => {
      try {
        const promises = rowIndexes.map(async (rowIndex) => {
          const firebaseKey = data[rowIndex]?.[24]
          if (firebaseKey) {
            const rowRef = ref(database, `customers/${firebaseKey}`)
            await remove(rowRef)
          }
        })

        await Promise.all(promises)
        toast.success(`Đã xóa ${rowIndexes.length} hàng`)
      } catch (error) {
        console.error("Bulk delete error:", error)
        toast.error("Lỗi khi xóa nhiều hàng")
      }
    },
    [data],
  )

  return {
    data: filteredData,
    loading,
    searchTerm,
    setSearchTerm,
    saveRow,
    saveMultipleRows,
    addNewRow,
    addMultipleRows,
    deleteRow,
    deleteMultipleRows,
  }
}
