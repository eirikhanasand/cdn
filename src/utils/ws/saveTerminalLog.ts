import run from '#db'

const pendingUpdates = new Map<string, { contents: string[]; timer: NodeJS.Timeout }>()

export default function saveTerminalLog(id: string, content: string) {
    const existing = pendingUpdates.get(id)

    if (existing) {
        existing.contents.push(content)
        clearTimeout(existing.timer)
    }

    const contents = existing?.contents || [content]
    const timer = setTimeout(async () => {
        const entry = pendingUpdates.get(id)
        if (!entry) {
            return
        }

        try {
            await run(
                `INSERT INTO vms (project_id, vm_id, last_log, last_used)
                 VALUES ($1, $1, $2, NOW())
                 ON CONFLICT (project_id)
                 DO UPDATE SET
                    last_log = COALESCE(vms.last_log, '{}'::text[]) || EXCLUDED.last_log,
                    last_used = NOW()`,
                [id, entry.contents]
            )

            console.log(`Saved terminal log for ${id}`)
        } catch (error) {
            console.error(`Failed to save terminal log for ${id}: ${error}`)
        } finally {
            pendingUpdates.delete(id)
        }
    }, 1000)

    pendingUpdates.set(id, { contents, timer })
}
