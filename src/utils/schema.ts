import { withClient } from '#db'

export default async function ensureSchema() {
    await withClient(async (client) => {
        await client.query(`
            CREATE TABLE IF NOT EXISTS request_metric_totals (
                metric_type TEXT NOT NULL CHECK (metric_type IN ('path', 'ip', 'user_agent', 'domain')),
                metric_value TEXT NOT NULL,
                hits_total BIGINT NOT NULL DEFAULT 0,
                last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (metric_type, metric_value)
            );

            CREATE TABLE IF NOT EXISTS request_metric_recent_hourly (
                metric_type TEXT NOT NULL CHECK (metric_type IN ('path', 'ip', 'user_agent', 'domain')),
                metric_value TEXT NOT NULL,
                bucket TIMESTAMPTZ NOT NULL,
                hits BIGINT NOT NULL DEFAULT 0,
                PRIMARY KEY (metric_type, metric_value, bucket)
            );

            CREATE TABLE IF NOT EXISTS request_metric_live_tps (
                domain TEXT NOT NULL,
                bucket TIMESTAMPTZ NOT NULL,
                hits BIGINT NOT NULL DEFAULT 0,
                PRIMARY KEY (domain, bucket)
            );

            ALTER TABLE request_metric_totals
            DROP CONSTRAINT IF EXISTS request_metric_totals_metric_type_check;

            ALTER TABLE request_metric_recent_hourly
            DROP CONSTRAINT IF EXISTS request_metric_recent_hourly_metric_type_check;

            ALTER TABLE request_metric_totals
            ADD CONSTRAINT request_metric_totals_metric_type_check
            CHECK (metric_type IN ('path', 'ip', 'user_agent', 'domain'));

            ALTER TABLE request_metric_recent_hourly
            ADD CONSTRAINT request_metric_recent_hourly_metric_type_check
            CHECK (metric_type IN ('path', 'ip', 'user_agent', 'domain'));

            CREATE TABLE IF NOT EXISTS request_metric_relations (
                primary_type TEXT NOT NULL CHECK (primary_type IN ('ip', 'user_agent')),
                primary_value TEXT NOT NULL,
                relation_type TEXT NOT NULL CHECK (relation_type IN ('path', 'ip', 'user_agent')),
                relation_value TEXT NOT NULL,
                hits_total BIGINT NOT NULL DEFAULT 0,
                last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (primary_type, primary_value, relation_type, relation_value)
            );
        `)

        await client.query(`
            DROP INDEX IF EXISTS idx_request_logs_domain;
            DROP INDEX IF EXISTS idx_request_logs_last_seen;

            CREATE UNIQUE INDEX IF NOT EXISTS idx_request_logs_identity
            ON request_logs(domain, ip, user_agent, path);

            CREATE INDEX IF NOT EXISTS idx_request_logs_last_seen
            ON request_logs(last_seen DESC);

            CREATE INDEX IF NOT EXISTS idx_request_logs_domain
            ON request_logs(domain);

            CREATE INDEX IF NOT EXISTS idx_request_logs_all_last_seen
            ON request_logs_all(last_seen DESC);

            CREATE INDEX IF NOT EXISTS idx_request_logs_all_domain
            ON request_logs_all(domain);

            CREATE INDEX IF NOT EXISTS idx_request_metric_totals_lookup
            ON request_metric_totals(metric_type, hits_total DESC, metric_value);

            CREATE INDEX IF NOT EXISTS idx_request_metric_recent_hourly_lookup
            ON request_metric_recent_hourly(metric_type, bucket DESC, metric_value);

            CREATE INDEX IF NOT EXISTS idx_request_metric_relations_lookup
            ON request_metric_relations(primary_type, primary_value, relation_type, hits_total DESC, relation_value);

            CREATE INDEX IF NOT EXISTS idx_request_metric_live_tps_bucket
            ON request_metric_live_tps(bucket DESC);
        `)

        const totalsCount = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM request_metric_totals')

        if (Number(totalsCount.rows[0]?.count ?? '0') === 0) {
            await client.query(`
                WITH combined AS (
                    SELECT ip::text AS ip, user_agent, path, hits, last_seen
                    FROM request_logs_all
                    UNION ALL
                    SELECT ip::text AS ip, user_agent, path, hits, last_seen
                    FROM request_logs
                ),
                metric_rows AS (
                    SELECT 'path'::text AS metric_type, path AS metric_value, SUM(hits)::bigint AS hits_total, MAX(last_seen) AS last_seen
                    FROM combined
                    GROUP BY path
                    UNION ALL
                    SELECT 'ip'::text AS metric_type, ip AS metric_value, SUM(hits)::bigint AS hits_total, MAX(last_seen) AS last_seen
                    FROM combined
                    GROUP BY ip
                    UNION ALL
                    SELECT
                        'user_agent'::text AS metric_type,
                        user_agent AS metric_value,
                        SUM(hits)::bigint AS hits_total,
                        MAX(last_seen) AS last_seen
                    FROM combined
                    GROUP BY user_agent
                )
                INSERT INTO request_metric_totals (metric_type, metric_value, hits_total, last_seen)
                SELECT metric_type, metric_value, hits_total, last_seen
                FROM metric_rows
                ON CONFLICT (metric_type, metric_value)
                DO UPDATE SET
                    hits_total = EXCLUDED.hits_total,
                    last_seen = GREATEST(request_metric_totals.last_seen, EXCLUDED.last_seen);
            `)

            await client.query(`
                WITH combined AS (
                    SELECT ip::text AS ip, user_agent, path, hits, date_trunc('hour', last_seen) AS bucket
                    FROM request_logs_all
                    WHERE last_seen >= NOW() - INTERVAL '8 days'
                    UNION ALL
                    SELECT ip::text AS ip, user_agent, path, hits, date_trunc('hour', last_seen) AS bucket
                    FROM request_logs
                    WHERE last_seen >= NOW() - INTERVAL '8 days'
                ),
                hourly_rows AS (
                    SELECT 'path'::text AS metric_type, path AS metric_value, bucket, SUM(hits)::bigint AS hits
                    FROM combined
                    GROUP BY path, bucket
                    UNION ALL
                    SELECT 'ip'::text AS metric_type, ip AS metric_value, bucket, SUM(hits)::bigint AS hits
                    FROM combined
                    GROUP BY ip, bucket
                    UNION ALL
                    SELECT 'user_agent'::text AS metric_type, user_agent AS metric_value, bucket, SUM(hits)::bigint AS hits
                    FROM combined
                    GROUP BY user_agent, bucket
                )
                INSERT INTO request_metric_recent_hourly (metric_type, metric_value, bucket, hits)
                SELECT metric_type, metric_value, bucket, hits
                FROM hourly_rows
                ON CONFLICT (metric_type, metric_value, bucket)
                DO UPDATE SET hits = EXCLUDED.hits;
            `)

            await client.query(`
                WITH combined AS (
                    SELECT ip::text AS ip, user_agent, path, hits, last_seen
                    FROM request_logs_all
                    UNION ALL
                    SELECT ip::text AS ip, user_agent, path, hits, last_seen
                    FROM request_logs
                ),
                relation_rows AS (
                    SELECT
                        'ip'::text AS primary_type,
                        ip AS primary_value,
                        'path'::text AS relation_type,
                        path AS relation_value,
                        SUM(hits)::bigint AS hits_total,
                        MAX(last_seen) AS last_seen
                    FROM combined
                    GROUP BY ip, path
                    UNION ALL
                    SELECT
                        'ip'::text AS primary_type,
                        ip AS primary_value,
                        'user_agent'::text AS relation_type,
                        user_agent AS relation_value,
                        SUM(hits)::bigint AS hits_total,
                        MAX(last_seen) AS last_seen
                    FROM combined
                    GROUP BY ip, user_agent
                    UNION ALL
                    SELECT
                        'user_agent'::text AS primary_type,
                        user_agent AS primary_value,
                        'path'::text AS relation_type,
                        path AS relation_value,
                        SUM(hits)::bigint AS hits_total,
                        MAX(last_seen) AS last_seen
                    FROM combined
                    GROUP BY user_agent, path
                    UNION ALL
                    SELECT
                        'user_agent'::text AS primary_type,
                        user_agent AS primary_value,
                        'ip'::text AS relation_type,
                        ip AS relation_value,
                        SUM(hits)::bigint AS hits_total,
                        MAX(last_seen) AS last_seen
                    FROM combined
                    GROUP BY user_agent, ip
                )
                INSERT INTO request_metric_relations (primary_type, primary_value, relation_type, relation_value, hits_total, last_seen)
                SELECT primary_type, primary_value, relation_type, relation_value, hits_total, last_seen
                FROM relation_rows
                ON CONFLICT (primary_type, primary_value, relation_type, relation_value)
                DO UPDATE SET
                    hits_total = EXCLUDED.hits_total,
                    last_seen = GREATEST(request_metric_relations.last_seen, EXCLUDED.last_seen);
            `)
        }

        await client.query(`
            WITH combined AS (
                SELECT domain, hits, last_seen
                FROM request_logs_all
                UNION ALL
                SELECT domain, hits, last_seen
                FROM request_logs
            )
            INSERT INTO request_metric_totals (metric_type, metric_value, hits_total, last_seen)
            SELECT
                'domain'::text AS metric_type,
                domain AS metric_value,
                SUM(hits)::bigint AS hits_total,
                MAX(last_seen) AS last_seen
            FROM combined
            GROUP BY domain
            ON CONFLICT (metric_type, metric_value)
            DO UPDATE SET
                hits_total = EXCLUDED.hits_total,
                last_seen = GREATEST(request_metric_totals.last_seen, EXCLUDED.last_seen);
        `)

        await client.query(`
            WITH combined AS (
                SELECT domain, hits, date_trunc('hour', last_seen) AS bucket
                FROM request_logs_all
                WHERE last_seen >= NOW() - INTERVAL '8 days'
                UNION ALL
                SELECT domain, hits, date_trunc('hour', last_seen) AS bucket
                FROM request_logs
                WHERE last_seen >= NOW() - INTERVAL '8 days'
            )
            INSERT INTO request_metric_recent_hourly (metric_type, metric_value, bucket, hits)
            SELECT
                'domain'::text AS metric_type,
                domain AS metric_value,
                bucket,
                SUM(hits)::bigint AS hits
            FROM combined
            GROUP BY domain, bucket
            ON CONFLICT (metric_type, metric_value, bucket)
            DO UPDATE SET hits = EXCLUDED.hits;
        `)

        await client.query(`
            WITH live AS (
                SELECT
                    domain,
                    to_timestamp(FLOOR(EXTRACT(EPOCH FROM last_seen) / 5) * 5) AS bucket,
                    SUM(hits)::bigint AS hits
                FROM request_logs
                WHERE last_seen >= NOW() - INTERVAL '2 days'
                GROUP BY domain, bucket
            )
            INSERT INTO request_metric_live_tps (domain, bucket, hits)
            SELECT domain, bucket, hits
            FROM live
            ON CONFLICT (domain, bucket)
            DO UPDATE SET hits = EXCLUDED.hits;
        `)

        await client.query(`
            DELETE FROM request_metric_recent_hourly
            WHERE bucket < date_trunc('hour', NOW()) - INTERVAL '8 days';
        `)

        await client.query(`
            DELETE FROM request_metric_live_tps
            WHERE bucket < NOW() - INTERVAL '2 days';
        `)
    })
}
