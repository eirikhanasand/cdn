import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getProjectEditors(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    if (!id) {
        return res.status(400).send({ error: 'Missing user id.' })
    }

    try {
        const query = `
            SELECT 
                s.*,
                EXISTS (
                    SELECT 1 FROM shares c WHERE c.parent = s.id
                ) AS has_children
            FROM shares s
            WHERE $1 = ANY(s.editors)
            AND s.type = 'folder'
            ORDER BY s.timestamp DESC
        `

        const result = await run(query, [id])

        const projects = result.rows.filter(r => r.has_children)
        const nonProjects = result.rows.filter(r => !r.has_children)

        return res.status(200).send({ projects, nonProjects })
    } catch (err) {
        console.error(err)
        return res.status(500).send({ error: 'Failed to fetch projects' })
    }
}
