import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  const user = await verifyAuth();
  
  // Verify doctor access explicitly to secure reports
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized. Doctors only.' }, { status: 403 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Total Daily Consultations
    const [totalRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM consultations WHERE date = ?',
      [today]
    );
    const totalPatients = totalRows[0].count;

    // 2. Aggregated Top 5 Diagnoses
    const [diagnosisRows] = await pool.execute(
      'SELECT diagnosis, COUNT(*) as count FROM consultations WHERE date = ? AND diagnosis != "" GROUP BY diagnosis ORDER BY count DESC LIMIT 5',
      [today]
    );

    // 3. Complete CSV Raw Data Fetch
    const [csvRows] = await pool.execute(`
      SELECT c.id as consultation_id, p.name as patient_name, p.age, c.visit_type, c.symptoms, c.diagnosis, c.notes 
      FROM consultations c 
      JOIN patients p ON c.patient_id = p.id 
      WHERE c.date = ?
    `, [today]);

    return NextResponse.json({
      success: true,
      summary: {
        totalPatients,
        topDiagnoses: diagnosisRows,
      },
      csvData: csvRows
    });
  } catch (error) {
    console.error('Report fetch error:', error);
    return NextResponse.json({ error: 'Internal server error while compiling report' }, { status: 500 });
  }
}
