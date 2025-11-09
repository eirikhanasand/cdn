import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

type PostRequestProps = {
    domain: string
    ip: string
    user_agent: string
    path?: string
    method?: string
    referer?: string
}

export default async function postRequest(req: FastifyRequest, res: FastifyReply) {
    try {
        const {
            domain,
            ip,
            user_agent,
            path,
            method,
            referer,
        } = req.body as PostRequestProps ?? {}

        if (!domain || !ip || !user_agent) {
            return res.status(400).send({ error: 'Missing domain, ip, or user_agent' })
        }

        const logPath = path || '/'
        const logMethod = method || 'GET'

        const query = `
            INSERT INTO request_logs (domain, ip, user_agent, path, method, referer)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (domain, ip, user_agent, path)
            DO UPDATE SET hits = request_logs.hits + 1, last_seen = NOW()
            RETURNING *
        `

        const result = await run(query, [
            domain,
            ip,
            user_agent,
            logPath,
            logMethod,
            referer || null,
        ])

        return res.status(201).send(result.rows[0])
    } catch (error) {
        console.error(`Error logging request: ${error}`)
        return res.status(500).send({ error: 'Failed to log request' })
    }
}
