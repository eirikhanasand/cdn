import run from '#db'

export default async function queryAlias(alias: string) {
    const selectQuery = `
        SELECT * FROM shares
        WHERE alias = $1
        ORDER BY parent NULLS FIRST, timestamp ASC
    `
    return run(selectQuery, [alias])
}
