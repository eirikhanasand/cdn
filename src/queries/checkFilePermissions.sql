SELECT
    id,
    path,
    NULL::TEXT AS alias,
    NULL::TEXT AS owner,
    '{}'::TEXT[] AS editors,
    FALSE AS locked,
    CASE
        WHEN $1::TEXT IS NOT NULL THEN 'owner'
        ELSE 'none'
    END AS role,
    TRUE AS can_edit
FROM files
WHERE id = $2;
