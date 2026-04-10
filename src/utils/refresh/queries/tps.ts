import run from '#db'

export default async function tps() {
    try {
        const query = `
            SELECT
                domain,
                SUM(hits) AS hits,
                SUM(hits)::float / 30 AS tps
            FROM request_metric_live_tps
            WHERE bucket >= NOW() - INTERVAL '30 seconds'
            GROUP BY domain
            ORDER BY tps DESC, hits DESC, domain ASC
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
