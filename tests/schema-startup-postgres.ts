// DB=log_analyze_test DB_HOST=127.0.0.1 DB_PORT=... bun tests/schema-startup-postgres.ts
import assert from 'node:assert/strict'
import { mock } from 'bun:test'
import pg from 'pg'
assert.equal(process.env.DB, 'log_analyze_test')
assert.equal(process.env.DB_HOST, '127.0.0.1')
const client = new pg.Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB, user: process.env.DB_USER })
await client.connect()
mock.module('#db', () => ({ withClient: async (work: (client: pg.Client) => Promise<void>) => work(client) }))
try {
    await client.query('BEGIN')
    await client.query('CREATE TEMP TABLE files(id text,uploaded_at timestamptz)')
    await client.query('CREATE TEMP TABLE request_logs(domain text,ip inet,user_agent text,path text,hits bigint,last_seen timestamptz)')
    await client.query('CREATE TEMP TABLE request_logs_all(LIKE request_logs)')
    const { default: install } = await import('../src/utils/schema.ts')
    await install()
    await client.query("INSERT INTO request_metric_totals VALUES('domain','test',10,NOW())")
    const before = (await client.query("SELECT oid FROM pg_constraint WHERE conrelid='request_metric_totals'::regclass AND conname='request_metric_totals_metric_type_check'")).rows[0].oid
    const index = (await client.query("SELECT 'idx_request_logs_domain'::regclass::oid AS oid")).rows[0].oid
    await install()
    assert.equal((await client.query("SELECT oid FROM pg_constraint WHERE conrelid='request_metric_totals'::regclass AND conname='request_metric_totals_metric_type_check'")).rows[0].oid, before)
    assert.equal((await client.query("SELECT 'idx_request_logs_domain'::regclass::oid AS oid")).rows[0].oid, index)
    assert.equal((await client.query("SELECT hits_total FROM request_metric_totals WHERE metric_type='domain'")).rows[0].hits_total, '10')
    console.log('PASS: actual PostgreSQL startup migration preserves valid constraints, indexes and maintained totals across restarts.')
} finally { await client.query('ROLLBACK'); await client.end() }
