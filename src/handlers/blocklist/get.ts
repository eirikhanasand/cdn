import run from '#db'
import hasRole from '#utils/auth/hasRole.ts'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getBlockList(req: FastifyRequest, res: FastifyReply) {
    try {
        const user: string = req.headers['id'] as string || ''
        const token = req.headers['authorization'] || ''
        const { status, id: userId } = await tokenWrapper(user, token)
        if (!status || !userId) {
            return res.status(400).send({ error: 'Unauthorized' })
        }

        const allowed = await hasRole({ id: userId, role: 'system_admin' })
        if (!allowed) {
            return res.status(400).send({ error: 'Unauthorized' })
        }

        const { metric, value } = req.query as { metric?: string; value?: string }
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
