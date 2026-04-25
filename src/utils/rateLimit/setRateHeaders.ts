import type { FastifyReply } from 'fastify'

export default function setRateHeaders(res: FastifyReply, limit: number, remaining: number, resetAt: number) {
    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
    res.header('X-RateLimit-Limit', String(limit))
    res.header('X-RateLimit-Remaining', String(remaining))
    res.header('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))
    res.header('Retry-After', String(retryAfter))
}
