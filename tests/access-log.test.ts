import { expect, test } from 'bun:test'
import Fastify from 'fastify'
import { accessLog } from '../src/utils/accessLog.ts'

test('emits inspection facts without headers or body content; unknown evidence stays unsafe', async () => {
    const app = Fastify({ trustProxy: ['127.0.0.1', '::1'] })
    const records: ReturnType<typeof accessLog>[] = []
    app.addHook('onResponse', async (req, res) => { records.push(accessLog(req, res)) })
    app.get('/public', async () => ({ ok: true }))
    try {
        await app.inject({ url: '/public', remoteAddress: '192.0.2.1' })
        expect(records[0].inspection).toEqual({ version: 1, bodyEmpty: true, headersSafe: true, pathSafe: true })
        expect(records[0].ip).toBe('192.0.2.1')
        await app.inject({ url: '/public', headers: { authorization: 'Bearer private-test-value', 'x-forwarded-for': '8.8.8.8' }, remoteAddress: '192.0.2.2' })
        expect(records[1].inspection.headersSafe).toBe(false)
        expect(records[1].ip).toBe('192.0.2.2')
        expect(JSON.stringify(records[1])).not.toContain('private-test-value')
        await app.inject({ url: '/public?unknown=value' })
        expect(records[2].inspection.pathSafe).toBe(false)
        await app.inject({ url: '/public', headers: { 'user-agent': 'union select * from users' } })
        expect(records[3].inspection.headersSafe).toBe(false)
    } finally { await app.close() }
})
