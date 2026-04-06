import mysql from 'mysql2/promise';

// This connects to the DATABASE_URL environment variable you will put in Vercel
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;