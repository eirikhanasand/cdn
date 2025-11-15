import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export default async function getRequestMetrics(this: FastifyInstance, req: FastifyRequest, res: FastifyReply) {
    const { metric = 'path' } = req.query as { metric?: 'path' | 'ip' | 'user_agent' }

    if (!['path', 'ip', 'user_agent'].includes(metric)) {
        return res.status(400).send({ error: 'Invalid metric type' })
    }

    const response = this.cachedSummary
    return res.status(response.status).type('application/json').send(response.data[metric])
}
