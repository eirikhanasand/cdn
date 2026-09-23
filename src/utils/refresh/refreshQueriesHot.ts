import type { FastifyInstance } from 'fastify'
import tps from './queries/tps.ts'

let lastStarted: number | undefined

export default async function refreshQueriesHot(fastify: FastifyInstance) {
    const started = performance.now()
    const intervalMs = lastStarted === undefined ? null : started - lastStarted
    lastStarted = started
    const newTPS = await tps()
    fastify.cachedTPS = { status: newTPS.status, data: Buffer.from(JSON.stringify(newTPS.data)) }
    const refresh = { version: 1, status: newTPS.status, durationMs: performance.now() - started, intervalMs }
    // Keep failures distinguishable from completed refreshes; the collector can
    // retain slow, frequent and first-run events without inspecting cached data.
    if (newTPS.status !== 200) fastify.log.error({ refresh }, 'Hot cached query refresh failed')
    else fastify.log.info({ refresh }, 'Hot cached queries refreshed')
}
