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

    const deletedRecord = await prisma.wheel.delete({
      where: {
        id: id
      }
    });

    if (!deletedRecord) {
      return NextResponse.json(
        { error: 'Wheel record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { message: 'Wheel record deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting wheel record:', error);
    return NextResponse.json(
      { error: 'Failed to delete wheel record' },
      { status: 500 }
    );
  }
} 