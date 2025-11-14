import run from '#db'
import permissionsWrapper from '#utils/auth/permissionsWrapper.ts'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function lockShare(req: FastifyRequest, res: FastifyReply) {
    try {
        const { id } = req.params as { id: string }
        const { status, id: userId } = await tokenWrapper(id, (req.headers['authorization'] || ''))
        if (!status || !userId) {
            return res.status(400).send({ error: 'Unauthorized' })
        }

        const allowed = await permissionsWrapper({ userId, shareId: id })
        if (!allowed.status) {
            return res.status(400).send({ error: 'Unauthorized' })
        }

        const query = `
            UPDATE shares
            SET locked = TRUE
            WHERE id = $1
            RETURNING *
        `
        const result = await run(query, [id])

        if (!result || result.rowCount === 0) {
            return res.status(404).send({ error: `Share ${id} not found` })
        }

        return res.status(200).send(result.rows[0])
    } catch (error) {
        console.log(`Error locking share: ${error}`)
        return res.status(500).send({ error: 'Failed to lock share' })
    }
}
