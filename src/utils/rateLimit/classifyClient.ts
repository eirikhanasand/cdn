import type { FastifyRequest } from 'fastify'
import type { ClientClass } from './types.ts'
import headerValue from './headerValue.ts'
import isFirstPartyHost from './isFirstPartyHost.ts'
import parseHost from './parseHost.ts'

export default function classifyClient(req: FastifyRequest): ClientClass {
    const authorization = headerValue(req.headers.authorization)
    const userId = headerValue(req.headers.id)
    const secFetchSite = headerValue(req.headers['sec-fetch-site'])
    const userAgent = headerValue(req.headers['user-agent']).toLowerCase()
    const originHost = parseHost(headerValue(req.headers.origin))
    const refererHost = parseHost(headerValue(req.headers.referer))
    const firstPartyHost = isFirstPartyHost(originHost) || isFirstPartyHost(refererHost)
    const browserLike = /mozilla|chrome|safari|firefox|edg/.test(userAgent)

    if (firstPartyHost && (browserLike || secFetchSite === 'same-origin' || secFetchSite === 'same-site')) {
        return 'first_party_browser'
    }

    if (authorization || userId) {
        return 'trusted_api'
    }

    return 'external'
}
