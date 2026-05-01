SELECT
    id,
    path,
    NULL::TEXT AS alias,
    owner,
    '{}'::TEXT[] AS editors,
    FALSE AS locked,
    CASE
        WHEN owner = $1::TEXT THEN 'owner'
        WHEN owner IS NULL AND $1::TEXT IS NOT NULL THEN 'ownerless'
        ELSE 'none'
    END AS role,
    (owner = $1::TEXT OR owner IS NULL) AS can_edit
FROM files
WHERE id = $2;
