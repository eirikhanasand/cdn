import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function postBlockList(req: FastifyRequest, res: FastifyReply) {
    try {
        const { metric, value } = req.body as { metric?: string; value?: string }
        if (!metric || !value) {
            return res.status(400).send({ error: 'Both metric and value are required' })
        }

        const insertQuery = `
            INSERT INTO blocklist (metric, value)
            VALUES ($1, $2)
            ON CONFLICT (metric, value) DO NOTHING
            RETURNING *
        `

        const result = await run(insertQuery, [metric, value])

        if (!result || !result.rowCount) {
            return res.status(200).send({ message: 'Entry already exists' })
        }

        return res.status(201).send(result.rows[0])
    } catch (error) {
        console.error(`Error adding blocklist entry: ${error}`)
        return res.status(500).send({ error: 'Failed to add blocklist entry' })
    }
}
