import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to connect to Supabase PostgreSQL.");
}

const sql = postgres(connectionString);

export default sql;
