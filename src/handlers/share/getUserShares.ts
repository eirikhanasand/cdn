import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getUserShares(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    if (!id) {
        return res.status(400).send({ error: 'Missing user id' })
    }

    try {
        const query = `
            SELECT s.*, 
                   NOT EXISTS (
                       SELECT 1 FROM shares c WHERE c.parent = s.id
                   ) AS has_children
            FROM shares s
            WHERE s.owner = $1
            AND NOT EXISTS (SELECT 1 FROM shares c WHERE c.parent = s.id)
            ORDER BY s.timestamp DESC
        `

        const result = await run(query, [id])

        return res.status(200).send(result.rows)
    } catch (err) {
        console.error(err)
        return res.status(500).send({ error: 'Failed to fetch user shares' })
    }
}
