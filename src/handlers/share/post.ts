import run from '#db'
import permissionsWrapper from '#utils/auth/permissionsWrapper.ts'
import getWords from '#utils/getWords.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function postShare(req: FastifyRequest, res: FastifyReply) {
    try {
        const { id, name, path, content, parent } = req.body as { id?: string, name?: string, path?: string; content?: string, parent?: string }
        const idHeader = req.headers['id']
        const userId = Array.isArray(idHeader) ? idHeader.join('') : idHeader 
        const alias = getWords()

        if (!id || !path || !content) {
            return res.status(400).send({ error: 'Missing required fields: id, path or content' })
        }

        if (parent) {
            const perms = await permissionsWrapper({ userId: userId || '', shareId: id })
            if (!perms.status) {
                return res.status(400).send({ error: 'Unauthorized' })
            }
        }

        const query = `
            INSERT INTO shares (id, name, path, content, alias${parent ? ', parent' : ''})
            VALUES ($1, $2, $3, $4, $5${parent ? ', $6' : ''})
            ON CONFLICT (id)
            DO UPDATE SET
                path = EXCLUDED.path,
                content = EXCLUDED.content
            RETURNING *
        `

        const params = [id, name || id, path, content, alias[0]]
        parent && params.push(parent)
        const result = await run(query, params)

        if (!result || result.rowCount === 0) {
            return res.status(500).send({ error: 'Failed to create share' })
        }

        return res.status(201).send(result.rows[0])
    } catch (error) {
        console.log(`Error creating share: ${error}`)
        return res.status(500).send({ error: 'Failed to create share' })
    }
}
