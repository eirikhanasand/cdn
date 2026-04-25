import type { FastifyRequest } from 'fastify'
import headerValue from './headerValue.ts'

export default function buildClientKey(req: FastifyRequest) {
    const forwarded = headerValue(req.headers['x-forwarded-for'])
    const realIp = headerValue(req.headers['x-real-ip'])
    const ip = forwarded.split(',')[0]?.trim() || realIp || req.ip || req.socket.remoteAddress || 'unknown'
    const userAgent = headerValue(req.headers['user-agent']) || 'unknown'
    return `${ip}:${userAgent.slice(0, 120)}`
}
