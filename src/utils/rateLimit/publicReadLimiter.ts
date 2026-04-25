import type { FastifyInstance, FastifyRequest } from 'fastify'
import buildClientKey from './buildClientKey.ts'
import classifyClient from './classifyClient.ts'
import cleanExpiredCounters from './cleanExpiredCounters.ts'
import { CLEANUP_INTERVAL_MS, LIMITS, MISS_WINDOW_MS, REQUEST_WINDOW_MS } from './constants.ts'
import getTargetRouteGroup from './getTargetRouteGroup.ts'
import incrementCounter from './incrementCounter.ts'
import isMissResponse from './isMissResponse.ts'
import { missCounters, requestCounters } from './rateLimitStores.ts'
import setRateHeaders from './setRateHeaders.ts'
import type { RequestLimitContext } from './types.ts'

let cleanupTimer: NodeJS.Timeout | null = null

export default function registerPublicReadRateLimiter(fastify: FastifyInstance) {
    if (!cleanupTimer) {
        cleanupTimer = setInterval(cleanExpiredCounters, CLEANUP_INTERVAL_MS)
        cleanupTimer.unref()
    }

    fastify.addHook('onRequest', async (req, res) => {
        const routeGroup = getTargetRouteGroup(req.url)
        if (!routeGroup) {
            return
        }

        const clientClass = classifyClient(req)
        const profile = LIMITS[clientClass]
        const clientKey = buildClientKey(req)
        const key = `${routeGroup}:${clientClass}:${clientKey}`
        const windowState = incrementCounter(requestCounters, key, REQUEST_WINDOW_MS)
        const remaining = Math.max(0, profile.requestsPerMinute - windowState.count)

        setRateHeaders(res, profile.requestsPerMinute, remaining, windowState.resetAt)

        if (windowState.count > profile.requestsPerMinute) {
            return res.status(429).send({
                error: 'Too many public share/file lookups. Slow down and retry shortly.',
            })
        }

        ;(req as FastifyRequest & { rateLimitContext?: RequestLimitContext }).rateLimitContext = {
            key,
            routeGroup,
            clientClass,
            profile,
        }
    })

    fastify.addHook('onSend', async (req, res, payload) => {
        const context = (req as FastifyRequest & { rateLimitContext?: RequestLimitContext }).rateLimitContext
        if (!context) {
            return payload
        }

        if (!isMissResponse(req, res, payload)) {
            return payload
        }

        const missKey = `miss:${context.key}`
        const windowState = incrementCounter(missCounters, missKey, MISS_WINDOW_MS)
        if (windowState.count <= context.profile.missesPerMinute) {
            return payload
        }

        setRateHeaders(res, context.profile.missesPerMinute, 0, windowState.resetAt)
        res.code(429)
        return JSON.stringify({
            error: 'Too many missing share/file lookups from this client. Retry shortly.',
        })
    })
}
