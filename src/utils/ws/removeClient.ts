import { WebSocket } from 'ws'
import { shareClients } from './handleShareMessage.ts'

export default function removeClient(id: string, socket: WebSocket, customClients?: Map<string, Set<WebSocket>>) {
    const clients = shareClients.get(id)
    if (!clients) {
        return
    }

    clients.delete(socket)
    if (clients.size === 0) {
        shareClients.delete(id)
    }

    if (customClients) {
        const clients = customClients.get(id)
        if (!clients) {
            return
        }

        clients.delete(socket)
        if (clients.size === 0) {
            customClients.delete(id)
        }
    }
}
