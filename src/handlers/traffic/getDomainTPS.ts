import dynamicTPS from '#utils/tps/dynamic.ts'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

type Query = {
    fresh?: string
    range?: 'all' | 'day' | 'week' | 'month' | 'year'
}

export default async function getDomainTPS(this: FastifyInstance, req: FastifyRequest<{ Querystring: Query }>, res: FastifyReply) {
    const { fresh, range } = req.query ?? {}
    if (range) {
        return await dynamicTPS(this, res, range)
    }

    if (fresh === '1' || fresh === 'true') {
        const { default: tps } = await import('#utils/refresh/queries/tps.ts')
        const response = await tps()
        return res.type('application/json').status(response.status).send(response.data)
    }

    const response = this.cachedTPS
    return res.type('application/json').status(response.status).send(response.data)
}
