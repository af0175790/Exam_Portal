require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@examportal.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
  });

  const schemaPath = path.join(__dirname, '../../../database/schema.sql');
  const seedPath = path.join(__dirname, '../../../database/seed.sql');

  console.log('Applying schema.sql ...');
  await pool.query(fs.readFileSync(schemaPath, 'utf8'));

  console.log('Applying seed.sql (topics + question bank) ...');
  await pool.query(fs.readFileSync(seedPath, 'utf8'));

  console.log('Creating default admin user ...');
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Portal Admin', $1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [ADMIN_EMAIL, hash]
  );

  console.log('\nDone!');
  console.log(`Admin login -> email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`);
  console.log('Change this password (or set SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD before seeding) before going live.');

  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
