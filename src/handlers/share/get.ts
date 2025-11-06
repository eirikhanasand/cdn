import run from '#db'
import estimateReadingTime from '#utils/estimateReadTime.ts'
import getWords from '#utils/getWords.ts'
import queryShare from '#utils/share/queryShare.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getShare(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    if (!id) {
        return res.status(400).send({ error: 'Missing share ID' })
    }

    try {
        const result = await queryShare(id)
        if (result === 404) {
            throw new Error(`Share ${id} not found`)
        }

        const data = result.rows[0]
        const readTime = estimateReadingTime(data.content)
        const response = { ...data, ...readTime }
        return res.status(200).send(response)
    } catch (error) {
        return res.status(404).send({ error: `Share ${id} not found` })
    }
}
