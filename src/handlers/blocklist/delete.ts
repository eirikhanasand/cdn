import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function deleteBlocklist(req: FastifyRequest, res: FastifyReply) {
    try {
        const { id } = req.params as { id: string }

        if (!id) {
            return res.status(400).send({ error: 'Missing blocklist ID' })
        }

        const query = `
            DELETE FROM blocklist
            WHERE id = $1
            RETURNING *
        `
        const result = await run(query, [id])

        if (!result || !result.rowCount) {
            return res.status(404).send({ error: 'Blocklist entry not found' })
        }

        return res.status(200).send({ message: 'Blocklist entry deleted', deleted: result.rows[0] })
    } catch (error) {
        console.error(`Error deleting blocklist entry: ${error}`)
        return res.status(500).send({ error: 'Failed to delete blocklist entry' })
    }
}
