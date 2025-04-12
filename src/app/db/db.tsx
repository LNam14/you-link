import { Pool } from "pg"

// Create a connection pool specifically for Neon
const pool = new Pool({
    // Use the pooled connection string for better performance
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    // Neon-specific settings for optimal performance
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
})

// Function to execute queries with proper connection handling
export default async function executeQuery(query: string, values: any[]) {
    const client = await pool.connect()
    try {
        const results = await client.query(query, values)
        return results.rows
    } catch (error: any) {
        console.error("Database query error:", error)
        return { status: false, error: error.message }
    } finally {
        client.release() // Return the client to the pool
    }
}
