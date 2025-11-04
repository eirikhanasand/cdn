import run from '#db'
import type { RawData } from 'ws'
import { WebSocket as WS } from 'ws'

export const shareClients = new Map<string, Set<WS>>()
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
    const clients = shareClients.get(id)
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
                `UPDATE vms SET last_log = last_log || $1, last_used = NOW() WHERE project_id = $2`,
                [[entry.content], id]
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
