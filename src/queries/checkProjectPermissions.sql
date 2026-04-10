SELECT
    id,
    $1::TEXT AS requester,
    NULL::TEXT AS alias,
    NULL::TEXT AS path,
    owner,
    '{}'::TEXT[] AS editors
FROM project_groups
WHERE id = $2;
