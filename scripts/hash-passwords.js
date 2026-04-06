const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'rhu_calasiao',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const [rows] = await pool.query('SELECT id, username, password_hash FROM users');
    for (const user of rows) {
      // bcrypt hashes normally start with $2a$, $2b$, or $2y$
      if (!user.password_hash.startsWith('$2')) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(user.password_hash, salt);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
        console.log(`Updated hash for ${user.username}`);
      } else {
        console.log(`Skipped ${user.username}, already hashed.`);
      }
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
