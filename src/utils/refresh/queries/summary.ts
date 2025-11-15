import run from '#db'

export default async function summary() {
    try {
        const resultPath = await run(query('path'))
        const resultIP = await run(query('ip'))
        const resultUA = await run(query('user_agent'))
        const path = resultPath.rows
        const ip = resultIP.rows
        const ua = resultUA.rows

        return { status: 200, data: { path, ip, ua } }
    } catch (error) {
        console.error(`Error fetching request metrics: ${error}`)
        return { status: 500, data: { error: 'Failed to fetch request metrics' } }
    }
}

function query(metric: string) {
    return `
        SELECT 
            ${metric} AS value,
            SUM(hits) FILTER (WHERE last_seen >= NOW() - INTERVAL '1 day') AS hits_today,
            SUM(hits) FILTER (WHERE last_seen >= NOW() - INTERVAL '7 day') AS hits_last_week,
            SUM(hits) AS hits_total
        FROM request_logs_combined_mv
        GROUP BY ${metric}
        ORDER BY hits_today DESC
        LIMIT 5
    `
}
