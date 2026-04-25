import type { FastifyReply, FastifyRequest } from 'fastify'
import getPathname from './getPathname.ts'
import payloadToText from './payloadToText.ts'

export default function isMissResponse(req: FastifyRequest, res: FastifyReply, payload: unknown) {
    if (res.statusCode === 404) {
        return true
    }

    if (getPathname(req.url) !== '/api/files/check' || res.statusCode >= 400) {
        return false
    }

    const text = payloadToText(payload)
    if (!text) {
        return false
    }

    try {
        const parsed = JSON.parse(text) as { exists?: boolean }
        return parsed.exists === false
    } catch {
        return false
    }
}
