import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const date = searchParams.get('date');
    
    let query = 'SELECT * FROM Attendance';
    const params = [];
    
    if (username || date) {
      query += ' WHERE';
      if (username) {
        query += ' Username = $1';
        params.push(username);
      }
      if (date) {
        if (params.length > 0) query += ' AND';
        query += ` Date = $${params.length + 1}`;
        params.push(date);
      }
    }
    
    query += ' ORDER BY Date DESC';
    
    const result = await pool.query(query, params);
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { username, date, status } = await request.json();
    
    if (!username || !date) {
      return NextResponse.json({ error: 'Username and date are required' }, { status: 400 });
    }

    const result = await pool.query(
      'INSERT INTO Attendance (Username, Date, Status) VALUES ($1, $2, $3) RETURNING *',
      [username, date, status || 'Nghỉ']
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, username, date, status } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE Attendance SET Username = $1, Date = $2, Status = $3 WHERE Id = $4 RETURNING *',
      [username, date, status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM Attendance WHERE Id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return NextResponse.json({ error: 'Failed to delete attendance record' }, { status: 500 });
  }
} 