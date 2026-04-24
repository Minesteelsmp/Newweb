/**
 * lib/db.ts
 * MySQL connection pool with helper functions.
 * Pool is exported both as default AND as named export for compatibility.
 */
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'cubiqhost',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})

export { pool }
export default pool

/** Execute a query and return all rows as typed array */
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.execute(sql, params as any)
  return rows as T
}

/** Execute a query and return the first row (or null if none) */
export async function queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T[]>(sql, params)
  return rows[0] ?? null
}