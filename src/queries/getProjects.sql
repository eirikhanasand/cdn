SELECT
    s.alias,
    MIN(s.owner) AS owner,
    ARRAY_AGG(DISTINCT e.editor) AS editors,
    COUNT(*) AS file_count,
    SUM(OCTET_LENGTH(COALESCE(s.content, ''))) AS total_size,
    MAX(s.timestamp) AS last_updated
FROM shares s
LEFT JOIN LATERAL UNNEST(s.editors) AS e(editor) ON true
WHERE s.owner = $1
GROUP BY s.alias
HAVING COUNT(*) > 1
ORDER BY last_updated DESC;
