WITH RECURSIVE folder_tree AS (
    SELECT
        id,
        alias,
        path,
        type,
        parent
    FROM shares
    WHERE id = $1

    UNION ALL

    SELECT s.id,
           s.alias,
           s.path,
           s.type,
           s.parent
    FROM shares s
    INNER JOIN folder_tree ft ON s.parent = ft.id
)
SELECT *
FROM folder_tree;
