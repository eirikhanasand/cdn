WITH RECURSIVE folder_tree AS (
    SELECT
        id,
        alias,
        name,
        type,
        parent
    FROM shares
    WHERE id = $1::TEXT

    UNION ALL

    SELECT s.id,
           s.alias,
           s.name,
           s.type,
           s.parent
    FROM shares s
    INNER JOIN folder_tree ft ON s.parent = ft.id
)
SELECT *
FROM folder_tree;
