import { WebSocket } from 'ws'
import { shareClients } from './shareState.ts'

export default function broadcastJoin(id: string, customClients?: Map<string, Set<WebSocket>>) {
    const clients = (customClients || shareClients).get(id)
    if (!clients) {
        return
    }

    const payload = JSON.stringify({
        type: 'join',
        timestamp: new Date().toISOString(),
        participants: clients.size,
    })

    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload)
        }
    }
}
