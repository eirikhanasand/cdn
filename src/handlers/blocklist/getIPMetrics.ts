import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getIPMetrics(_: FastifyRequest, res: FastifyReply) {
    try {
        const topIpQuery = `
            SELECT ip, SUM(hits) AS hits
            FROM request_logs
            GROUP BY ip
            ORDER BY hits DESC
            LIMIT 1
        `
        const topIpResult = await run(topIpQuery)
        const topIp = topIpResult.rows[0]?.ip

        if (!topIp) {
            return res.status(404).send({ error: 'No IPs found' })
        }

        const topPathsQuery = `
            SELECT path, SUM(hits) AS hits
            FROM request_logs
            WHERE ip = $1
            GROUP BY path
            ORDER BY hits DESC
            LIMIT 3
        `
        const topPathsResult = await run(topPathsQuery, [topIp])
        const topPaths = topPathsResult.rows.map((row) => ({
            path: row.path,
            hits: Number(row.hits),
        }))

        const topUaQuery = `
            SELECT user_agent, SUM(hits) AS hits
            FROM request_logs
            WHERE ip = $1
            GROUP BY user_agent
            ORDER BY hits DESC
            LIMIT 1
        `
        const topUaResult = await run(topUaQuery, [topIp])
        const mostCommonUa = topUaResult.rows[0]?.user_agent || null

        return res.send({
            ip: topIp,
            top_paths: topPaths,
            most_common_user_agent: mostCommonUa,
        })
    } catch (error) {
        console.error(`Error fetching top IP stats: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch stats' })
    }
}
