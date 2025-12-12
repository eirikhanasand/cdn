import cors from '@fastify/cors'
import Fastify from 'fastify'
import routes from './routes.ts'
import getIndex from './handlers/index/get.ts'
import websocketPlugin from '@fastify/websocket'
import fastifyMultipart from '@fastify/multipart'
import ws from './plugins/ws.ts'
import fp from '#utils/refresh/fp.ts'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

fastify.decorate('install', (() => {
    const filePath = path.join(__dirname, 'static', 'install.sh')
    try {
        return Buffer.from(fs.readFileSync(filePath))
    } catch (err) {
        console.error('Failed to read install.sh:', err)
        return Buffer.from('')
    }
})())

fastify.decorate('cachedIPMetrics', { status: 200, data: Buffer.from(JSON.stringify([])) })
fastify.decorate('cachedUAMetrics', { status: 200, data: Buffer.from(JSON.stringify([])) })
fastify.decorate('cachedTPS', { status: 200, data: Buffer.from(JSON.stringify([])) })
fastify.decorate('cachedSummary', {
    status: 200, data: {
        path: Buffer.from(JSON.stringify([])),
        ip: Buffer.from(JSON.stringify([])),
        user_agent: Buffer.from(JSON.stringify([])),
    }
})

fastify.register(fp)
fastify.register(websocketPlugin)
fastify.register(ws, { prefix: "/api" })
fastify.register(routes, { prefix: "/api" })

fastify.get('/', getIndex)
fastify.get('/robots.txt', async (_, res) => {
    const disallowedPaths = [
        "/files",
        "/share",
        "/link",
        "/words",
        "/traffic",
        "/blocklist",
        "/files/*",
        "/share/*",
        "/link/*",
        "/words/*",
        "/traffic/*",
        "/blocklist/*",
        "/api/files",
        "/api/share",
        "/api/link",
        "/api/words",
        "/api/traffic",
        "/api/blocklist",
        "/api/files/*",
        "/api/share/*",
        "/api/link/*",
        "/api/words/*",
        "/api/blocklist/*",
        "/api/traffic/*",
    ]
    let content = "User-agent: *\n"
    disallowedPaths.forEach(path => {
        content += `Disallow: ${path}\n`
    })
    res.type('text/plain').send(content)
})

async function start() {
    try {
        await fastify.listen({ port, host: '0.0.0.0' })
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

start()
