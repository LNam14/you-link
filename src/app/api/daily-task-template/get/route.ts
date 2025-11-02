import { NextResponse } from "next/server"
import { prisma, connectDB } from "@/lib/db"
import { cookies } from "next/headers"

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify user authentication
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")

    if (!userInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure database connection
    await connectDB()

    // Get the latest template (there should only be one active template)
    const template = await prisma.daily_task_template.findFirst({
      orderBy: {
        updated_at: 'desc'
      }
    })

    if (!template) {
      // Return default empty template
      return NextResponse.json({
        template: [],
        updatedAt: null,
        updatedBy: null
      }, { status: 200 })
    }

    const templateData = typeof template.template_data === 'string' 
      ? JSON.parse(template.template_data) 
      : template.template_data

    return NextResponse.json({
      template: templateData,
      updatedAt: template.updated_at,
      updatedBy: template.updated_by
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching daily task template:", error)
    return NextResponse.json(
      { error: "Failed to fetch daily task template", details: error.message },
      { status: 500 }
    )
  }
}

