import config from '#constants'
import fp from 'fastify-plugin'
import ua from './queries/ua.ts'
import ip from './queries/ip.ts'
import tps from './queries/tps.ts'
import summary from './queries/summary.ts'

export default fp(async (fastify) => {
    async function refreshQueriesHot() {
        const newTPS = await tps()
        fastify.cachedTPS = { status: newTPS.status, data: Buffer.from(JSON.stringify(newTPS.data)) }
        fastify.log.info('Hot cached queries refreshed')
    }

    async function refreshQueriesCold() {
        const newUA = await ua()
        const newIP = await ip()
        const newSummary = await summary()

        fastify.cachedUAMetrics = { status: newUA.status, data: Buffer.from(JSON.stringify(newUA.data)) }
        fastify.cachedIPMetrics = { status: newIP.status, data: Buffer.from(JSON.stringify(newIP.data)) }
        fastify.cachedSummary = {
            status: newSummary.status, data: {
                path: Buffer.from(JSON.stringify(newSummary.data.path || [])),
                ip: Buffer.from(JSON.stringify(newSummary.data.ip || [])),
                user_agent: Buffer.from(JSON.stringify(newSummary.data.ua || [])),
            }
        }

        fastify.log.info('Cold cached queries refreshed')
    }

    refreshQueriesHot()
    refreshQueriesCold()

    setInterval(refreshQueriesHot, config.CACHE_TTL_HOT)
    setInterval(refreshQueriesCold, config.CACHE_TTL_COLD)
})
