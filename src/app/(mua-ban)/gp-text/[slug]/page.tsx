"use client"

import { useParams } from "next/navigation"
import OrdersTable from "../components/OrdersTable"

export default function Page() {
    const { slug } = useParams<{ slug: string }>()
    return <OrdersTable maKH={slug} hiddenColumns={[10, 11, 17, 18]} />
}
