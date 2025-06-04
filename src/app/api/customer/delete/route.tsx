import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
    try {
        // Ensure database connection is established
        await connectDB();

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: "ID is required for delete" }, { status: 400 })
        }

        const customerId = parseInt(id, 10)
        if (isNaN(customerId)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 })
        }

        const deletedCustomer = await prisma.customer_data.delete({
            where: { id: customerId }
        })

        return NextResponse.json(
            { message: "Customer deleted successfully", data: deletedCustomer },
            { status: 200 }
        )
    } catch (error: any) {
        console.error("Error deleting customer data:", error)
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 })
        }
        return NextResponse.json(
            {
                error: "Failed to delete customer data",
                details: error.message,
                code: error.code
            },
            { status: 500 }
        )
    }
}
