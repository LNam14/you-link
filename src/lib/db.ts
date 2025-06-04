import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgres://neondb_owner:npg_tGLaeU2uWz4X@ep-white-grass-a1smnwlt-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false
    },
    max: 20, // Increased max connections for better handling of concurrent requests
    idleTimeoutMillis: 300000, // Increased to 5 minutes to keep connections alive longer
    connectionTimeoutMillis: 10000, // Increased timeout for better reliability
    maxUses: 10000, // Increased max uses per connection
    keepAlive: true, // Enable keep-alive to maintain connection
    application_name: 'world-seo-app', // Add application name for better monitoring
});

// Test database connection with retry logic
const testConnection = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await pool.query('SELECT NOW()');
            console.log('Database connection test successful:', res.rows[0]);
            return;
        } catch (err) {
            console.error(`Database connection test attempt ${i + 1} failed:`, err);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
    }
};

testConnection().catch(err => {
    console.error('All database connection attempts failed:', err);
});

// Add error handler for the pool
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Add connection pool monitoring
pool.on('connect', () => {
    console.log('New client connected to the pool');
});

pool.on('acquire', () => {
    console.log('Client acquired from the pool');
});

export { pool }; 