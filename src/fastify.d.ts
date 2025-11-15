
import 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        cachedIPMetrics: { status: number, data: Buffer }
        cachedUAMetrics: { status: number, data: Buffer }
        cachedTPS: { status: number, data: Buffer }
        cachedSummary: {
            status: number,
            data: {
                path: Buffer,
                ip: Buffer,
                user_agent: Buffer
            }
        }
    }
}
