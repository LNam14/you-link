"use client"
import { useEffect, useState } from "react"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import "../style.css"
import { ref, onValue, set, get, update } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import PageBody from "./DetailOrder"

type NCCPageProps = { supplierName: string }
export default function NCCPage({ supplierName }: NCCPageProps) {
    const [filteredOrders, setFilteredOrders] = useState([])

    useEffect(() => {
        const ordersRef = ref(database, "orders")
        onValue(ordersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                let ordersArray = Array.isArray(data) ? data : Object.values(data)
                // Lọc bỏ các orders có Status === 'Hủy'
                ordersArray = ordersArray.filter((order: any) => order.Status !== 'Hủy')
                // Lọc tất cả ChiTietDonHang có TenNCC === supplierName
                const allDetails: any = []
                ordersArray.forEach((order, orderIdx) => {
                    if (Array.isArray(order.ChiTietDonHang)) {
                        order.ChiTietDonHang.forEach((detail: any, idx: number) => {
                            if (detail.TenNCC === supplierName) {
                                allDetails.push({ ...detail, _dbIndex: idx, _parentIndex: orderIdx })
                            }
                        })
                    }
                })
                setFilteredOrders(allDetails)
            } else {
                setFilteredOrders([])
            }
        })
    }, [supplierName])

    return (
        <div>
            <PageBody supplierName={supplierName} order={filteredOrders} hiddenColumns={[6, 11]} />
        </div>
    )
}
