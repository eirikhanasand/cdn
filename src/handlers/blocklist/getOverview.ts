import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getBlockListOverview(_: FastifyRequest, res: FastifyReply) {
    try {
        const query = `
            SELECT 
                id,
                domain,
                ip,
                user_agent,
                path,
                method,
                referer,
                hits,
                first_seen,
                last_seen
            FROM request_logs
            ORDER BY last_seen DESC
            LIMIT 100
        `

        const result = await run(query)

        if (!result || !result.rowCount) {
            return res.status(404).send({ error: 'No request logs found' })
        }

        const overview = result.rows.map(row => ({
            id: row.id,
            domain: row.domain,
            ip: row.ip,
            user_agent: row.user_agent,
            path: row.path,
            method: row.method,
            referer: row.referer,
            hits: row.hits,
            first_seen: row.first_seen,
            last_seen: row.last_seen
        }))

        return res.status(200).send(overview)
    } catch (error) {
        console.error(`Error fetching request log overview:`, error)
        return res.status(500).send({ error: 'Failed to fetch request log overview' })
    }
}
