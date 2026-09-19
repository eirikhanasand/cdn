import type { FastifyReply, FastifyRequest } from 'fastify'
import { storageStatus } from '#utils/fileStorage.ts'
export default async function health(req: FastifyRequest, res: FastifyReply) {
    res.header('Cache-Control', 'no-store')
    try {
        const state = await storageStatus()
        return res.status(state.ok ? 200 : 503).send({ ...state, release: process.env.HANASAND_RELEASE_COMMIT || 'unknown' })
    } catch (error) {
        req.log.error({ error }, 'CDN health check failed')
        return res.status(503).send({ ok: false, error: 'CDN storage or database is unavailable.' })
    }
}
