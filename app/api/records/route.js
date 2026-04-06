import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request) {
  const user = await verifyAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const connection = await pool.getConnection();
  try {
    const { patientId, visitType, symptoms, diagnosis, notes, prescriptions } = await request.json();

    await connection.beginTransaction();

    const recordId = `R-${Math.floor(Math.random() * 10000)}`;
    const dateStr = new Date().toISOString().split('T')[0];

    await connection.execute(
      'INSERT INTO consultations (id, patient_id, date, visit_type, symptoms, diagnosis, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [recordId, patientId, dateStr, visitType || 'Walk-in Consultation', symptoms || '', diagnosis || '', notes || '']
    );

    if (prescriptions && prescriptions.length > 0) {
      for (const p of prescriptions) {
        await connection.execute(
          'INSERT INTO prescriptions (consultation_id, name, dosage) VALUES (?, ?, ?)',
          [recordId, p.name, p.dosage]
        );
      }
    }

    await connection.execute(
      'UPDATE patients SET status = "Done" WHERE id = ?',
      [patientId]
    );

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Record save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
