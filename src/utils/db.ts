import pg from 'pg'
import config from '#constants'

type SQLParamType = (string | number | null | boolean | string[] | Date | Buffer)[]
type QueryResultRow = pg.QueryResultRow
type PoolClient = pg.PoolClient
type PgError = Error & { code?: string }

const {
    DB,
    DB_USER,
    DB_HOST,
    DB_PASSWORD,
    DB_PORT,
    DB_MAX_CONN,
    DB_IDLE_TIMEOUT_MS,
    DB_TIMEOUT_MS
} = config
const { Pool } = pg

let lastPoolUnavailableLogAt = 0

const pool = new Pool({
    user: DB_USER || 'cdn',
    host: DB_HOST,
    database: DB || 'cdn',
    password: DB_PASSWORD,
    port: Number(DB_PORT) || 5432,
    max: Number(DB_MAX_CONN) || 20,
    idleTimeoutMillis: Number(DB_IDLE_TIMEOUT_MS) || 5000,
    connectionTimeoutMillis: Number(DB_TIMEOUT_MS) || 3000,
    keepAlive: true
})

export default async function run(query: string, params?: SQLParamType) {
    return withClient(client => client.query(query, params ?? []))
}

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

            if (
                lastPoolUnavailableLogAt === 0 ||
                now - lastPoolUnavailableLogAt >= ttlMs
            ) {
                lastPoolUnavailableLogAt = now
                const ts = new Date().toISOString()
                console.log(`[${ts}] Pool currently unavailable, retrying in ${ttlMs / 1000}s...`)
                console.log(error)
            }

            await sleep(ttlMs)
        }
    }
}

function isTransientDatabaseError(error: unknown) {
    const err = error as PgError
    const message = err?.message?.toLowerCase() || ''
    const retryableCodes = new Set([
        'ECONNREFUSED',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
        '08000',
        '08001',
        '08003',
        '08006',
        '53300',
        '57P03',
    ])

    return Boolean(err?.code && retryableCodes.has(err.code))
        || message.includes('connection terminated')
        || message.includes('connection timeout')
        || message.includes('timeout expired')
}

function sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms))
}
