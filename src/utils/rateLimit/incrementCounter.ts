import type { CounterWindow } from './types.ts'

export default function incrementCounter(store: Map<string, CounterWindow>, key: string, windowMs: number) {
    const now = Date.now()
    const current = store.get(key)
    if (!current || current.resetAt <= now) {
        const next = { count: 1, resetAt: now + windowMs }
        store.set(key, next)
        return next
    }

    current.count += 1
    store.set(key, current)
    return current
}
