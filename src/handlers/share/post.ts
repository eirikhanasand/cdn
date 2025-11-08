import run from '#db'
import permissionsWrapper from '#utils/auth/permissionsWrapper.ts'
import getWords from '#utils/getWords.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

type PostShareProps = {
    id?: string
    name?: string
    path?: string
    content?: string
    parent?: string
    type?: string
}

export default async function postShare(req: FastifyRequest, res: FastifyReply) {
    try {
        const { id, name, path, content, parent, type } = req.body as PostShareProps ?? {}
        const idHeader = req.headers['id']
        const userId = Array.isArray(idHeader) ? idHeader.join('') : idHeader 
        const alias = getWords()

        if (!id || !path || !content) {
            return res.status(400).send({ error: 'Missing required fields: id, path or content.' })
        }

        if (type && type !== 'file' && type !== 'folder') {
            return res.status(400).send({ error: `Invalid file type ('file' / 'folder'), but got ${type}.` })
        }

        if (parent) {
            const perms = await permissionsWrapper({ userId: userId || '', shareId: id })
            if (!perms.status) {
                return res.status(400).send({ error: 'Unauthorized' })
            }
        }

        const query = `
            INSERT INTO shares (id, name, path, content, alias, parent, type)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id)
            DO UPDATE SET
                path = EXCLUDED.path,
                content = EXCLUDED.content
            RETURNING *
        `

        const params = [id, name || id, path, content, alias[0], parent || null, type || 'file']
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
