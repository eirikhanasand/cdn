import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getRequestMetrics(req: FastifyRequest, res: FastifyReply) {
    try {
        const { metric = 'path' } = req.query as { metric?: 'path' | 'ip' | 'user_agent' }

        if (!['path', 'ip', 'user_agent'].includes(metric)) {
            return res.status(400).send({ error: 'Invalid metric type' })
        }

        const query = `
            SELECT 
                id,
                ${metric} AS value,
                COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '1 day') AS hits_today,
                COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '7 day') AS hits_last_week,
                COUNT(*) AS hits_total
            FROM request_logs
            GROUP BY ${metric}
            ORDER BY hits_today DESC
            LIMIT 100
        `

        const result = await run(query)

        return res.status(200).send(result.rows)
    } catch (error) {
        console.error(`Error fetching request metrics: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch request metrics' })
    }
}
