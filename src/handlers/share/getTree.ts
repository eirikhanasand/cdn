import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#utils/db.ts'
import { loadSQL } from '#utils/loadSQL.ts'

export default async function getTree(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }

    try {
        const query = await loadSQL('getFolderTree.sql')
        const result = await run(query, [id])

        if (result.rows.length === 0) {
            return res.status(404).send({ error: 'Share not found' })
        }

        return res.send(result.rows)
    } catch (error) {
        console.error(error)
        return res.status(500).send({ error: 'Internal server error' })
    }
}
