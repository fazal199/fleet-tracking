const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
});

// ✅ Only log errors and initialization
console.log("Database pool initialized with max", pool.options.max, "connections");

pool.on("error", (err) => {
    console.error("Database pool error:", err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    end: () => pool.end(),
};