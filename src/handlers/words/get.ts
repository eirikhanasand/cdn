import getWords from '#utils/getWords.ts'
import type { FastifyReply, FastifyRequest } from "fastify"

type Query = {
  categories?: string
  count?: string
  maxLength?: string
}

export default async function wordsHandler(req: FastifyRequest<{ Querystring: Query }>, res: FastifyReply) {
    const results = getWords()
    res.send({ words: results })
}
