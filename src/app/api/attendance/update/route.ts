import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function PUT(request: Request) {
  try {
    const { id, username, date, status } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'UPDATE Attendance SET Username = $1, Date = $2, Status = $3 WHERE Id = $4 RETURNING *',
      [username, date, status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance record' },
      { status: 500 }
    );
  }
} 