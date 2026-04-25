export type ClientClass = 'first_party_browser' | 'trusted_api' | 'external'

export type LimitProfile = {
    requestsPerMinute: number
    missesPerMinute: number
}

export type CounterWindow = {
    count: number
    resetAt: number
}

export type RequestLimitContext = {
    key: string
    routeGroup: string
    clientClass: ClientClass
    profile: LimitProfile
}
