import run from '#db'
import getWords from '#utils/getWords.ts'

export default async function queryShare(id: string) {
    const query = 'SELECT * FROM shares WHERE id = $1'
    const result = await run(query, [id])

    if (!result || result.rowCount === 0) {
        const alias = getWords()
        const query = `
            INSERT INTO shares (id, content, name, alias)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `
        const insertResult = await run(query, [id, "", id, alias[0]])
        if (insertResult) {
            const query = 'SELECT * FROM shares WHERE id = $1'
            const result = await run(query, [id])
            return result
        }
    }

    if (result.rowCount) {
        return result
    }

    return 404
}
