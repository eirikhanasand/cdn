import run from '#db'
import crypto from 'crypto'

export default async function queryAlias(alias: string) {
    const selectQuery = `
        SELECT * FROM shares
        WHERE alias = $1
        LIMIT 1
    `
    const existing = await run(selectQuery, [alias])
    if (existing && existing.rowCount) {
        return existing.rows[0]
    }

    let created = null
    while (!created) {
        const id = crypto.randomBytes(6).toString('hex')
        const insertQuery = `
            INSERT INTO shares (id, content, name, alias)
            VALUES ($1, '', $2, $3)
            ON CONFLICT (id) DO NOTHING
            RETURNING *
        `
        const result = await run(insertQuery, [id, id, alias])
        if (result && result.rowCount) {
            created = result.rows[0]
        }
    }

    if (created) {
        return created
    }

    throw new Error('Could not generate unique id for new share')
}
