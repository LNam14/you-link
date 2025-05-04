import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, date, status } = await request.json();
    
    if (!username || !date) {
      return NextResponse.json(
        { error: 'Username and date are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'INSERT INTO Attendance (Username, Date, Status) VALUES ($1, $2, $3) RETURNING *',
      [username, date, status || 'Nghỉ']
    );

    return NextResponse.json(
      { data: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to create attendance record' },
      { status: 500 }
    );
  }
} 