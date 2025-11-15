import run from '#db'
import hasRole from '#utils/auth/hasRole.ts'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import type { FastifyReply, FastifyRequest } from 'fastify'

type TopPath = {
    path: string
    hits: number
}

type IPMetrics = {
    ip: string
    top_paths: TopPath[]
    most_common_user_agent: string | null
}

export default async function getIPMetrics(req: FastifyRequest, res: FastifyReply) {
    try {
        const user: string = req.headers['id'] as string || ''
        const token = req.headers['authorization'] || ''
        const { status, id: userId } = await tokenWrapper(user, token)
        if (!status || !userId) {
            return res.status(400).send({ error: 'Unauthorized' })
        }

        const allowed = await hasRole({ id: userId, role: 'system_admin' })
        if (!allowed) {
            return res.status(400).send({ error: 'Unauthorized' })
        }

        const topIpsQuery = `
            SELECT ip, SUM(hits) AS total_hits
            FROM request_logs
            GROUP BY ip
            ORDER BY total_hits DESC
            LIMIT 5
        `
        const topIpsResult = await run(topIpsQuery)
        const ips = topIpsResult.rows.map(row => row.ip)

        if (!ips.length) {
            return res.status(404).send({ error: 'No IPs found' })
        }

        const results: IPMetrics[] = []

        for (const ip of ips) {
            const topPathsQuery = `
                SELECT path, SUM(hits) AS hits
                FROM request_logs
                WHERE ip = $1
                GROUP BY path
                ORDER BY hits DESC
                LIMIT 3
            `
            const topPathsResult = await run(topPathsQuery, [ip])
            const topPaths: TopPath[] = topPathsResult.rows.map(row => ({
                path: row.path,
                hits: Number(row.hits)
            }))

            const topUaQuery = `
                SELECT user_agent, SUM(hits) AS hits
                FROM request_logs
                WHERE ip = $1
                GROUP BY user_agent
                ORDER BY hits DESC
                LIMIT 1
            `
            const topUaResult = await run(topUaQuery, [ip])
            const mostCommonUa = topUaResult.rows[0]?.user_agent || null

            results.push({
                ip,
                top_paths: topPaths,
                most_common_user_agent: mostCommonUa
            })
        }

        return res.send(results)
    } catch (error) {
        console.error(`Error fetching top IP stats: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch stats' })
    }
}
