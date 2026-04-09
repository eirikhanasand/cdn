#!/bin/sh

START_TIME=$(date +%s)

echo "-------------------------------------------"
echo "Flushing request logs..."
echo "Start time: $(date)"
echo "-------------------------------------------"

export PGHOST="${DB_HOST}"

psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}" <<EOF
BEGIN;

INSERT INTO request_logs_all (domain, ip, user_agent, path, method, referer, hits, first_seen, last_seen)
SELECT domain, ip, user_agent, path, method, referer, hits, first_seen, last_seen
FROM request_logs;

TRUNCATE TABLE request_logs;

COMMIT;
EOF

psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}" <<EOF
DELETE FROM request_metric_recent_hourly
WHERE bucket < date_trunc('hour', NOW()) - INTERVAL '8 days';
EOF

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "-------------------------------------------"
echo "Done flushing request logs."
echo "End time: $(date)"
echo "Total duration: ${DURATION} seconds"
echo "-------------------------------------------"
