import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function syncCloud() {
  const { default: pool } = await import('../lib/db.js');
  try {
    console.log('Connecting to Aiven database and syncing schema...');
    
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user'
      )
    `);
    console.log('Created users table');
    
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        age VARCHAR(50),
        contact VARCHAR(100),
        status VARCHAR(50),
        arrival_time VARCHAR(100)
      )
    `);
    console.log('Created patients table');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vitals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id VARCHAR(50),
        bp VARCHAR(20),
        hr INT,
        temp FLOAT,
        weight FLOAT,
        height FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created vitals table');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS consultations (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50),
        date VARCHAR(50),
        visit_type VARCHAR(100),
        symptoms TEXT,
        diagnosis TEXT,
        notes TEXT
      )
    `);
    console.log('Created consultations table');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        consultation_id VARCHAR(50),
        name VARCHAR(255),
        dosage VARCHAR(255)
      )
    `);
    console.log('Created prescriptions table');

    console.log('Cloud schema sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing cloud schema:', error);
    process.exit(1);
  }
}

syncCloud();
