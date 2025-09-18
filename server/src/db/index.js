require("dotenv").config();

// db.js
const pkg = require("pg")
const { Pool } = pkg;

// ✅ Create a single pool instance
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database:process.env.DB_DATABASE ,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    max: process.env.DB_MAX_CONNECTIONS,                // keep this small!
    idleTimeoutMillis: 10000 // close idle after 10s
});

// console.log(process.env.DB_HOST,process.env.DB_USER,process.env.DB_PASSWORD,process.env.DB_DATABASE,)



pool.on("connect", function () {
    console.log("pool created successfully!");
})

// ✅ Log pool errors (unexpected idle client errors)
pool.on("error", (err) => {
    console.error("Pool Error! Something Went Wrong in db/index.js", err);
});

// ✅ Export helpers
module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    end: () => pool.end(),
};
