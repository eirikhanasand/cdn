import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getRequestLogs(req: FastifyRequest, res: FastifyReply) {
    try {
        const { limit = 100, sort } = req.query as { limit?: number; sort?: string }
        const orderBy = sort === 'hits' ? 'hits DESC' : 'last_seen DESC'
        const query = `
            SELECT metric, value, path, hits, last_seen, created_at
            FROM request_logs
            ORDER BY ${orderBy}
            LIMIT $1
        `
        const result = await run(query, [limit])

        return res.status(200).send(result.rows)
    } catch (error) {
        console.error(`Error fetching request logs: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch request logs' })
    }
}
