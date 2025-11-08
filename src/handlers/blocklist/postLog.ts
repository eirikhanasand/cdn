import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function postRequest(req: FastifyRequest, res: FastifyReply) {
    try {
        const { metric, value, path } = req.body as { metric: 'ip' | 'user_agent'; value: string; path?: string }
        if (!metric || !value) {
            return res.status(400).send({ error: 'Missing metric or value' })
        }

        const logPath = path || '/'

        const query = `
            INSERT INTO request_logs (metric, value, path)
            VALUES ($1, $2, $3)
            ON CONFLICT (metric, value, path)
            DO UPDATE SET hits = request_logs.hits + 1, last_seen = NOW()
            RETURNING *
        `
        const result = await run(query, [metric, value, logPath])

        return res.status(201).send(result.rows[0])
    } catch (error) {
        console.error(`Error logging request: ${error}`)
        return res.status(500).send({ error: 'Failed to log request' })
    }
}
