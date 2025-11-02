import { NextResponse } from 'next/server';
import { prisma, connectDB } from '@/lib/db';
import { cookies } from 'next/headers';

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    // Verify user authentication
    const cookieStore = cookies()
    const userInfo = cookieStore.get("userInfo")

    if (!userInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { username, role } = JSON.parse(userInfo.value)

    if (!username) {
      return NextResponse.json({ error: "Username not found" }, { status: 400 })
    }

    // Get id from query params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Ensure database connection
    await connectDB();

    // Check if work task exists
    const existingTask = await prisma.work_task.findUnique({
      where: {
        id: Number(id)
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Work task not found' },
        { status: 404 }
      );
    }

    // Verify user owns this task (unless admin)
    if (role !== "Admin" && existingTask.username !== username) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own tasks' },
        { status: 403 }
      );
    }

    const deletedTask = await prisma.work_task.delete({
      where: {
        id: Number(id)
      }
    });

    if (!deletedTask) {
      return NextResponse.json(
        { error: 'Work task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Work task deleted successfully',
      data: { id: deletedTask.id }
    });
  } catch (error: any) {
    console.error('Error deleting work task:', error);
    return NextResponse.json(
      { error: 'Failed to delete work task', details: error.message },
      { status: 500 }
    );
  }
}

