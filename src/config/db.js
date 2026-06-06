import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }
    console.log("Database connected");
    release();
});
