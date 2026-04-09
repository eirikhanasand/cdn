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
            SELECT metric_value AS ip, hits_total AS total_hits
            FROM request_metric_totals
            WHERE metric_type = 'ip'
            ORDER BY hits_total DESC
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
                SELECT relation_value AS path, hits_total AS hits
                FROM request_metric_relations
                WHERE primary_type = 'ip'
                  AND primary_value = $1
                  AND relation_type = 'path'
                ORDER BY hits_total DESC
                LIMIT 3
            `
            const topPathsResult = await run(topPathsQuery, [ip])
            const topPaths: TopPath[] = topPathsResult.rows.map(row => ({
                path: row.path,
                hits: Number(row.hits)
            }))

            const topUaQuery = `
                SELECT relation_value AS user_agent, hits_total AS hits
                FROM request_metric_relations
                WHERE primary_type = 'ip'
                  AND primary_value = $1
                  AND relation_type = 'user_agent'
                ORDER BY hits_total DESC
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
