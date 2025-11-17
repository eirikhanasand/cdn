import run from '#db'
import permissionsWrapper from '#utils/auth/permissionsWrapper.ts'
import getWords from '#utils/getWords.ts'
import loadSQL from '#utils/loadSQL.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

type PostShareProps = {
    id?: string
    name?: string
    includeTree?: boolean
    path?: string
    content?: string
    parent?: string
    type?: string
}

export default async function postShare(req: FastifyRequest, res: FastifyReply) {
    try {
        const { id, includeTree, name, path, content, parent, type } = req.body as PostShareProps ?? {}
        const user = req.headers['id']
        const userId = Array.isArray(user) ? user.join('') : user

        if (!id || typeof content !== 'string') {
            return res.status(400).send({ error: 'Missing id or content.' })
        }

        if (type && type !== 'file' && type !== 'folder') {
            return res.status(400).send({ error: `Invalid file type ('file' / 'folder'), but got ${type}.` })
        }

        let alias = ''
        if (parent) {
            const perms = await permissionsWrapper({ userId: userId || '', shareId: parent })
            if (!perms.status) {
                return res.status(401).send({ error: 'Unauthorized' })
            }

            const aliasResult = await run('SELECT alias FROM shares WHERE id = $1', [parent])
            alias = aliasResult.rows[0].alias
        }

        if (!alias) {
            alias = getWords()[0]
        }

        const query = `
            INSERT INTO shares (id, name, path, content, alias, parent, type, owner)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id)
            DO UPDATE SET
                path = EXCLUDED.path,
                content = EXCLUDED.content
            RETURNING *
        `

        const params = [id, name || id, path || null, content, alias, parent || null, type || 'file', userId || null]
        const result = await run(query, params)
        if (!result || result.rowCount === 0) {
            return res.status(500).send({ error: 'Failed to create share' })
        }

        if (!includeTree) {
            return res.status(201).send(result.rows[0])
        }

        const treeQuery = await loadSQL('getFolderTree.sql')
        const treeResult = await run(treeQuery, [id])
        if (treeResult.rows.length === 0) {
            return res.status(404).send({ error: `Share ${id} not found` })
        }

        return res.status(201).send({ ...result.rows[0], tree: treeResult.rows })
    } catch (error) {
        console.log(`Error creating share: ${error}`)
        return res.status(500).send({ error: 'Failed to create share' })
    }
}
