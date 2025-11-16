import dynamicTPS from '#utils/tps/dynamic.ts'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

type Query = {
    range?: 'all' | 'day' | 'week' | 'month' | 'year'
}

export default async function getDomainTPS(this: FastifyInstance, req: FastifyRequest<{ Querystring: Query }>, res: FastifyReply) {
    const { range } = req.query ?? {}
    if (range) {
        return await dynamicTPS(this, res, range)
    }

    const response = this.cachedTPS
    return res.status(response.status).send(response.data)
}
