import run from '#db'
import estimateReadingTime from '#utils/estimateReadTime.ts'
import getWords from '#utils/getWords.ts'
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

async function queryShare(id: string) {
    const query = 'SELECT * FROM shares WHERE id = $1'
    const result = await run(query, [id])

    if (!result || result.rowCount === 0) {
        const alias = getWords()
        const query = `
            INSERT INTO shares (id, content, name, alias)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `
        const insertResult = await run(query, [id, "", id, alias[0]])
        if (insertResult) {
            const query = 'SELECT * FROM shares WHERE id = $1'
            const result = await run(query, [id])
            return result
        }
    }

    if (result.rowCount) {
        return result
    }

    return 404
}
