import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function removeShareEditors(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const { editors } = req.body as { editors: string[] }

    if (!id) {
        return res.status(400).send({ error: 'Missing share id' })
    }

    if (!editors || !Array.isArray(editors) || editors.length === 0) {
        return res.status(400).send({ error: 'Editors array is required' })
    }

    try {
        const query = `
            UPDATE shares
            SET editors = (
                SELECT COALESCE(ARRAY(
                    SELECT unnest(editors) EXCEPT SELECT unnest($2::text[])
                ), '{}')
            )
            WHERE id = $1
            RETURNING *
        `

        const result = await run(query, [id, editors])
        if (!result || result.rowCount === 0) {
            return res.status(404).send({ error: `Share ${id} not found` })
        }

        return res.status(200).send(result.rows[0])
    } catch (err) {
        console.error(`Error removing editors from share:`, err)
        return res.status(500).send({ error: 'Failed to remove editors' })
    }
}
