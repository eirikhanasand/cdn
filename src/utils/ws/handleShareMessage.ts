import type { RawData } from 'ws'
import { WebSocket as WS } from 'ws'
import broadcastShareUpdate from './broadcastShareUpdate.ts'
import queueShareSave from './queueShareSave.ts'
import broadcastJoin from './broadcastJoin.ts'
import { shareClients, sharePresence } from './shareState.ts'
import { colorFor } from './registerClient.ts'

type ShareSocketMessage = {
    type?: string
    clientId?: string
    userId?: string
    displayName?: string
    content?: string
    line?: number
    column?: number
    selectionLength?: number
    editing?: boolean
}

export default async function handleShareMessage(
    id: string,
    socket: WS,
    rawMessage: RawData,
) {
    try {
        const msg = JSON.parse(rawMessage.toString()) as ShareSocketMessage
        if (msg.type === 'hello') {
            const clientId = typeof msg.clientId === 'string' && msg.clientId.trim()
                ? msg.clientId.trim().slice(0, 80)
                : `guest-${Math.random().toString(36).slice(2, 10)}`
            const userId = typeof msg.userId === 'string' && msg.userId.trim()
                ? msg.userId.trim().slice(0, 80)
                : 'guest'
            const displayName = typeof msg.displayName === 'string' && msg.displayName.trim()
                ? msg.displayName.trim().slice(0, 40)
                : userId

            ;(socket as WS & { clientId?: string }).clientId = clientId
            sharePresence.set(socket, {
                clientId,
                userId,
                displayName,
                color: colorFor(clientId),
                cursorLine: null,
                cursorColumn: null,
                selectionLength: 0,
                editing: false,
                updatedAt: new Date().toISOString(),
            })
            broadcastJoin(id)
            return
        }

        if (msg.type === 'cursor' || msg.type === 'editing') {
            updatePresence(socket, msg)
            broadcastPresence(id, socket)
            return
        }

        if (msg.type !== 'edit') {
            return
        }

        updatePresence(socket, { type: 'editing', editing: true })
        if (typeof msg.content !== 'string') {
            return
        }

        broadcastShareUpdate(id, socket, msg.content)
        acknowledgeShareEdit(id, socket, msg.content)
        queueShareSave(id, msg.content)
    } catch (error) {
        console.log(`Invalid WebSocket message: ${error}`)
    }
}

function updatePresence(socket: WS, msg: ShareSocketMessage) {
    const current = sharePresence.get(socket)
    if (!current) {
        return
    }

    sharePresence.set(socket, {
        ...current,
        cursorLine: typeof msg.line === 'number' ? msg.line : current.cursorLine,
        cursorColumn: typeof msg.column === 'number' ? msg.column : current.cursorColumn,
        selectionLength: typeof msg.selectionLength === 'number' ? msg.selectionLength : current.selectionLength,
        editing: typeof msg.editing === 'boolean' ? msg.editing : current.editing,
        updatedAt: new Date().toISOString(),
    })
}

function broadcastPresence(id: string, sender: WS) {
    const clients = shareClients.get(id)
    const presence = sharePresence.get(sender)
    if (!clients || !presence) {
        return
    }

    const payload = JSON.stringify({
        type: 'presence',
        user: presence,
        participants: clients.size,
        timestamp: new Date().toISOString(),
    })

    for (const client of clients) {
        if (client !== sender && client.readyState === WS.OPEN) {
            client.send(payload)
        }
    }
}

function acknowledgeShareEdit(id: string, socket: WS, content: string) {
    const clients = shareClients.get(id)
    if (!clients || socket.readyState !== WS.OPEN) {
        return
    }

    socket.send(JSON.stringify({
        type: 'ack',
        timestamp: new Date().toISOString(),
        participants: clients.size,
        content,
    }))
}
