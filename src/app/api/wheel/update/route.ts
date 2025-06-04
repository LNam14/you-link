import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// Add dynamic route configuration
export const dynamic = 'force-dynamic';
export async function PUT(request: Request) {
  try {
    const { id, username, reward, date } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const updatedRecord = await prisma.wheel.update({
      where: {
        id: id
      },
      data: {
        username,
        reward,
        date: date ? new Date(date) : undefined
      }
    });

    if (!updatedRecord) {
      return NextResponse.json(
        { error: 'Wheel record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updatedRecord });
  } catch (error) {
    console.error('Error updating wheel record:', error);
    return NextResponse.json(
      { error: 'Failed to update wheel record' },
      { status: 500 }
    );
  }
} 