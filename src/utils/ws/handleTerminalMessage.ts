import run from '#db'
import type { RawData } from 'ws'
import { WebSocket as WS } from 'ws'
import { shellClients } from './followShell.ts'

export const pendingUpdates = new Map<string, { content: string; timer: NodeJS.Timeout }>()

export default async function handleTerminalMessage(
    id: string,
    socket: WS,
    rawMessage: RawData,
) {
    try {
        const msg = JSON.parse(rawMessage.toString())
        if (msg.type !== 'terminalMessage') {
            return
        }

        broadcastUpdate(id, socket, msg.content)
        queueSave(id, msg.content)
    } catch (error) {
        console.error(`Invalid WebSocket message: ${error}`)
    }
}

function broadcastUpdate(id: string, sender: WS, content: string) {
    const clients = shellClients.get(id)
    if (!clients) {
        return
    }

    const payload = JSON.stringify({
        type: 'update',
        content,
        timestamp: new Date().toISOString(),
        participants: clients.size
    })

    for (const client of clients) {
        if (client !== sender && client.readyState === WS.OPEN) {
            client.send(payload)
        }
    }
}

function queueSave(id: string, content: string) {
    if (pendingUpdates.has(id)) {
        const entry = pendingUpdates.get(id)!
        entry.content = content
        clearTimeout(entry.timer)
    }

    const timer = setTimeout(async () => {
        const entry = pendingUpdates.get(id)
        if (!entry) return
        try {
            await run(
                `INSERT INTO vms (project_id, vm_id, last_log, last_used)
                 VALUES ($1, $1, $2, NOW())
                 ON CONFLICT (project_id)
                 DO UPDATE SET
                    last_log = COALESCE(vms.last_log, '{}'::text[]) || EXCLUDED.last_log,
                    last_used = NOW()`,
                [id, [entry.content]]
            )

            console.log(`Saved vm ${id} to DB`)
        } catch (error) {
            console.error(`Failed to save vm ${id}: ${error}`)
        } finally {
            pendingUpdates.delete(id)
        }
    }, 1000)

    pendingUpdates.set(id, { content, timer })
}
