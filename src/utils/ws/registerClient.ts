import { WebSocket } from 'ws'
import { shareClients } from './handleShareMessage.ts'

export default function registerClient(id: string, socket: WebSocket, clients?: Map<string, Set<WebSocket>>) {
    if (!shareClients.has(id)) {
        shareClients.set(id, new Set())
    }

    if (clients) {
        if (!clients.has(id)) {
            clients.set(id, new Set())
        }

        clients.get(id)!.add(socket)
    }

    shareClients.get(id)!.add(socket)
    broadcastJoin(id)
}

function broadcastJoin(id: string, customClients?: Map<string, Set<WebSocket>>) {
    const clients = (customClients || shareClients).get(id)
    if (!clients) {
        return
    }

    const payload = JSON.stringify({
        type: 'join',
        timestamp: new Date().toISOString(),
        participants: clients.size
    })

    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload)
        }
    }
}
