import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import moment from 'moment';

// Add dynamic route configuration
export const dynamic = 'force-dynamic';


export async function PUT(request: Request) {
  try {
    const { id, username, date } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const updatedAttendance = await prisma.attendance.update({
      where: {
        id: Number(id)
      },
      data: {
        username,
        date: moment(date).add(7, 'hours').format("YYYY-MM-DD HH:mm:ss")
      }
    });

    if (!updatedAttendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updatedAttendance });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance record' },
      { status: 500 }
    );
  }
} 