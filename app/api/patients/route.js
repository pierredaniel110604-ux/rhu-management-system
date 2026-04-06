import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request) {
  const user = await verifyAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { name, age, contact, arrivalTime } = await request.json();
    
    // Auto-generate PT-XXX ID
    const [rows] = await pool.execute('SELECT id FROM patients WHERE id LIKE "PT-%" ORDER BY id DESC LIMIT 1');
    let nextNum = 1;
    if (rows.length > 0) {
      const lastIdStr = rows[0].id.replace('PT-', '');
      nextNum = parseInt(lastIdStr, 10) + 1;
    }
    const newId = `PT-${String(nextNum).padStart(3, '0')}`;

    const defaultStatus = 'Waiting';
    
    await pool.execute(
      'INSERT INTO patients (id, name, age, contact, status, arrival_time) VALUES (?, ?, ?, ?, ?, ?)',
      [newId, name, age, contact, defaultStatus, arrivalTime]
    );

    return NextResponse.json({ success: true, id: newId });
  } catch (error) {
    console.error('Patient add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
