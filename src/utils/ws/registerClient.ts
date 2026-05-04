import { WebSocket } from 'ws'
import { pendingUpdates, shareClients } from './shareState.ts'
import broadcastJoin from './broadcastJoin.ts'

export default function registerClient(id: string, socket: WebSocket, clients?: Map<string, Set<WebSocket>>) {
    const targetClients = clients || shareClients
    if (!targetClients.has(id)) {
        targetClients.set(id, new Set())
    }

    targetClients.get(id)!.add(socket)
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
    }))
}
