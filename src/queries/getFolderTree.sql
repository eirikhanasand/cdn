SELECT *
FROM shares
WHERE alias = (
    SELECT alias
    FROM shares
    WHERE id = $1
);
