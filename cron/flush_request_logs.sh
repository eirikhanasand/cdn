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
CREATE UNIQUE INDEX IF NOT EXISTS request_logs_combined_mv_unique_idx
ON request_logs_combined_mv(id);
CREATE INDEX idx_request_logs_ip
ON request_logs_combined_mv(ip);
CREATE INDEX idx_request_logs_user_agent
ON request_logs_combined_mv(user_agent);
CREATE INDEX idx_request_logs_ip_path
ON request_logs_combined_mv(ip, path);
CREATE INDEX idx_request_logs_ua_path
ON request_logs_combined_mv(user_agent, path);
CREATE INDEX idx_request_logs_last_seen_recent
ON request_logs_combined_mv(last_seen)
WHERE last_seen >= NOW() - INTERVAL '7 day';
CREATE INDEX idx_request_logs_domain
ON request_logs_combined_mv(domain);
EOF

psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}" \
     -c "REFRESH MATERIALIZED VIEW CONCURRENTLY request_logs_combined_mv;"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "-------------------------------------------"
echo "Done flushing request logs."
echo "End time: $(date)"
echo "Total duration: ${DURATION} seconds"
echo "-------------------------------------------"
