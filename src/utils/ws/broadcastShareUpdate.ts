import { WebSocket as WS } from 'ws'
import { shareClients } from './shareState.ts'

export default function broadcastShareUpdate(id: string, sender: WS, content: string) {
    const clients = shareClients.get(id)
    if (!clients) {
        return
    }

    const payload = JSON.stringify({
        type: 'update',
        content,
        timestamp: new Date().toISOString(),
        participants: clients.size,
        clientId: senderClientId(sender),
    })

    for (const client of clients) {
        if (client !== sender && client.readyState === WS.OPEN) {
            client.send(payload)
        }
    }
}

function senderClientId(sender: WS) {
    return (sender as WS & { clientId?: string }).clientId || null
}
