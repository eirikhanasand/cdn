import { withClient } from '#db'
import run from '#db'
import type { FastifyReply, FastifyRequest } from 'fastify'

type PostRequestProps = {
    domain: string
    ip: string
    user_agent: string
    path?: string
    method?: string
    referer?: string
}

export default async function postRequest(req: FastifyRequest, res: FastifyReply) {
    try {
        const ua = req.headers['user-agent'] || ''
        if (!ua.toString().startsWith('Hanasand Traffic Logger')) {
            return res.status(401).send({ error: 'Unauthorized' })
        }

        const {
            domain,
            ip,
            user_agent,
            path,
            method,
            referer,
        } = req.body as PostRequestProps ?? {}
        if (!domain || !ip || !user_agent) {
            return res.status(400).send({ error: 'Missing domain, ip, or user_agent' })
        }

        const logPath = path || '/'
        const logMethod = method || 'GET'
        const query = `
            INSERT INTO request_logs (domain, ip, user_agent, path, method, referer)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (domain, ip, user_agent, path)
            DO UPDATE SET
                hits = request_logs.hits + 1,
                last_seen = NOW(),
                method = EXCLUDED.method,
                referer = EXCLUDED.referer
            RETURNING *
        `

        const params = [
            domain,
            ip,
            user_agent,
            logPath,
            logMethod,
            referer || null,
        ]

        const result = await run(query, params)

        try {
            await updateRollups({ ip, user_agent, path: logPath })
        } catch (error) {
            console.error(`Rollup update skipped: ${error}`)
        }

        return res.status(201).send(result.rows[0])
    } catch (error) {
        console.error(`Error logging request: ${error}`)
        return res.status(500).send({ error: 'Failed to log request' })
    }
}

async function updateRollups({ ip, user_agent, path }: { ip: string, user_agent: string, path: string }) {
    await withClient(async (client) => {
        await client.query('BEGIN')

        try {
            const bucket = new Date()
            bucket.setMinutes(0, 0, 0)
            const bucketISO = bucket.toISOString()

            const totals = [
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
