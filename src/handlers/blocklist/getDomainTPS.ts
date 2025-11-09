import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getDomainTPS(_: FastifyRequest, res: FastifyReply) {
    try {
        const query = `
            SELECT domain, SUM(hits) AS hits
            FROM request_logs
            GROUP BY domain
            ORDER BY domain
        `
        const result = await run(query)

        const domains = result.rows.map((row) => ({
            name: row.domain,
            tps: Number(row.hits),
        }))

        return res.send(domains)
    } catch (error) {
        console.error('Error fetching domains TPS:', error)
        return res.status(500).send({ error: 'Failed to fetch domains TPS' })
    }
}
