import run from '#db'
import type { FastifyInstance, FastifyReply } from 'fastify'

export default async function dynamicTPS(this: FastifyInstance, res: FastifyReply, range: string) {
    try {
        let whereClause = ''
        let intervalSeconds: number | null = null

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
                const response = this.cachedTPS
                return res.status(response.status).type('application/json').send(response.data)
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
            FROM request_logs_combined_mv
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
