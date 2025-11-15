import run from '#db'

export default async function tps() {
    try {
        let whereClause = ''
        let intervalSeconds: number | null = null

        whereClause = `WHERE last_seen >= NOW() - INTERVAL '30 seconds'`
        intervalSeconds = 30

        const query = `
            SELECT
                domain,
                SUM(hits) AS hits,
                ${
                    intervalSeconds
                        ? `SUM(hits) / ${intervalSeconds} AS tps`
                        : `SUM(hits) / GREATEST(EXTRACT(EPOCH FROM (MAX(last_seen) - MIN(first_seen))), 1) AS tps`
                }
            FROM request_logs_combined_mv
            ${whereClause}
            GROUP BY domain
            ORDER BY domain
        `

        const result = await run(query)
        const domains = result.rows.map((row) => ({
            name: row.domain,
            hits: Number(row.hits),
            tps: Number(row.tps),
        }))

        return { status: 200, data: domains }
    } catch (error) {
        console.error('Error fetching domains TPS:', error)
        return { status: 500, data: { error: 'Failed to fetch domains TPS' }}
    }
}
