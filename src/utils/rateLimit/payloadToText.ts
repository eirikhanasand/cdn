export default function payloadToText(payload: unknown) {
    if (typeof payload === 'string') {
        return payload
    }

    if (Buffer.isBuffer(payload)) {
        return payload.toString('utf-8')
    }

    if (payload && typeof payload === 'object' && 'toString' in payload) {
        return String(payload)
    }

    return ''
}
