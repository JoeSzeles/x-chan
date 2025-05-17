
import pg from 'pg';
const { Pool } = pg;

const testConnection = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database');
    
    const result = await client.query('SELECT current_timestamp');
    console.log('Database time:', result.rows[0].current_timestamp);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('Database connection error:', error.message);
  }
};

testConnection();
