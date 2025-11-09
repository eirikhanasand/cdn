import run from '#db'
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

export default async function getIPMetrics(_: FastifyRequest, res: FastifyReply) {
    try {
        // Get top 5 IPs by total hits
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
            // Top 3 paths for this IP
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

            // Most common user agent for this IP
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
