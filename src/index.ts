import cors from '@fastify/cors'
import Fastify from 'fastify'
import routes from './routes.ts'
import getIndex from './handlers/index/get.ts'
import getRobotsTxt from './handlers/index/getRobotsTxt.ts'
import websocketPlugin from '@fastify/websocket'
import fastifyMultipart from '@fastify/multipart'
import ws from './plugins/ws.ts'
import fp from '#utils/refresh/fp.ts'
import ensureSchema from '#utils/schema.ts'
import registerPublicReadRateLimiter from '#utils/rateLimit/publicReadLimiter.ts'
import loadInstallScript from './install/loadInstallScript.ts'

const fastify = Fastify({
    logger: true
})

fastify.register(fastifyMultipart, {
    limits: {
        fileSize: 50 * 1024 * 1024
    }
})

fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
})

const port = Number(process.env.PORT) || 8081

fastify.decorate('install', loadInstallScript())

fastify.decorate('cachedIPMetrics', { status: 200, data: Buffer.from(JSON.stringify([])) })
fastify.decorate('cachedUAMetrics', { status: 200, data: Buffer.from(JSON.stringify([])) })
fastify.decorate('cachedTPS', { status: 200, data: Buffer.from(JSON.stringify([])) })
fastify.decorate('cachedSummary', {
    status: 200, data: {
        path: Buffer.from(JSON.stringify([])),
        ip: Buffer.from(JSON.stringify([])),
        user_agent: Buffer.from(JSON.stringify([])),
        domain: Buffer.from(JSON.stringify([])),
    }
})

fastify.register(websocketPlugin)
registerPublicReadRateLimiter(fastify)
fastify.register(ws, { prefix: '/api' })
fastify.register(routes, { prefix: '/api' })

fastify.get('/', getIndex)
fastify.get('/robots.txt', getRobotsTxt)

try {
    await ensureSchema()
    fastify.register(fp)
    await fastify.listen({ port, host: '0.0.0.0' })
} catch (error) {
    fastify.log.error(error)
    process.exit(1)
}
