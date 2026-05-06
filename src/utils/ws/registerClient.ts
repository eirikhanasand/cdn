import { WebSocket } from 'ws'
import { pendingUpdates, shareClients, sharePresence } from './shareState.ts'
import broadcastJoin from './broadcastJoin.ts'

export default function registerClient(id: string, socket: WebSocket, clients?: Map<string, Set<WebSocket>>) {
    const targetClients = clients || shareClients
    if (!targetClients.has(id)) {
        targetClients.set(id, new Set())
    }

    targetClients.get(id)!.add(socket)
    if (!clients) {
        sharePresence.set(socket, createAnonymousPresence())
    }
    broadcastJoin(id, targetClients)

    if (!clients) {
        sendPendingShareUpdate(id, socket, targetClients.get(id)!.size)
    }
}

function sendPendingShareUpdate(id: string, socket: WebSocket, participants: number) {
    const pending = pendingUpdates.get(id)
    if (!pending || socket.readyState !== WebSocket.OPEN) {
        return
    }

    socket.send(JSON.stringify({
        type: 'update',
        content: pending.content,
        timestamp: new Date().toISOString(),
        participants,
        clientId: 'server',
    }))
}

function createAnonymousPresence() {
    const clientId = `guest-${Math.random().toString(36).slice(2, 10)}`

    return {
        clientId,
        userId: 'guest',
        displayName: 'Guest',
        color: colorFor(clientId),
        cursorLine: null,
        cursorColumn: null,
        selectionLength: 0,
        editing: false,
        updatedAt: new Date().toISOString(),
    }
}

export function colorFor(value: string) {
    const palette = ['#f07d33', '#6ee7b7', '#93c5fd', '#f9a8d4', '#fde68a', '#c4b5fd', '#67e8f9', '#fca5a5']
    const hash = [...value].reduce((total, char) => total + char.charCodeAt(0), 0)
    return palette[hash % palette.length]
}
