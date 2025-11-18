SELECT
    s.alias,
    s.owner
FROM shares s
WHERE s.owner IS NOT NULL
GROUP BY s.alias, s.owner
HAVING COUNT(*) > 1;
