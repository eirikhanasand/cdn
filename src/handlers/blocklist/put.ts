import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function editBlockList(req: FastifyRequest, res: FastifyReply) {
    try {
        const { id } = req.params as { id: string }
        const updates = req.body as Partial<{
            metric: string
            value: string
            vpn: boolean
            proxy: boolean
            tor: boolean
            owner: string
            country: string
            region: string
            city: string
            hits: Record<string, number>[]
        }>

        if (!id) {
            return res.status(400).send({ error: 'Missing blocklist entry ID' })
        }

        const setClauses: string[] = []
        const params: any[] = []

        Object.entries(updates).forEach(([key, val]) => {
            params.push(val)
            setClauses.push(`${key} = $${params.length}`)
        })

        if (!setClauses.length) {
            return res.status(400).send({ error: 'No fields provided to update' })
        }

        params.push(id)
        const query = `
            UPDATE blocklist
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $${params.length}
            RETURNING *
        `

        const result = await run(query, params)

        if (!result || !result.rowCount) {
            return res.status(404).send({ error: 'Blocklist entry not found' })
        }

        return res.status(200).send(result.rows[0])
    } catch (error) {
        console.error(`Error updating blocklist entry: ${error}`)
        return res.status(500).send({ error: 'Failed to update blocklist entry' })
    }
}
