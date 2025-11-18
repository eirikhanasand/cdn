SELECT
    s.alias,
    COALESCE(ARRAY_AGG(DISTINCT e.editor) FILTER (WHERE e.editor IS NOT NULL), '{}') AS editors,
    s.owner
FROM shares s
LEFT JOIN LATERAL UNNEST(s.editors) AS e(editor) ON true
WHERE s.owner IS NOT NULL
GROUP BY s.alias, s.owner
HAVING COUNT(*) > 1;
