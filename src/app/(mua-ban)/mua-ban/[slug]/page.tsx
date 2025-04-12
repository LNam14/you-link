"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ref, onValue } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import PageBody from "../components/PageBody"

export default function SupplierPage() {
    const params = useParams()
    const supplierName = params.slug as string
    const [loading, setLoading] = useState(true)
    const [supplierExists, setSupplierExists] = useState(false)

    useEffect(() => {
        const ordersRef = ref(database, "orders")

        const checkSupplier = (snapshot: any) => {
            if (snapshot.exists()) {
                const allData = snapshot.val()

                if (Array.isArray(allData)) {
                    const hasSupplier = allData.some(order =>
                        order && order.TenNB === supplierName
                    )
                    setSupplierExists(hasSupplier)
                }
            }
            setLoading(false)
        }

        const unsubscribe = onValue(ordersRef, checkSupplier, { onlyOnce: true })

        return () => {
            unsubscribe()
        }
    }, [supplierName])

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    if (!supplierExists) {
        return (
            <div className="flex bg-red-600 flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold mb-4">Không tìm thấy dữ liệu</h1>
                <p>Không có dữ liệu cho nhà cung cấp "{supplierName}"</p>
            </div>
        )
    }

    return <PageBody supplierName={supplierName} />
}
