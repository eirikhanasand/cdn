import type { FastifyRequest, FastifyReply } from 'fastify'

const headers = new Set([
    'host', 'accept', 'accept-encoding', 'accept-language', 'cache-control', 'connection', 'content-length', 'user-agent', 'referer',
    'if-none-match', 'if-modified-since', 'pragma', 'priority', 'upgrade-insecure-requests', 'sec-ch-ua', 'sec-ch-ua-mobile',
    'sec-ch-ua-platform', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user', 'x-forwarded-for', 'x-forwarded-host',
    'x-forwarded-proto', 'x-real-ip', 'via', 'x-request-id', 'traceparent', 'tracestate', 'x-varnish',
])

export function accessLog(req: FastifyRequest, res: FastifyReply) {
    // Supply inspection evidence, not a local drop policy. Hanasand's editable
    // Analyze rule decides retention centrally; disabling it keeps these logs.
    const safeHeaders = Object.entries(req.headers).every(([name, value]) => headers.has(name.toLowerCase())
        && String(value || '').length <= 4096 && !/[<>\r\n]|\$\{|jndi:/i.test(String(value || '')))
    return { key: `http-cdn:${req.id}`, method: req.method, path: req.url.split('?')[0], status: res.statusCode,
        ip: req.ip, timestamp: new Date().toISOString(), inspection: {
            version: 1,
            bodyEmpty: req.body == null && !req.headers['transfer-encoding'] && Number(req.headers['content-length'] || 0) === 0,
            headersSafe: safeHeaders, pathSafe: !req.url.includes('?') && !/%|\.\.|[<>\\]/.test(req.url),
        } }
}
