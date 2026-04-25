import { withClient } from '#db'

type UpdateRollupsProps = {
    domain: string
    ip: string
    user_agent: string
    path: string
}

export default async function updateRollups({ domain, ip, user_agent, path }: UpdateRollupsProps) {
    await withClient(async client => {
        await client.query('BEGIN')

        try {
            const bucket = new Date()
            bucket.setMinutes(0, 0, 0)
            const bucketISO = bucket.toISOString()

            const totals = [
                ['domain', domain],
                ['path', path],
                ['ip', ip],
                ['user_agent', user_agent],
            ] as const

            for (const [metricType, metricValue] of totals) {
                await client.query(`
                    INSERT INTO request_metric_totals (metric_type, metric_value, hits_total, last_seen)
                    VALUES ($1, $2, 1, NOW())
                    ON CONFLICT (metric_type, metric_value)
                    DO UPDATE SET
                        hits_total = request_metric_totals.hits_total + 1,
                        last_seen = NOW()
                `, [metricType, metricValue])

                await client.query(`
                    INSERT INTO request_metric_recent_hourly (metric_type, metric_value, bucket, hits)
                    VALUES ($1, $2, $3, 1)
                    ON CONFLICT (metric_type, metric_value, bucket)
                    DO UPDATE SET hits = request_metric_recent_hourly.hits + 1
                `, [metricType, metricValue, bucketISO])
            }

            const liveBucket = new Date(Math.floor(Date.now() / 5000) * 5000).toISOString()
            await client.query(`
                INSERT INTO request_metric_live_tps (domain, bucket, hits)
                VALUES ($1, $2, 1)
                ON CONFLICT (domain, bucket)
                DO UPDATE SET hits = request_metric_live_tps.hits + 1
            `, [domain, liveBucket])

            const relations = [
                ['ip', ip, 'path', path],
                ['ip', ip, 'user_agent', user_agent],
                ['user_agent', user_agent, 'path', path],
                ['user_agent', user_agent, 'ip', ip],
            ] as const

            for (const [primaryType, primaryValue, relationType, relationValue] of relations) {
                await client.query(`
                    INSERT INTO request_metric_relations (
                        primary_type, primary_value, relation_type, relation_value, hits_total, last_seen
                    )
                    VALUES ($1, $2, $3, $4, 1, NOW())
                    ON CONFLICT (primary_type, primary_value, relation_type, relation_value)
                    DO UPDATE SET
                        hits_total = request_metric_relations.hits_total + 1,
                        last_seen = NOW()
                `, [primaryType, primaryValue, relationType, relationValue])
            }

            await client.query('COMMIT')
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        }
    })
}
