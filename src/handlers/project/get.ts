import run from '#db'
import estimateReadingTime from '#utils/estimateReadTime.ts'
import loadSQL from '#utils/loadSQL.ts'
import buildTree from '#utils/share/buildTree.ts'
import queryAlias from '#utils/share/queryAlias.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getProject(req: FastifyRequest, res: FastifyReply) {
    const { alias } = req.params as { alias: string }
    if (!alias) {
        return res.status(400).send({ error: 'Missing alias.' })
    }

    try {
        const result = await queryAlias(alias)
        if (!result || result.rows.length <= 1) {
            return res.status(404).send({ error: `Project ${alias} not found` })
        }

        const data = result.rows[0]
        const readTime = estimateReadingTime(data.content)
        const share = { ...data, ...readTime }
        const treeQuery = await loadSQL('getFolderTree.sql')
        const treeResult = await run(treeQuery, [data.id])
        if (treeResult.rows.length === 0) {
            return res.status(404).send({ error: `Project ${alias} not found` })
        }

        const tree = buildTree(treeResult.rows as FileItem[])
        return res.status(200).send({ tree, share })
    } catch (error) {
        console.error(`Error loading project ${alias}:`, error)
        return res.status(500).send({ error: 'Failed to load project' })
    }
}
