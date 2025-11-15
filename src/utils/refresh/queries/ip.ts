import run from '#db'

type TopPath = {
    path: string
    hits: number
}

type IPMetrics = {
    ip: string
    top_paths: TopPath[]
    most_common_user_agent: string | null
}

export default async function ip() {
    try {
        const topIpsQuery = `
            SELECT ip, SUM(hits) AS total_hits
            FROM request_logs_combined_mv
            GROUP BY ip
            ORDER BY total_hits DESC
            LIMIT 5
        `
        const topIpsResult = await run(topIpsQuery)
        const ips = topIpsResult.rows.map(row => row.ip)

        if (!ips.length) {
            return { status: 404, data: { error: 'No IPs found' } }
        }

        const results: IPMetrics[] = []

        for (const ip of ips) {
            const topPathsQuery = `
                SELECT path, SUM(hits) AS hits
                FROM request_logs_combined_mv
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
                FROM request_logs_combined_mv
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

        return { status: 200, data: results }
    } catch (error) {
        console.error(`Error fetching top IP stats: ${error}`)
        return { status: 500, data: { error: 'Failed to fetch stats' } }
    }
}
