import type { FastifyReply, FastifyRequest } from 'fastify'
import queryLinks from './queryLinks.ts'

export default async function getLink(req: FastifyRequest, res: FastifyReply) {
    try {
        const { id } = req.params as { id: string }

        if (!id) {
            return res.status(400).send({ error: 'Missing link ID' })
        }

        try {
            const result = await queryLinks(id)
            if (!result) {
                throw new Error('Link not found')
            }

            return res.status(200).send(result)
        } catch (error) {
            console.log('Link not found:', error)
            return res.status(404).send({ error: 'Link not found' })
        }
    } catch (error) {
        console.log(`Error fetching link: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch link' })
    }
}
