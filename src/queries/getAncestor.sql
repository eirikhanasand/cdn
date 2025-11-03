WITH RECURSIVE ancestors AS (
    SELECT id, parent
    FROM share
    WHERE id = $1

    UNION ALL

    SELECT s.id, s.parent
    FROM share s
    INNER JOIN ancestors a ON s.id = a.parent
)
SELECT id
FROM ancestors
WHERE parent IS NULL
LIMIT 1;
