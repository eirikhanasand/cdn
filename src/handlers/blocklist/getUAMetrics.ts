import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getUAMetrics(_: FastifyRequest, res: FastifyReply) {
    try {
        const topUaQuery = `
            SELECT user_agent, SUM(hits) AS hits
            FROM request_logs
            GROUP BY user_agent
            ORDER BY hits DESC
            LIMIT 1
        `
        const topUaResult = await run(topUaQuery)
        const topUa = topUaResult.rows[0]?.user_agent

        if (!topUa) {
            return res.status(404).send({ error: 'No user agents found' })
        }

        const topPathsQuery = `
            SELECT path, SUM(hits) AS hits
            FROM request_logs
            WHERE user_agent = $1
            GROUP BY path
            ORDER BY hits DESC
            LIMIT 3
        `
        const topPathsResult = await run(topPathsQuery, [topUa])
        const topPaths = topPathsResult.rows.map((row) => ({
            path: row.path,
            hits: Number(row.hits),
        }))

        const topIpQuery = `
            SELECT ip, SUM(hits) AS hits
            FROM request_logs
            WHERE user_agent = $1
            GROUP BY ip
            ORDER BY hits DESC
            LIMIT 1
        `
        const topIpResult = await run(topIpQuery, [topUa])
        const mostCommonIp = topIpResult.rows[0]?.ip || null

        return res.send({
            user_agent: topUa,
            top_paths: topPaths,
            most_common_ip: mostCommonIp,
        })
    } catch (error) {
        console.error(`Error fetching top user agent stats: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch stats' })
    }
}
