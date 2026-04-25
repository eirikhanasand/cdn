import type pg from 'pg'
import { withClient } from './withClient.ts'

type SQLParamType = (string | number | null | boolean | string[] | Date | Buffer)[]
type QueryResultRow = pg.QueryResultRow

export default async function run(query: string, params?: SQLParamType) {
    return withClient<pg.QueryResult<QueryResultRow>>(client => client.query(query, params ?? []))
}
