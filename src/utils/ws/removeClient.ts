import { WebSocket } from 'ws'
import { shareClients, sharePresence } from './shareState.ts'
import broadcastJoin from './broadcastJoin.ts'

export default function removeClient(id: string, socket: WebSocket, customClients?: Map<string, Set<WebSocket>>) {
    const clients = (customClients || shareClients).get(id)
    if (!clients) {
        return
    }

    clients.delete(socket)
    sharePresence.delete(socket)
    if (clients.size === 0) {
        ;(customClients || shareClients).delete(id)
        return
    }

    if (!customClients) {
        broadcastJoin(id)
    }
}
