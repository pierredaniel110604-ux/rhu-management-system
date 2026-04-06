import mysql from 'mysql2/promise';
import 'dotenv/config'; // Loads your .env file

async function initDB() {
  console.log('Connecting to MySQL Database...');
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log('Creating tables...');

    // 1. Patients Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        age INT NOT NULL,
        contact VARCHAR(15) NOT NULL,
        status VARCHAR(50) DEFAULT 'Waiting',
        arrival_time VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Vitals Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS vitals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id VARCHAR(20),
        bp VARCHAR(20),
        hr INT,
        temp DECIMAL(4,2),
        weight DECIMAL(5,2),
        height DECIMAL(5,2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);

    // 3. Consultations (Records) Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS consultations (
        id VARCHAR(20) PRIMARY KEY,
        patient_id VARCHAR(20),
        visit_type VARCHAR(100),
        symptoms TEXT,
        diagnosis VARCHAR(255),
        notes TEXT,
        consultation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);

    // 4. Prescriptions Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        consultation_id VARCHAR(20),
        medication_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100) NOT NULL,
        FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ All MySQL tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await connection.end();
  }
}

initDB();