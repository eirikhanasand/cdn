import run from '#db'
import loadSQL from '#utils/loadSQL.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import hasInternalToken from '#utils/auth/internalToken.ts'

export default async function getProjects(req: FastifyRequest, res: FastifyReply) {
    if (!hasInternalToken(req)) {
        return res.status(401).send({ error: 'Unauthorized' })
    }

    try {
        const query = await loadSQL('getAllProjects.sql')
        const result = await run(query)
        return res.status(200).send(result.rows)
    } catch (error) {
        console.log('Failed to fetch projects:', error)
        return res.status(500).send({ error: 'Failed to fetch projects' })
    }
}
