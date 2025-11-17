WITH RECURSIVE 

ancestors AS (
    SELECT id, alias, name, type, parent
    FROM shares
    WHERE id = $1

    UNION ALL

    SELECT s.id, s.alias, s.name, s.type, s.parent
    FROM shares s
    JOIN ancestors a ON a.parent = s.id
),

root AS (
    SELECT *
    FROM ancestors
    WHERE parent IS NULL
    LIMIT 1
),

descendants AS (
    SELECT id, alias, name, type, parent
    FROM root

    UNION ALL

    SELECT s.id, s.alias, s.name, s.type, s.parent
    FROM shares s
    JOIN descendants d ON s.parent = d.id
)

SELECT *
FROM descendants;
