import config from '#constants'
import run from '#db'
import loadSQL from '#utils/loadSQL.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getProjects(req: FastifyRequest, res: FastifyReply) {
    const tokenHeader = req.headers['authorization'] || ''
    const token = tokenHeader.split(' ')[1] ?? ''
    console.log("recieved", "-", token, "-")
    if (!token || token !== config.vm_api_token) {
        return res.status(401).send({ error: 'Unauthorized' })
    }

    try {
        const query = await loadSQL('getAllProjects.sql')
        const result = await run(query)
        return res.status(200).send(result.rows)
    } catch (err) {
        console.error(err)
        return res.status(500).send({ error: 'Failed to fetch projects' })
    }
}
