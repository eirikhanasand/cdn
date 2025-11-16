import run from '#db'
import getWords from '#utils/getWords.ts'

export default async function queryShare(id: string, owner: string | null) {
    const alias = getWords()[0]

    const query = `
        INSERT INTO shares (id, content, name, alias, owner)
        VALUES ($1, '', $1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET id = shares.id
        RETURNING *
    `
    const result = await run(query, [id, alias, owner])

    if (result && result.rowCount) {
        return result
    }

    return 404
}
