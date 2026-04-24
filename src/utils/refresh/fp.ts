import config from '#constants'
import fp from 'fastify-plugin'
import ua from './queries/ua.ts'
import ip from './queries/ip.ts'
import tps from './queries/tps.ts'
import summary from './queries/summary.ts'

export default fp(async (fastify) => {
    let hotRefreshRunning = false
    let coldRefreshRunning = false

    async function refreshQueriesHot() {
        if (hotRefreshRunning) {
            return
        }

        hotRefreshRunning = true
        try {
            const newTPS = await tps()
            fastify.cachedTPS = { status: newTPS.status, data: Buffer.from(JSON.stringify(newTPS.data)) }
            fastify.log.info('Hot cached queries refreshed')
        } finally {
            hotRefreshRunning = false
        }
    }

    async function refreshQueriesCold() {
        if (coldRefreshRunning) {
            return
        }

        coldRefreshRunning = true
        try {
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
                    domain: Buffer.from(JSON.stringify(newSummary.data.domain || [])),
                }
            }

            fastify.log.info('Cold cached queries refreshed')
        } finally {
            coldRefreshRunning = false
        }
    }

    async function safelyRefreshHot() {
        try {
            await refreshQueriesHot()
        } catch (error) {
            hotRefreshRunning = false
            fastify.log.error(error)
        } finally {
            setTimeout(safelyRefreshHot, config.CACHE_TTL_HOT)
        }
    }

    async function safelyRefreshCold() {
        try {
            await refreshQueriesCold()
        } catch (error) {
            coldRefreshRunning = false
            fastify.log.error(error)
        } finally {
            setTimeout(safelyRefreshCold, config.CACHE_TTL_COLD)
        }
    }

    setTimeout(safelyRefreshHot, 0)
    setTimeout(safelyRefreshCold, 0)
})
