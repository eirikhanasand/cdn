import { StorageError } from './fileStorage.ts'

const attempts = new Map<string, { count: number, reset: number }>()
let active = 0
export function beginUpload(owner: string, now = Date.now()) {
    for (const [key, value] of attempts) if (value.reset <= now) attempts.delete(key)
    const entry = attempts.get(owner) || { count: 0, reset: now + 3600000 }
    if (entry.count >= 60) throw new StorageError(429, 'Upload limit reached. Try again later.')
    if (active >= 4 || (!attempts.has(owner) && attempts.size >= 10000)) throw new StorageError(503, 'Uploads are busy. Try again shortly.')
    entry.count++
    attempts.set(owner, entry)
    active++
    let finished = false
    return () => { if (!finished) { active--; finished = true } }
}
