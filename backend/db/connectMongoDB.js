import pg from 'pg';
const { Pool } = pg;

const connectDB = async () => {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gXRl0kDT3dCZ@ep-quiet-shape-a5qao9a8.us-east-2.aws.neon.tech/neondb?sslmode=require',
      ssl: {
        rejectUnauthorized: false
      }
    });

    await pool.connect();
    console.log("Connected to PostgreSQL");
    return pool;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectMongoDB;