import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

/**
 * Install handler to install the server and set up select services
 * @param this The current Fastify instance
 * @param _request The Fastify request (unused)
 * @param res The Fastify response
 */

export default function getInstall(
    this: FastifyInstance,
    _request: FastifyRequest,
    res: FastifyReply
) {
    return res.header('Content-Type', 'text/x-sh').send(this.install)
}
