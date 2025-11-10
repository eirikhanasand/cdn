import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

type Query = {
    range?: 'all' | 'day' | 'week' | 'month' | 'year'
}

export default async function getDomainTPS(req: FastifyRequest<{ Querystring: Query }>, res: FastifyReply) {
    try {
        const { range } = req.query || {}

        let whereClause = ''
        let intervalSeconds: number | null = null

        if (!range) {
            // Default: real-time TPS over last 1 second
            whereClause = `WHERE last_seen >= NOW() - INTERVAL '1 second'`
            intervalSeconds = 1
        } else {
            switch (range) {
                case 'day':
                    whereClause = `WHERE last_seen >= NOW() - INTERVAL '1 day'`
                    intervalSeconds = 86400
                    break
                case 'week':
                    whereClause = `WHERE last_seen >= NOW() - INTERVAL '1 week'`
                    intervalSeconds = 604800
                    break
                case 'month':
                    whereClause = `WHERE last_seen >= NOW() - INTERVAL '1 month'`
                    intervalSeconds = 2592000
                    break
                case 'year':
                    whereClause = `WHERE last_seen >= NOW() - INTERVAL '1 year'`
                    intervalSeconds = 31536000
                    break
                case 'all':
                    whereClause = ''
                    intervalSeconds = null
                    break
                default:
                    whereClause = `WHERE last_seen >= NOW() - INTERVAL '1 second'`
                    intervalSeconds = 1
            }
        }

        const query = `
            SELECT
                domain,
                SUM(hits) AS hits,
                ${
                    intervalSeconds
                        ? `SUM(hits) / ${intervalSeconds} AS tps`
                        : `SUM(hits) / GREATEST(EXTRACT(EPOCH FROM (MAX(last_seen) - MIN(first_seen))), 1) AS tps`
                }
            FROM request_logs
            ${whereClause}
            GROUP BY domain
            ORDER BY domain
        `

        const result = await run(query)
        const domains = result.rows.map((row) => ({
            name: row.domain,
            hits: Number(row.hits),
            tps: Number(row.tps),
        }))

        return res.send(domains)
    } catch (error) {
        console.error('Error fetching domains TPS:', error)
        return res.status(500).send({ error: 'Failed to fetch domains TPS' })
    }
}
