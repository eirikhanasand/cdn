import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getBlockListForNginx(_: FastifyRequest, res: FastifyReply) {
    try {
        const query = `SELECT metric AS type, value FROM blocklist`

        const result = await run(query)

        if (!result || !result.rowCount) {
            return res.status(200).send([])
        }

        const entries = result.rows.map(row => ({
            type: row.type,
            value: row.value
        }))

        return res.status(200).send(entries)
    } catch (error) {
        console.error(`Error fetching blocklist for Nginx: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch blocklist' })
    }
}
