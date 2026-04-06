import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [patients] = await pool.execute('SELECT * FROM patients');
    const [consultations] = await pool.execute('SELECT * FROM consultations');
    const [prescriptions] = await pool.execute('SELECT * FROM prescriptions');

    const formattedPatients = patients.map((patient) => {
      const patientConsultations = consultations
        .filter(c => c.patient_id === patient.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(c => {
          const cPrescriptions = prescriptions
            .filter(p => p.consultation_id === c.id)
            .map(p => ({ name: p.name, dosage: p.dosage }));
            
          return {
            id: c.id,
            // Format to YYYY-MM-DD local time offset
            date: new Date(c.date).toLocaleDateString('en-CA'), 
            visitType: c.visit_type,
            medical: {
              symptoms: c.symptoms || '',
              diagnosis: c.diagnosis || '',
              notes: c.notes || '',
              prescriptions: cPrescriptions,
              labs: []
            }
          };
        });

      return {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        contact: patient.contact,
        status: patient.status,
        arrivalTime: patient.arrival_time,
        history: patientConsultations
      };
    });

    return NextResponse.json(formattedPatients);
  } catch (error) {
    console.error('Queue fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
