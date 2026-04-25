import pg from 'pg'
import config from '#constants'
import pool from './pool.ts'
import isTransientDatabaseError from './isTransientDatabaseError.ts'
import sleep from './sleep.ts'

type QueryResultRow = pg.QueryResultRow
type PoolClient = pg.PoolClient

let lastPoolUnavailableLogAt = 0

export async function withClient<T = pg.QueryResult<QueryResultRow>>(callback: (client: PoolClient) => Promise<T>) {
    while (true) {
        try {
            const client = await pool.connect()
            try {
                return await callback(client)
            } finally {
                client.release()
            }
        } catch (error) {
            if (!isTransientDatabaseError(error)) {
                throw error
            }

            const ttlMs = config.DB_CACHE_TTL
            const now = Date.now()

            if (lastPoolUnavailableLogAt === 0 || now - lastPoolUnavailableLogAt >= ttlMs) {
                lastPoolUnavailableLogAt = now
                const ts = new Date().toISOString()
                console.log(`[${ts}] Pool currently unavailable, retrying in ${ttlMs / 1000}s...`)
                console.log(error)
            }

            await sleep(ttlMs)
        }
    }
}
