export default function isFirstPartyHost(hostname: string) {
    return hostname === 'hanasand.com'
        || hostname === 'www.hanasand.com'
        || hostname.endsWith('.hanasand.com')
}
