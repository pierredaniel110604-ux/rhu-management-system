import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request) {
  // 1. Security Check (Your code)
  const user = await verifyAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 2. We added "vitals" to the list of things we accept from the frontend
    const { name, age, contact, arrivalTime, vitals } = await request.json();
    
    // 3. Auto-generate PT-XXX ID (Your code)
    const [rows] = await pool.execute('SELECT id FROM patients WHERE id LIKE "PT-%" ORDER BY id DESC LIMIT 1');
    let nextNum = 1;
    if (rows.length > 0) {
      const lastIdStr = rows[0].id.replace('PT-', '');
      nextNum = parseInt(lastIdStr, 10) + 1;
    }
    const newId = `PT-${String(nextNum).padStart(3, '0')}`;

    const defaultStatus = 'Waiting';
    
    // 4. Save the main patient data to MySQL
    await pool.execute(
      'INSERT INTO patients (id, name, age, contact, status, arrival_time) VALUES (?, ?, ?, ?, ?, ?)',
      [newId, name, age, contact, defaultStatus, arrivalTime]
    );

    // 5. NEW: Save the vital signs to MySQL (if the nurse typed them in)
    if (vitals) {
      // Convert blank text boxes to "null" so MySQL doesn't crash
      const bp = vitals.bp || null;
      const hr = vitals.hr ? parseInt(vitals.hr, 10) : null;
      const temp = vitals.temp ? parseFloat(vitals.temp) : null;
      const weight = vitals.weight ? parseFloat(vitals.weight) : null;
      const height = vitals.height ? parseFloat(vitals.height) : null;

      await pool.execute(
        'INSERT INTO vitals (patient_id, bp, hr, temp, weight, height) VALUES (?, ?, ?, ?, ?, ?)',
        [newId, bp, hr, temp, weight, height]
      );
    }

    // 6. Success!
    return NextResponse.json({ success: true, id: newId });

  } catch (error) {
    console.error('Patient add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}