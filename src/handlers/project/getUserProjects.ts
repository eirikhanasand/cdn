import run from '#db'
import loadSQL from '#utils/loadSQL.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getUserProjects(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    if (!id) {
        return res.status(400).send({ error: 'Missing user id.' })
    }

    try {
        const query = await loadSQL('getProjects.sql')
        const result = await run(query, [id])
        const projects = result.rows.filter(r => r.has_children)
        const nonProjects = result.rows.filter(r => !r.has_children)

        return res.status(200).send({ projects, nonProjects })
    } catch (err) {
        console.error(err)
        return res.status(500).send({ error: 'Failed to fetch user projects' })
    }
}
