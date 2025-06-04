import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Add dynamic route configuration
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const deletedAttendance = await prisma.attendance.delete({
      where: {
        id: Number(id)
      }
    });

    if (!deletedAttendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { message: 'Attendance record deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
} 