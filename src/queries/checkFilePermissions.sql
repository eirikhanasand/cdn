SELECT
    id,
    alias,
    path,
    owner,
    editors,
    locked,
    CASE
        WHEN owner = $1 THEN 'owner'
        WHEN $1 = ANY(editors) THEN 'editor'
        ELSE 'none'
    END AS role,
    CASE
        WHEN NOT locked THEN TRUE
        WHEN locked AND (owner = $1 OR $1 = ANY(editors)) THEN TRUE
        ELSE FALSE
    END AS can_edit
FROM files
WHERE id = $2;
