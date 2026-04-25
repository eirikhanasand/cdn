import config from '#constants'
import fp from 'fastify-plugin'
import refreshQueriesCold from './refreshQueriesCold.ts'
import refreshQueriesHot from './refreshQueriesHot.ts'
import scheduleRefreshLoop from './scheduleRefreshLoop.ts'

export default fp(async (fastify) => {
    let hotRefreshRunning = false
    let coldRefreshRunning = false
    scheduleRefreshLoop(async () => {
        if (hotRefreshRunning) {
            return
        }
        hotRefreshRunning = true
        try {
            await refreshQueriesHot(fastify)
        } catch (error) {
            fastify.log.error(error)
        } finally {
            hotRefreshRunning = false
        }
    }, config.CACHE_TTL_HOT)

    scheduleRefreshLoop(async () => {
        if (coldRefreshRunning) {
            return
        }
        coldRefreshRunning = true
        try {
            await refreshQueriesCold(fastify)
        } catch (error) {
            fastify.log.error(error)
        } finally {
            coldRefreshRunning = false
        }
    }, config.CACHE_TTL_COLD)
})
