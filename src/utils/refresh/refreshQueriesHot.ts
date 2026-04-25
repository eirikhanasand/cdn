import type { FastifyInstance } from 'fastify'
import tps from './queries/tps.ts'

export default async function refreshQueriesHot(fastify: FastifyInstance) {
    const newTPS = await tps()
    fastify.cachedTPS = { status: newTPS.status, data: Buffer.from(JSON.stringify(newTPS.data)) }
    fastify.log.info('Hot cached queries refreshed')
}
