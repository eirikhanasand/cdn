import { expect, mock, test } from 'bun:test'
let status = 200
mock.module('../src/utils/refresh/queries/tps.ts', () => ({ default: async () => ({ status, data: status === 200 ? [] : { error: 'failed' } }) }))
const { default: refresh } = await import('../src/utils/refresh/refreshQueriesHot.ts')
test('producer distinguishes failures and supplies actual timing without cached content', async () => {
    const messages: { level: string, fields: any, message: string }[] = []
    const app: any = { log: {
        info: (fields: unknown, message: string) => messages.push({ level: 'info', fields, message }),
        error: (fields: unknown, message: string) => messages.push({ level: 'error', fields, message }),
    } }
    await refresh(app)
    expect(messages[0].fields.refresh).toMatchObject({ version: 1, status: 200, intervalMs: null })
    expect(messages[0].fields.refresh.durationMs).toBeGreaterThanOrEqual(0)
    expect(Object.keys(messages[0].fields.refresh).sort()).toEqual(['durationMs', 'intervalMs', 'status', 'version'])
    await refresh(app)
    expect(messages[1].fields.refresh.intervalMs).toBeLessThan(5000)
    status = 500
    await refresh(app)
    expect(messages[2].level).toBe('error')
    expect(messages[2].message).toBe('Hot cached query refresh failed')
    expect(messages[2].fields.refresh.status).toBe(500)
    expect(app.cachedTPS.status).toBe(500)
})
