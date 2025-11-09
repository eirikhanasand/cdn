import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import getIndex from './handlers/index/get.ts'
import getFile from './handlers/files/get.ts'
import putFile from './handlers/files/put.ts'
import postFile from './handlers/files/post.ts'
import deleteFile from './handlers/files/delete.ts'
import getFileByPath from './handlers/files/getByPath.ts'
import getShare from './handlers/share/get.ts'
import putShare from './handlers/share/put.ts'
import postShare from './handlers/share/post.ts'
import checkPath from './handlers/files/checkPath.ts'
import getLink from './handlers/links/get.ts'
import putLink from './handlers/links/put.ts'
import postLink from './handlers/links/post.ts'
import getWords from './handlers/words/get.ts'
import getTree from './handlers/share/getTree.ts'
import getAlias from './handlers/share/getAlias.ts'
import getBlockList from './handlers/blocklist/get.ts'
import getBlockListForNginx from './handlers/blocklist/getBlockListForNginx.ts'
import getBlockListOverview from './handlers/blocklist/getBlocklistOverview.ts'
import getRequestMetrics from './handlers/requests/getRequestMetrics.ts'
import getRequestLogs from './handlers/requests/getLog.ts'
import postBlockList from './handlers/blocklist/post.ts'
import editBlockList from './handlers/blocklist/put.ts'
import deleteBlocklist from './handlers/blocklist/delete.ts'
import postRequest from './handlers/blocklist/postLog.ts'
import getIPMetrics from './handlers/blocklist/getIPMetrics.ts'
import getUAMetrics from './handlers/blocklist/getUAMetrics.ts'
import getDomainTPS from './handlers/blocklist/getDomainTPS.ts'

export default async function apiRoutes(fastify: FastifyInstance, _: FastifyPluginOptions) {
    // index
    fastify.get("/", getIndex)

    // files
    fastify.get("/files/:id", getFile)
    fastify.get("/files/check", checkPath)
    fastify.get("/files/path/:id", getFileByPath)
    fastify.put("/files/:id", putFile)
    fastify.post("/files", postFile)
    fastify.delete("/files/:id", deleteFile)

    // share
    fastify.get("/share/:id", getShare)
    fastify.get("/share/tree/:id", getTree)
    fastify.get("/share/alias/:alias", getAlias)
    fastify.put("/share/:id", putShare)
    fastify.post("/share/:id", postShare)

    // links
    fastify.get("/link/:id", getLink)
    fastify.put("/link/:id", putLink)
    fastify.post("/link/:id", postLink)

    // words
    fastify.get('/words', getWords)

    // blocklist
    fastify.get('/blocklist', getBlockList)
    fastify.get('/blocklist/overview', getBlockListOverview)
    fastify.get('/blocklist/nginx', getBlockListForNginx)
    fastify.post('/blocklist', postBlockList)
    fastify.put('/blocklist/:id', editBlockList)
    fastify.delete('/blocklist/:id', deleteBlocklist)

    // requests
    fastify.get('/traffic/domains', getDomainTPS)
    fastify.get('/traffic/ips', getIPMetrics)
    fastify.get('/traffic/uas', getUAMetrics)
    fastify.get('/traffic/recent', getRequestLogs)
    fastify.get('/traffic/summary', getRequestMetrics)
    fastify.post('/traffic', postRequest)
}
