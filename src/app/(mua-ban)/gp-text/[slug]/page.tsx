"use client"

import { useParams } from "next/navigation"
import OrdersTable from "../components/OrdersTable"

export default function Page() {
    const { slug } = useParams<{ slug: string }>()
    return <OrdersTable maKH={slug} hiddenColumns={[12, 13, 19, 20]} />
}
