import type { FastifyReply, FastifyRequest } from 'fastify'

const disallowedPaths = [
    '/files',
    '/share',
    '/link',
    '/words',
    '/traffic',
    '/blocklist',
    '/files/*',
    '/share/*',
    '/link/*',
    '/words/*',
    '/traffic/*',
    '/blocklist/*',
    '/api/files',
    '/api/share',
    '/api/link',
    '/api/words',
    '/api/traffic',
    '/api/blocklist',
    '/api/files/*',
    '/api/share/*',
    '/api/link/*',
    '/api/words/*',
    '/api/blocklist/*',
    '/api/traffic/*',
]

export default async function getRobotsTxt(_: FastifyRequest, res: FastifyReply) {
    const content = `User-agent: *\n${disallowedPaths.map(route => `Disallow: ${route}\n`).join('')}`
    res.type('text/plain').send(content)
}
