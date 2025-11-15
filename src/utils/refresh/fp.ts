// import alertSlowQuery from '#utils/alertSlowQuery.ts'
import config from '#constants'
import fp from 'fastify-plugin'
import ua from './queries/ua.ts'
import ip from './queries/ip.ts'
import tps from './queries/tps.ts'

export default fp(async (fastify) => {
    async function refreshQueries() {
        // const start = Date.now()
        const newUA = await ua()
        const newIP = await ip()
        const newTPS = await tps()
        // const duration = (Date.now() - start) / 1000
        // alertSlowQuery(duration, 'cache')
        fastify.cachedUAMetrics = { status: newUA.status, data: Buffer.from(JSON.stringify(newUA.data)) }
        fastify.cachedIPMetrics = { status: newIP.status, data: Buffer.from(JSON.stringify(newIP.data)) }
        fastify.cachedTPS = { status: newTPS.status, data: Buffer.from(JSON.stringify(newTPS.data)) }
        fastify.log.info('Cached queries refreshed')
    }

    refreshQueries()
    setInterval(refreshQueries, config.CACHE_TTL)
})
