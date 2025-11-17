import run from '#db'
import estimateReadingTime from '#utils/estimateReadTime.ts'
import loadSQL from '#utils/loadSQL.ts'
import queryAlias from '#utils/share/queryAlias.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getProject(req: FastifyRequest, res: FastifyReply) {
    const { alias } = req.params as { alias: string }
    if (!alias) {
        return res.status(400).send({ error: 'Missing alias.' })
    }

    try {
        const result = await queryAlias(alias)
        if (!result || !result.rows || result.rows.length === 0) {
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

        return res.status(200).send({ tree: treeResult.rows, share })
    } catch (err) {
        console.error(`Error loading project ${alias}:`, err)
        return res.status(500).send({ error: 'Failed to load project' })
    }
}
