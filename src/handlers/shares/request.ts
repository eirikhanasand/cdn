import config from '#constants'
import type { FastifyReply, FastifyRequest } from 'fastify'

type RequestPayload = {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: string
}

export default async function requestFromShareVm(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const payload = req.body as RequestPayload ?? {}

    if (!id) {
        return res.status(400).send({ error: 'Missing share id.' })
    }

    try {
        const response = await fetch(`${config.internal_api}/vm/${id}/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.vm_token}`
            },
            body: JSON.stringify(payload)
        })

        const text = await response.text()
        let data: unknown

        try {
            data = JSON.parse(text)
        } catch {
            data = { error: text || 'Invalid response from VM request handler.' }
        }

        return res.status(response.status).send(data)
    } catch (error) {
        return res.status(502).send({
            error: error instanceof Error ? error.message : String(error)
        })
    }
}
