import { missCounters, requestCounters } from './rateLimitStores.ts'

export default function cleanExpiredCounters() {
    const now = Date.now()

    for (const [key, value] of requestCounters.entries()) {
        if (value.resetAt <= now) {
            requestCounters.delete(key)
        }
    }

    for (const [key, value] of missCounters.entries()) {
        if (value.resetAt <= now) {
            missCounters.delete(key)
        }
    }
}
