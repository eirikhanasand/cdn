import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

type TopPath = {
    path: string
    hits: number
}

type UAMetrics = {
    user_agent: string
    top_paths: TopPath[]
    most_common_ip: string | null
}

export default async function getUAMetrics(_: FastifyRequest, res: FastifyReply) {
    try {
        // Get top 5 user agents by total hits
        const topUAsQuery = `
            SELECT user_agent, SUM(hits) AS total_hits
            FROM request_logs
            GROUP BY user_agent
            ORDER BY total_hits DESC
            LIMIT 5
        `
        const topUAsResult = await run(topUAsQuery)
        const UAs = topUAsResult.rows.map(row => row.user_agent)

        if (!UAs.length) {
            return res.status(404).send({ error: 'No user agents found' })
        }

        const results: UAMetrics[] = []

        for (const ua of UAs) {
            // Top 3 paths for this user agent
            const topPathsQuery = `
                SELECT path, SUM(hits) AS hits
                FROM request_logs
                WHERE user_agent = $1
                GROUP BY path
                ORDER BY hits DESC
                LIMIT 3
            `
            const topPathsResult = await run(topPathsQuery, [ua])
            const topPaths: TopPath[] = topPathsResult.rows.map(row => ({
                path: row.path,
                hits: Number(row.hits)
            }))

            // Most common IP for this user agent
            const topIpQuery = `
                SELECT ip, SUM(hits) AS hits
                FROM request_logs
                WHERE user_agent = $1
                GROUP BY ip
                ORDER BY hits DESC
                LIMIT 1
            `
            const topIpResult = await run(topIpQuery, [ua])
            const mostCommonIp = topIpResult.rows[0]?.ip || null

            results.push({
                user_agent: ua,
                top_paths: topPaths,
                most_common_ip: mostCommonIp
            })
        }

        return res.send(results)
    } catch (error) {
        console.error(`Error fetching top user agent stats: ${error}`)
        return res.status(500).send({ error: 'Failed to fetch stats' })
    }
}
