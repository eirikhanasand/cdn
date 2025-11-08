import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getBlockListOverview(_: FastifyRequest, res: FastifyReply) {
    try {
        const query = `
            SELECT 
                metric AS type,
                value,
                hits,
                created_at,
                updated_at
            FROM blocklist
            ORDER BY created_at DESC
            LIMIT 100
        `

        const result = await run(query)

        if (!result || !result.rowCount) {
            return res.status(404).send({ error: 'No blocklist entries found' })
        }

        const overview = result.rows.map(row => ({
            type: row.type,
            value: row.value,
            hits: row.hits,
            created_at: row.created_at,
            updated_at: row.updated_at
        }))

        return res.status(200).send(overview)
    } catch (error) {
        console.error(`Error fetching blocklist overview: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch blocklist overview' })
    }
}
