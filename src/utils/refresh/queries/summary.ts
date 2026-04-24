import run from '#db'

export default async function summary() {
    try {
        const resultPath = await run(query(), ['path'])
        const resultIP = await run(query(), ['ip'])
        const resultUA = await run(query(), ['user_agent'])
        const resultDomain = await run(query(), ['domain'])
        const path = resultPath.rows
        const ip = resultIP.rows
        const ua = resultUA.rows
        const domain = resultDomain.rows

        return { status: 200, data: { path, ip, ua, domain } }
    } catch (error) {
        console.error(`Error fetching request metrics: ${error}`)
        return { status: 500, data: { error: 'Failed to fetch request metrics' } }
    }
}

function query() {
    return `
        WITH recent AS (
            SELECT
                metric_value AS value,
                SUM(hits) FILTER (WHERE bucket >= date_trunc('hour', NOW())) AS hits_hour,
                SUM(hits) FILTER (WHERE bucket >= date_trunc('hour', NOW()) - INTERVAL '1 day') AS hits_today,
                SUM(hits) FILTER (WHERE bucket >= date_trunc('hour', NOW()) - INTERVAL '7 day') AS hits_last_week
            FROM request_metric_recent_hourly
            WHERE metric_type = $1
              AND bucket >= date_trunc('hour', NOW()) - INTERVAL '7 day'
            GROUP BY metric_value
        )
        SELECT
            recent.value,
            COALESCE(recent.hits_hour, 0) AS hits_hour,
            COALESCE(recent.hits_today, 0) AS hits_today,
            COALESCE(recent.hits_last_week, 0) AS hits_last_week,
            COALESCE(totals.hits_total, 0) AS hits_total
        FROM recent
        LEFT JOIN request_metric_totals AS totals
          ON totals.metric_type = $1
         AND totals.metric_value = recent.value
        ORDER BY recent.hits_hour DESC, recent.hits_today DESC, recent.hits_last_week DESC, totals.hits_total DESC
        LIMIT 5
    `
}
