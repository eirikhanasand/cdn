import run from '#db'

type UAMetrics = {
    user_agent: string
    top_paths: TopPath[]
    most_common_ip: string | null
}

type TopPath = {
    path: string
    hits: number
}

export default async function ua() {
    try {
        const topUAsQuery = `
            SELECT user_agent, SUM(hits) AS total_hits
            FROM request_logs_combined_mv
            GROUP BY user_agent
            ORDER BY total_hits DESC
            LIMIT 5
        `
        const topUAsResult = await run(topUAsQuery)
        const UAs = topUAsResult.rows.map(row => row.user_agent)

        if (!UAs.length) {
            return { status: 404, data: { error: 'No user agents found' }}
        }

        const results: UAMetrics[] = []

        for (const ua of UAs) {
            const topPathsQuery = `
                SELECT path, SUM(hits) AS hits
                FROM request_logs_combined_mv
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

            const topIpQuery = `
                SELECT ip, SUM(hits) AS hits
                FROM request_logs_combined_mv
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

        return { status: 200, data: results }
    } catch (error) {
        console.error(`Error fetching top user agent stats: ${error}`)
        return { status: 500, data: { error: 'Failed to fetch stats' } }
    }
}
