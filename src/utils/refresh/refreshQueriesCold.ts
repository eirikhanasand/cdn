import type { FastifyInstance } from 'fastify'
import ua from './queries/ua.ts'
import ip from './queries/ip.ts'
import summary from './queries/summary.ts'

export default async function refreshQueriesCold(fastify: FastifyInstance) {
    const newUA = await ua()
    const newIP = await ip()
    const newSummary = await summary()

    fastify.cachedUAMetrics = { status: newUA.status, data: Buffer.from(JSON.stringify(newUA.data)) }
    fastify.cachedIPMetrics = { status: newIP.status, data: Buffer.from(JSON.stringify(newIP.data)) }
    fastify.cachedSummary = {
        status: newSummary.status,
        data: {
            path: Buffer.from(JSON.stringify(newSummary.data.path || [])),
            ip: Buffer.from(JSON.stringify(newSummary.data.ip || [])),
            user_agent: Buffer.from(JSON.stringify(newSummary.data.ua || [])),
            domain: Buffer.from(JSON.stringify(newSummary.data.domain || [])),
        },
    }

    fastify.log.info('Cold cached queries refreshed')
}
