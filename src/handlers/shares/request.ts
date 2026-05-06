import config from '#constants'
import type { FastifyReply, FastifyRequest } from 'fastify'

type RequestPayload = {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: string
    warnings?: string[]
}

const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

export default async function requestFromShareVm(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const payload = req.body as RequestPayload ?? {}

    if (!id) {
        return res.status(400).send({ error: 'Missing share id.' })
    }

    try {
        const normalizedHeaders = normalizeHeaders(payload.headers)
        const response = await fetch(`${config.internal_api}/vm/${id}/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.vm_token}`
            },
            body: JSON.stringify({
                ...payload,
                headers: normalizedHeaders.headers,
                warnings: [
                    ...(Array.isArray(payload.warnings) ? payload.warnings : []),
                    ...normalizedHeaders.warnings,
                ],
            })
        })

        const text = await response.text()
        let data: unknown

        try {
            data = JSON.parse(text)
        } catch {
            data = { error: text || 'Invalid response from VM request handler.' }
        }

        return res.status(response.status).send(mergeWarnings(data, normalizedHeaders.warnings))
    } catch (error) {
        return res.status(502).send({
            error: error instanceof Error ? error.message : String(error)
        })
    }
}

function normalizeHeaders(headers: RequestPayload['headers']) {
    const normalized: Record<string, string> = {}
    const warnings: string[] = []

    for (const [rawKey, rawValue] of Object.entries(headers || {})) {
        const key = rawKey.trim()
        const value = String(rawValue ?? '').trim()
        if (!key || !value) {
            continue
        }

        if (!HEADER_NAME_PATTERN.test(key)) {
            warnings.push(`Skipped invalid header name: ${key}`)
            continue
        }

        if (!isPortableHeaderValue(value)) {
            warnings.push(`Skipped invalid header value for ${key}.`)
            continue
        }

        normalized[key] = value
    }

    return { headers: normalized, warnings }
}

function isPortableHeaderValue(value: string) {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index)
        if (code === 9) {
            continue
        }
        if (code < 32 || code > 126 || code === 127) {
            return false
        }
    }

    return true
}

function mergeWarnings(data: unknown, warnings: string[]) {
    if (!warnings.length || !data || typeof data !== 'object' || Array.isArray(data)) {
        return data
    }

    const payload = data as Record<string, unknown>
    const existing = Array.isArray(payload.warnings) ? payload.warnings.filter((item): item is string => typeof item === 'string') : []
    return {
        ...payload,
        warnings: Array.from(new Set([...existing, ...warnings])),
    }
}
