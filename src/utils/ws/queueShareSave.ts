import run from '#db'
import { pendingUpdates } from './shareState.ts'

export default function queueShareSave(id: string, content: string) {
    if (pendingUpdates.has(id)) {
        const entry = pendingUpdates.get(id)!
        entry.content = content
        clearTimeout(entry.timer)
    }

    const timer = setTimeout(async () => {
        const entry = pendingUpdates.get(id)
        if (!entry) {
            return
        }

        try {
            await run(
                'UPDATE shares SET content = $1, timestamp = NOW() WHERE id = $2',
                [entry.content, id],
            )
            console.log(`Saved share ${id} to DB`)
        } catch (error) {
            console.error(`Failed to save share ${id}: ${error}`)
        } finally {
            pendingUpdates.delete(id)
        }
    }, 1000)

    pendingUpdates.set(id, { content, timer })
}
