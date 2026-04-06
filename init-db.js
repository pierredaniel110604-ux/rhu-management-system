const mysql = require('mysql2/promise');
const fs = require('fs');

async function init() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      multipleStatements: true
    });

    const sql = fs.readFileSync('../setup.sql', 'utf8');
    await connection.query(sql);
    console.log('Database initialized and seeded successfully.');
    await connection.end();
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

init();
