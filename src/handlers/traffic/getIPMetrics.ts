import hasRole from '#utils/auth/hasRole.ts'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export default async function getIPMetrics(this: FastifyInstance, req: FastifyRequest, res: FastifyReply) {
    const user: string = req.headers['id'] as string || ''
    const tokenHeader = req.headers['authorization'] || ''
    const token = tokenHeader.split(' ')[1] ?? ''
    const { status, id: userId } = await tokenWrapper(user, token)
    if (!status || !userId) {
        return res.status(400).send({ error: 'Unauthorized' })
    }
    
    const allowed = await hasRole({ id: userId, role: 'system_admin' })
    if (!allowed) {
        return res.status(400).send({ error: 'Unauthorized' })
    }

    const response = this.cachedIPMetrics
    return res.status(response.status).send(response.data)
}
