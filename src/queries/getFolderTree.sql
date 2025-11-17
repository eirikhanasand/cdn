WITH RECURSIVE ancestors AS (
    SELECT *
    FROM shares
    WHERE id = $1

    UNION ALL

    SELECT s.*
    FROM shares s
    JOIN ancestors a ON a.id = a.parent
),
root AS (
    SELECT *
    FROM ancestors
    WHERE parent IS NULL
    LIMIT 1
),
descendants AS (
    SELECT
        s.id,
        s.parent,
        s.name,
        s.type,
        s.alias,
        jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'alias', s.alias,
            'type', s.type,
            'children', '[]'::jsonb
        ) AS node
    FROM shares s
    WHERE id = (SELECT id FROM root)

    UNION ALL

    SELECT
        c.id,
        c.parent,
        c.name,
        c.type,
        c.alias,
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'alias', c.alias,
            'type', c.type,
            'children', '[]'::jsonb
        )
    FROM shares c
    JOIN descendants d ON c.parent = d.id
),
aggregated AS (
    SELECT
        d1.id,
        d1.parent,
        d1.node || jsonb_build_object(
            'children',
            COALESCE(
                (SELECT jsonb_agg(d2.node) FROM aggregated d2 WHERE d2.parent = d1.id),
                '[]'::jsonb
            )
        ) AS node
    FROM descendants d1
)
SELECT node
FROM aggregated
WHERE parent IS NULL;
