import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getBlockList(req: FastifyRequest, res: FastifyReply) {
    try {
        const { metric, value } = req.query as { metric?: string; value?: string }
        if (!metric && !value) {
            return res.status(400).send({ error: 'Missing query parameters: metric or value required' })
        }

        const conditions: string[] = []
        const params: any[] = []

        if (metric) {
            params.push(metric)
            conditions.push(`metric = $${params.length}`)
        }

        if (value) {
            params.push(value)
            conditions.push(`value = $${params.length}`)
        }

        const query = `
            SELECT *
            FROM blocklist
            ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
            ORDER BY created_at DESC
            LIMIT 100
        `

        const result = await run(query, params)

        if (!result || !result.rowCount) {
            return res.status(404).send({ error: 'No blocklist entries found' })
        }

        return res.status(200).send(result.rows)
    } catch (error) {
        console.error(`Error fetching blocklist: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch blocklist' })
    }
}
