import run from '#db'

export default async function queryLinks(id: string) {
    const updateQuery = `
        UPDATE links
        SET visits = visits + 1
        WHERE id = $1
        RETURNING *;
    `
    const updateResult = await run(updateQuery, [id])

    if (updateResult?.rowCount && updateResult.rowCount > 0) {
        return updateResult.rows[0]
    }

    return null
}
