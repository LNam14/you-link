import executeQuery from "@/app/db/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { id, name, description } = await request.json()

    // Validate input
    if (!id || !name) {
      return NextResponse.json(
        {
          success: false,
          message: "Team ID and name are required",
        },
        { status: 400 },
      )
    }

    // Update the team
    const query = `
            UPDATE team 
            SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $3 
            RETURNING *
        `
    const result = await executeQuery(query, [name, description || null, id])

    // Check if any rows were affected
    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Team not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Team updated successfully",
        data: result[0],
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Error updating team:", error)

    // Check for duplicate team name error
    if (error.message && error.message.includes("team_name_key")) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên team đã tồn tại",
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error updating team",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
