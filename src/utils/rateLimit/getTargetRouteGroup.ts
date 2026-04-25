import { TARGET_ROUTE_GROUPS } from './constants.ts'
import getPathname from './getPathname.ts'

export default function getTargetRouteGroup(url: string) {
    const path = getPathname(url)
    if (path === '/api/files/check') {
        return '/api/files/check'
    }

    for (const prefix of TARGET_ROUTE_GROUPS) {
        if (prefix !== '/api/files/check' && path.startsWith(prefix)) {
            return prefix
        }
    }

    return null
}
